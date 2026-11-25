/* ---------- estado ---------- */
const S = {
  meta: { contador: 0, modelo: APP.modelo },
  P: {},                            // chave -> parecer (inclui marcas de exclusão)
  pronto: false,
  vista: "pareceres", sel: null, passo: "doc", ex: null, filtro: "", editTexto: false, selPend: null,
  salvoEm: null,
  conc: { chave: null, B: null, res: null, erro: "" },
  ia: { estado: "", ctl: null }
};

const todos = () => Object.values(S.P).filter(p => !p.excluido);
const reais = () => todos().filter(p => !p.demo && p.status !== "substituido");
const finalizados = () => reais().filter(p => p.status === "finalizado");
const atual = () => { const p = S.P[S.sel]; return p && !p.excluido ? p : null; };
const editavel = p => !!p && p.status === "rascunho";
const ordenados = p => [...p.excertos].sort((a, b) => a.inicio - b.inicio || a.fim - b.fim);
const numeroDe = (p, e) => ordenados(p).indexOf(e) + 1;
const maiorNumero = () => Object.values(S.P).reduce((m, p) => { const x = /^REG-(\d+)$/.exec(p.id_registro || ""); return x ? Math.max(m, +x[1]) : m; }, 0);

const codigoDe = p => String((p && p.identificacao && p.identificacao.codigo_parecer) || "").toUpperCase();
/* A identidade de um registro é o seu selo. Um registro renumerado guarda também o selo de origem. */
const selosDe = o => o ? [o.integridade && o.integridade.resumo, o.origem && o.origem.integridade].filter(Boolean) : [];
const mesmoRegistro = (a, b) => { const s = selosDe(b); return selosDe(a).some(x => s.includes(x)); };
/* Outro parecer ativo com o mesmo código (a versão que este substitui não conta) */
const outroAtivoComCodigo = p => todos().find(x => x.key !== p.key && !x.demo === !p.demo && x.status !== "substituido" && codigoDe(x) === codigoDe(p) && !(p.substitui && x.id_registro === p.substitui));

function novoParecer(codigo, demo = false) {
  return {
    key: uid(), modelo: APP.modelo, status: "rascunho", demo, versao: 1, id_registro: null, substitui: null,
    identificacao: { codigo_parecer: codigo, tipo_instituicao: "", semestre: "", idade: "", imigracao: "", anonimizado: false },
    texto_parecer: "", excertos: [],
    fechamento: { excerto_representativo: "", sintese_uma_frase: "", observacoes_gerais: "", observacoes_ausencia: "" },
    criado_em: agora(), atualizado_em: agora(), finalizado_em: null
  };
}
function novoExcerto(inicio, fim, texto) {
  return {
    k: uid(), inicio, fim, excerto_literal: texto, ancora_ok: true, dimensao_dominante: "", dimensao_secundaria: "",
    direitos: [], campos: [], categorias_matriz: [], marcas: [], esp_nivel: NM, blg_nivel: NM, acu_nivel: NM, duvida: false, observacoes: ""
  };
}
function codigoEmUso(cod, excetoChave) {
  const c = String(cod).trim().toUpperCase();
  return todos().find(p => p.key !== excetoChave && p.status !== "substituido" && p.identificacao.codigo_parecer.toUpperCase() === c);
}

/* ---------- a lei do lastro ----------
   Nível do registro = número de âncoras de observação (M1 a M4) presentes no excerto.
   0 = Ausencia (sem lastro) · 1 = Traco · 2 ou mais = Lastro.
   MC (menção com situação) = pelo menos uma âncora; MS = nenhuma. O rótulo (M5) não altera o nível. */
const nAncoras = e => ANC.reduce((a, m) => a + (e.marcas.includes(m) ? 1 : 0), 0);
const nivelPorN = n => n === 0 ? "Ausencia" : n === 1 ? "Traco" : "Lastro";
const nivelDo = e => nivelPorN(nAncoras(e));
const mcmsDo = e => nAncoras(e) ? "MC" : "MS";
const temRotulo = e => e.marcas.includes(ROTULO.c);

/* Palavras indicadoras encontradas no excerto: [{m, i, f}] */
function indicadoresNo(texto) {
  const achados = [];
  for (const [m, re] of Object.entries(INDICADORES)) {
    re.lastIndex = 0; let x;
    while ((x = re.exec(texto))) {
      const i = x.index + x[1].length; achados.push({ m, i, f: i + x[2].length });
      if (re.lastIndex === x.index) re.lastIndex++;
    }
  }
  return achados.sort((a, b) => a.i - b.i || b.f - a.f);
}
const marcasSugeridas = e => [...new Set(indicadoresNo(e.excerto_literal).map(a => a.m))].filter(m => !e.marcas.includes(m));

/* Conferência de um excerto: [tipo, mensagem]; tipo e = pendência que impede finalizar, w = alerta, i = nota */
function alertasDe(p, e) {
  const A = [];
  if (!e.ancora_ok) A.push(["e", "Trecho não localizado no texto do parecer, que foi alterado. Selecione o trecho de novo e use Ajustar o excerto aberto, ou exclua o excerto."]);
  if (!e.dimensao_dominante) A.push(["e", "Falta a dimensão dominante."]);
  if (/n[aã]o fala nada/i.test(e.excerto_literal) && !(e.dimensao_dominante === "DML" && e.blg_nivel === EMERG[1].niveis[0].v))
    A.push(["w", "“Não fala nada”: o livro pede dimensão linguística (DML) e barreira linguística como registro deficitário."]);
  if (e.duvida && !e.observacoes.trim()) A.push(["w", "Marcado como dúvida sem explicação nas notas."]);
  if (e.direitos.includes("DExp") && e.direitos.includes("DExpr")) A.push(["i", "Explorar (DExp) e Expressar (DExpr) marcados juntos: confira se são os dois."]);
  const n = palavras(e.excerto_literal);
  if (n > LIMITE_PALAVRAS_EXCERTO) A.push(["i", `Excerto com ${n} palavras: veja se dá para recortar só o fragmento que sustenta o código.`]);
  return A;
}
const pendenciasDe = p => p.excertos.reduce((a, e) => a + alertasDe(p, e).filter(x => x[0] === "e").length, 0);

/* Tudo o que se calcula de um parecer. Nada aqui é digitado. */
function resumoDoParecer(p) {
  const ex = p.excertos, tot = ex.length;
  const niv = { Ausencia: 0, Traco: 0, Lastro: 0 }, anc = { M1: 0, M2: 0, M3: 0, M4: 0 };
  let rot = 0, duv = 0, palEx = 0;
  const porDim = {}; DIMS.forEach(d => { porDim[d.c] = { total: 0, Ausencia: 0, Traco: 0, Lastro: 0 }; });
  const tem = { dimensao: new Set(), direito: new Set(), campo: new Set(), matriz: new Set() };
  const em = {}; EMERG.forEach(g => { em[g.c] = { n2: 0, n3: 0 }; });
  for (const e of ex) {
    const nv = nivelDo(e); niv[nv]++;
    ANC.forEach(m => { if (e.marcas.includes(m)) anc[m]++; });
    if (temRotulo(e)) rot++;
    if (e.duvida) duv++;
    palEx += palavras(e.excerto_literal);
    if (porDim[e.dimensao_dominante]) { tem.dimensao.add(e.dimensao_dominante); porDim[e.dimensao_dominante].total++; porDim[e.dimensao_dominante][nv]++; }
    e.direitos.forEach(c => tem.direito.add(c)); e.campos.forEach(c => tem.campo.add(c)); e.categorias_matriz.forEach(c => tem.matriz.add(c));
    EMERG.forEach(g => { if (e[g.f] === g.niveis[0].v) em[g.c].n2++; else if (e[g.f] === g.niveis[1].v) em[g.c].n3++; });
  }
  let pred = "";
  if (tot) { pred = "Equilibrio"; for (const n of NIVEIS) if (niv[n] / tot > 0.5) pred = n + " predominante"; }
  const emNivel = {};
  EMERG.forEach(g => { const { n2, n3 } = em[g.c]; emNivel[g.f] = n2 && n3 ? (g.misto || g.niveis[1].v) : n3 ? g.niveis[1].v : n2 ? g.niveis[0].v : NM; });
  const totPal = palavras(p.texto_parecer);
  return {
    tot, niv, pred, anc, rot, duv, porDim, tem, em, emNivel, totPal,
    cobertura: totPal ? Math.min(1, palEx / totPal) : 0,
    aus: {
      dimensao: DIMS.map(d => d.c).filter(c => !tem.dimensao.has(c)),
      direito: DIREITOS.map(d => d.c).filter(c => !tem.direito.has(c)),
      campo: CAMPOS.map(d => d.c).filter(c => !tem.campo.has(c)),
      matriz: MATRIZ.map(d => d.c).filter(c => !tem.matriz.has(c))
    }
  };
}

/* O que precisa estar pronto para finalizar */
function conferencia(p) {
  const id = p.identificacao, f = p.fechamento, pend = pendenciasDe(p);
  return [
    { t: "Identificação completa", ok: IDENT.every(g => id[g.f]), passo: "doc" },
    { t: "Texto do parecer colado", ok: palavras(p.texto_parecer) > 0, passo: "doc" },
    { t: "Texto anonimizado confirmado", ok: !!id.anonimizado, passo: "doc" },
    { t: "Pelo menos um excerto codificado", ok: p.excertos.length > 0, passo: "cod" },
    { t: pend ? `Excertos sem pendências (${pl(pend, "pendência", "pendências")} agora)` : "Excertos sem pendências", ok: pend === 0, passo: "cod" },
    { t: "Excerto representativo escolhido", ok: p.excertos.some(e => e.k === f.excerto_representativo), passo: "fec" },
    { t: "Síntese em uma frase", ok: !!f.sintese_uma_frase.trim(), passo: "fec" }
  ];
}
const passoPronto = (p, passo) => conferencia(p).filter(c => c.passo === passo).every(c => c.ok);

/* ---------- registro (o JSON de um parecer) ---------- */
function registroDe(p) {
  const ex = ordenados(p), r = resumoDoParecer(p), id = p.identificacao, f = p.fechamento, cod = id.codigo_parecer;
  const idEx = i => `${cod}-E${zeros(i + 1)}`;
  const iRep = ex.findIndex(e => e.k === f.excerto_representativo);
  const emCont = {}; EMERG.forEach(g => { emCont[g.c] = { nivel_2: r.em[g.c].n2, nivel_3: r.em[g.c].n3 }; });
  return {
    schema: APP.schema,
    instrumento: {
      nome: APP.nome, versao: APP.versao, livro_de_codigos: APP.livro,
      regra_nivel_registro: "Âncoras M1 a M4 presentes no excerto: 0 = Ausencia (sem lastro), 1 = Traco, 2 ou mais = Lastro. MC = pelo menos uma âncora; MS = nenhuma. M5 (rótulo) não altera o nível.",
      regra_nivel_predominante: "Nível presente em mais da metade dos excertos; se nenhum passa da metade, Equilibrio.",
      regra_emergentes_parecer: "Nível do parecer = o que foi marcado nos excertos; ESP fica com o nível mais alto; BLG e ACU com níveis 2 e 3 no mesmo parecer ficam como registro misto."
    },
    id_registro: p.id_registro, versao: p.versao, substitui: p.substitui || null, status: p.status, exemplo: !!p.demo,
    criado_em: p.criado_em, finalizado_em: p.finalizado_em,
    parecer: {
      codigo_parecer: cod, tipo_instituicao: id.tipo_instituicao, semestre: id.semestre, idade: id.idade ? +id.idade : null, imigracao: id.imigracao,
      extensao_palavras: r.totPal, texto_anonimizado_confirmado: !!id.anonimizado, n_excertos: r.tot, cobertura_do_texto: +r.cobertura.toFixed(3),
      nivel_registro_predominante: r.pred,
      excerto_representativo: iRep >= 0 ? ex[iRep].excerto_literal : "", excerto_representativo_id: iRep >= 0 ? idEx(iRep) : "",
      sintese_uma_frase: f.sintese_uma_frase, observacoes_gerais: f.observacoes_gerais
    },
    excertos: ex.map((e, i) => ({
      id_excerto: idEx(i), codigo_parecer: cod, localizacao: `${i + 1}o excerto`, posicao: { inicio: e.inicio, fim: e.fim },
      excerto_literal: e.excerto_literal,
      dimensao_dominante: e.dimensao_dominante, dimensao_nivel: mcmsDo(e), dimensao_secundaria: e.dimensao_secundaria || null,
      marcas_presentes: MARCAS_VALIDAS.filter(m => e.marcas.includes(m)), n_ancoras: nAncoras(e), nivel_registro: nivelDo(e),
      direitos: DIREITOS.map(d => d.c).filter(c => e.direitos.includes(c)),
      campos: CAMPOS.map(d => d.c).filter(c => e.campos.includes(c)),
      categorias_matriz: MATRIZ.map(d => d.c).filter(c => e.categorias_matriz.includes(c)),
      esp_nivel: e.esp_nivel, blg_nivel: e.blg_nivel, acu_nivel: e.acu_nivel,
      duvida: !!e.duvida, observacoes: e.observacoes
    })),
    ausencias: {
      dimensao_ausente: r.aus.dimensao, direito_ausente: r.aus.direito, campo_ausente: r.aus.campo, categoria_matriz_ausente: r.aus.matriz,
      esp_nivel: r.emNivel.esp_nivel, blg_nivel: r.emNivel.blg_nivel, acu_nivel: r.emNivel.acu_nivel,
      observacoes_ausencia: f.observacoes_ausencia
    },
    contagens: {
      nivel_registro: { ...r.niv }, por_dimensao: copia(r.porDim), ancoras: { ...r.anc }, rotulo_M5: r.rot, emergentes: emCont, duvidas: r.duv
    },
    texto_parecer: p.texto_parecer
  };
}
/* Sela o registro com um resumo criptográfico do próprio conteúdo */
async function selar(o) {
  const { integridade, ...resto } = o;
  return { ...resto, integridade: { sobre: "texto JSON compacto do registro, sem o campo integridade", resumo: await resumoDe(JSON.stringify(resto)) } };
}
/* true = íntegro · false = alterado depois de gerado · null = não foi possível verificar */
async function integro(o) {
  if (!o || !o.integridade || typeof o.integridade.resumo !== "string") return false;
  const { integridade, ...resto } = o, texto = JSON.stringify(resto);
  if (integridade.resumo.startsWith("crc32:")) return ("crc32:" + crc32(new TextEncoder().encode(texto)).toString(16).padStart(8, "0")) === integridade.resumo;
  const r = await resumoDe(texto);
  return r.startsWith("sha256:") ? r === integridade.resumo : null;
}
/* Sela de novo um registro cujo número, ou a referência à versão anterior, mudou.
   O bloco origem guarda como ele foi selado da primeira vez: número, referência e selo. */
async function reRegistrar(p, id, substitui) {
  if (p.registro) {
    const { integridade, ...o } = copia(p.registro);
    if (!o.origem) o.origem = { id_registro: o.id_registro, substitui: o.substitui || null, integridade: (integridade && integridade.resumo) || null };
    o.id_registro = id; o.substitui = substitui || null;
    p.registro = await selar(o); p.json_baixado = false;
  }
  p.id_registro = id; p.substitui = substitui || null; p.atualizado_em = depoisDe(p.atualizado_em);
}
/* Lei do número único. Se dois registros diferentes têm o mesmo número (dados reunidos de dois navegadores ou aparelhos),
   fica com ele o que já estava aqui ou, entre aparelhos, o finalizado primeiro. O outro recebe o próximo número livre. */
async function renumerarRepetidos(chegam = []) {
  const grupos = {}, ordem = (a, b) => String(a.finalizado_em || "").localeCompare(String(b.finalizado_em || "")) || a.key.localeCompare(b.key);
  for (const p of todos()) if (!p.demo && p.registro && /^REG-\d+$/.test(p.id_registro || "")) (grupos[p.id_registro] = grupos[p.id_registro] || []).push(p);
  const fila = [];
  for (const g of Object.values(grupos)) if (g.length > 1) { g.sort((a, b) => (chegam.includes(a) - chegam.includes(b)) || ordem(a, b)); fila.push(...g.slice(1)); }
  const trocas = [], mexidos = new Set();
  if (!fila.length) return { trocas, mexidos: [] };
  fila.sort(ordem);
  let n = Math.max(S.meta.contador || 0, maiorNumero());
  for (const p of fila) {
    const de = p.id_registro, para = "REG-" + zeros(++n, 4), cod = codigoDe(p);
    await reRegistrar(p, para, p.substitui); mexidos.add(p); trocas.push({ de, para, codigo: cod });
    for (const s of todos()) {
      if (s === p || s.demo || codigoDe(s) !== cod) continue;
      if (s.substitui === de) { await reRegistrar(s, s.id_registro, para); mexidos.add(s); }
      if (s.substituido_por === de) { s.substituido_por = para; s.atualizado_em = depoisDe(s.atualizado_em); mexidos.add(s); }
    }
  }
  S.meta.contador = n;
  return { trocas, mexidos: [...mexidos] };
}
/* Um código, um parecer ativo. Se dois aparelhos finalizaram o mesmo código sem se ver,
   vale o finalizado por último; o outro vai para o histórico. */
function umAtivoPorCodigo() {
  const por = {}, mexidos = [];
  for (const p of todos()) if (!p.demo && p.status === "finalizado") (por[codigoDe(p)] = por[codigoDe(p)] || []).push(p);
  for (const g of Object.values(por)) {
    if (g.length < 2) continue;
    g.sort((a, b) => String(b.finalizado_em || "").localeCompare(String(a.finalizado_em || "")) || b.key.localeCompare(a.key));
    for (const p of g.slice(1)) { p.status = "substituido"; p.substituido_por = g[0].id_registro; p.atualizado_em = depoisDe(p.atualizado_em); mexidos.push({ codigo: codigoDe(p), vale: g[0].id_registro, historico: p.id_registro }); }
  }
  return mexidos;
}
/* Reconstrói os campos de trabalho a partir de um registro */
function desmontar(o) {
  const pa = o.parecer || {};
  return {
    identificacao: { codigo_parecer: pa.codigo_parecer || "", tipo_instituicao: pa.tipo_instituicao || "", semestre: pa.semestre || "", idade: pa.idade ? String(pa.idade) : "", imigracao: pa.imigracao || "", anonimizado: !!pa.texto_anonimizado_confirmado },
    texto_parecer: o.texto_parecer || "",
    excertos: (o.excertos || []).map(e => ({
      k: e.id_excerto, inicio: e.posicao ? e.posicao.inicio : 0, fim: e.posicao ? e.posicao.fim : 0, excerto_literal: e.excerto_literal || "", ancora_ok: true,
      dimensao_dominante: e.dimensao_dominante || "", dimensao_secundaria: e.dimensao_secundaria || "",
      direitos: [...(e.direitos || [])], campos: [...(e.campos || [])], categorias_matriz: [...(e.categorias_matriz || [])],
      marcas: (e.marcas_presentes || []).filter(m => MARCAS_VALIDAS.includes(m)),
      esp_nivel: e.esp_nivel || NM, blg_nivel: e.blg_nivel || NM, acu_nivel: e.acu_nivel || NM, duvida: !!e.duvida, observacoes: e.observacoes || ""
    })),
    fechamento: { excerto_representativo: pa.excerto_representativo_id || "", sintese_uma_frase: pa.sintese_uma_frase || "", observacoes_gerais: pa.observacoes_gerais || "", observacoes_ausencia: (o.ausencias || {}).observacoes_ausencia || "" }
  };
}
/* Forma guardada: o parecer finalizado guarda só o registro selado; os campos de trabalho são refeitos ao abrir */
function paraGuardar(p) {
  if (p.excluido) return { key: p.key, excluido: true, demo: !!p.demo, atualizado_em: p.atualizado_em };
  if (p.registro) { const { identificacao, texto_parecer, excertos, fechamento, ...resto } = p; return copia(resto); }
  return copia(p);
}
function aoAbrir(o) {
  if (o && o.registro && !Array.isArray(o.excertos)) Object.assign(o, desmontar(o.registro));
  return o;
}
const nomeDoArquivo = p => `${p.id_registro || "RASCUNHO"}_${p.identificacao.codigo_parecer}_v${p.versao}.json`;

/* ---------- finalizar, corrigir, excluir ---------- */
async function finalizar(p) {
  const cod = p.identificacao.codigo_parecer, mapa = {};
  ordenados(p).forEach((e, i) => { mapa[e.k] = `${cod}-E${zeros(i + 1)}`; });
  if (p.demo) p.id_registro = "EXEMPLO";
  else { const n = await store.proximoNumero(); S.meta.contador = n; p.id_registro = "REG-" + zeros(n, 4); await store.gravarMeta(); }
  p.status = "finalizado"; p.finalizado_em = agora();
  p.fechamento.excerto_representativo = mapa[p.fechamento.excerto_representativo] || "";
  if (p.segunda_leitura && p.segunda_leitura.excertos) {
    const novo = {}; for (const [k, v] of Object.entries(p.segunda_leitura.excertos)) if (mapa[k]) novo[mapa[k]] = v;
    p.segunda_leitura.excertos = novo;
  }
  if (S.ex && mapa[S.ex]) S.ex = mapa[S.ex];
  p.excertos.forEach(e => { e.k = mapa[e.k]; });
  p.registro = await selar(registroDe(p));
  if (p.substitui) {
    const ant = todos().find(x => x.id_registro === p.substitui && x.key !== p.key && codigoDe(x) === codigoDe(p));
    if (ant) { ant.status = "substituido"; ant.substituido_por = p.id_registro; await store.gravarJa(ant); }
  }
  await store.gravarJa(p);
}
function novaVersao(p) {
  const n = novoParecer(p.identificacao.codigo_parecer, !!p.demo), mapa = {};
  n.versao = (p.versao || 1) + 1; n.substitui = p.id_registro;
  n.identificacao = copia(p.identificacao); n.texto_parecer = p.texto_parecer;
  n.excertos = p.excertos.map(e => { const c = copia(e); c.k = uid(); mapa[e.k] = c.k; return c; });
  n.fechamento = copia(p.fechamento); n.fechamento.excerto_representativo = mapa[p.fechamento.excerto_representativo] || "";
  S.P[n.key] = n; store.guardar(n);
  return n;
}
async function excluir(p) {
  S.P[p.key] = { key: p.key, excluido: true, demo: !!p.demo, atualizado_em: depoisDe(p.atualizado_em) };
  await store.gravarJa(S.P[p.key]);
}
/* Depois de editar o texto, relocaliza cada excerto pelo seu conteúdo literal */
function relocalizar(p) {
  const t = p.texto_parecer, usados = [];
  for (const e of ordenados(p)) {
    let melhor = -1;
    if (t.slice(e.inicio, e.fim) === e.excerto_literal) melhor = e.inicio;
    else {
      let i = t.indexOf(e.excerto_literal);
      while (i !== -1) { if (melhor === -1 || Math.abs(i - e.inicio) < Math.abs(melhor - e.inicio)) melhor = i; i = t.indexOf(e.excerto_literal, i + 1); }
    }
    const f = melhor + e.excerto_literal.length;
    if (melhor >= 0 && !usados.some(u => melhor < u[1] && f > u[0])) { e.inicio = melhor; e.fim = f; e.ancora_ok = true; usados.push([melhor, f]); }
    else e.ancora_ok = false;
  }
}
