/* ---------- concordância entre codificações ----------
   Operacionaliza a regra da objetividade: duas pessoas codificando o mesmo trecho devem chegar ao mesmo resultado.
   Medidas: concordância observada e kappa de Cohen (1960); leitura das faixas segundo Landis e Koch (1977). */

const paraComparar = e => ({
  inicio: e.inicio, fim: e.fim, texto: e.excerto_literal || "", dim: e.dimensao_dominante || "",
  marcas: [...(e.marcas || e.marcas_presentes || [])].filter(m => MARCAS_VALIDAS.includes(m)),
  direitos: e.direitos || [], campos: e.campos || [], matriz: e.categorias_matriz || [],
  esp: e.esp_nivel || NM, blg: e.blg_nivel || NM, acu: e.acu_nivel || NM, motivo: e.motivo || ""
});
const nivelCmp = x => nivelPorN(ANC.filter(m => x.marcas.includes(m)).length);

/* Pareia trechos das duas codificações pela sobreposição no texto (pelo menos metade do trecho menor) */
function parear(A, B) {
  const cand = [];
  A.forEach((a, i) => B.forEach((b, j) => {
    const sob = Math.min(a.fim, b.fim) - Math.max(a.inicio, b.inicio);
    if (sob > 0 && sob / Math.max(1, Math.min(a.fim - a.inicio, b.fim - b.inicio)) >= 0.5) cand.push({ i, j, sob });
  }));
  cand.sort((x, y) => y.sob - x.sob || x.i - y.i || x.j - y.j);
  const usA = new Set(), usB = new Set(), pares = [];
  for (const c of cand) { if (usA.has(c.i) || usB.has(c.j)) continue; usA.add(c.i); usB.add(c.j); pares.push([A[c.i], B[c.j]]); }
  pares.sort((x, y) => x[0].inicio - y[0].inicio);
  return { pares, soA: A.filter((_, i) => !usA.has(i)), soB: B.filter((_, j) => !usB.has(j)) };
}

/* Kappa de Cohen: k = (po - pe) / (1 - pe). k = null quando não há variação (pe = 1) ou não há pares. */
function kappa(pares, fa, fb = fa) {
  const n = pares.length; if (!n) return { n: 0, iguais: 0, po: null, k: null };
  const ca = {}, cb = {}; let iguais = 0;
  for (const [a, b] of pares) { const x = String(fa(a)), y = String(fb(b)); if (x === y) iguais++; ca[x] = (ca[x] || 0) + 1; cb[y] = (cb[y] || 0) + 1; }
  const po = iguais / n; let pe = 0;
  for (const c of new Set([...Object.keys(ca), ...Object.keys(cb)])) pe += ((ca[c] || 0) / n) * ((cb[c] || 0) / n);
  return { n, iguais, po, k: 1 - pe < 1e-12 ? null : (po - pe) / (1 - pe) };
}
const faixaKappa = k => k === null ? "sem variação" : k < 0 ? "pobre" : k <= 0.20 ? "leve" : k <= 0.40 ? "razoável" : k <= 0.60 ? "moderada" : k <= 0.80 ? "substancial" : "quase perfeita";

/* Compara a codificação de um parecer (A) com uma segunda codificação (B = {origem, texto, excertos}) */
function comparar(p, B) {
  const A = ordenados(p).filter(e => e.ancora_ok).map(paraComparar);
  let exB = (B.excertos || []).map(paraComparar), fora = 0;
  if ((B.texto || "") !== p.texto_parecer) {            // textos diferentes: relocaliza cada trecho de B no texto de A
    const usados = [];
    exB = exB.filter(b => {
      let i = b.texto ? p.texto_parecer.indexOf(b.texto) : -1;
      while (i !== -1) {
        const f = i + b.texto.length;
        if (!usados.some(u => i < u[1] && f > u[0])) { b.inicio = i; b.fim = f; usados.push([i, f]); return true; }
        i = p.texto_parecer.indexOf(b.texto, i + 1);
      }
      fora++; return false;
    });
  }
  const { pares, soA, soB } = parear(A, exB);
  const linha = (cod, rot, f) => ({ cod, rot, ...kappa(pares, f) });
  const tem = (campo, c) => x => x[campo].includes(c) ? 1 : 0;
  return {
    origem: B.origem || "Segunda codificação", nA: A.length, nB: exB.length + fora, pares: pares.length, soA, soB, fora,
    principais: [
      linha("", "Dimensão dominante", x => x.dim), linha("", "Nível do registro", nivelCmp),
      ...ANCORAS.map(a => linha(a.c, a.nome, tem("marcas", a.c))), linha(ROTULO.c, ROTULO.nome, tem("marcas", ROTULO.c))
    ],
    referenciais: [
      ...DIREITOS.map(d => linha(d.c, d.n, tem("direitos", d.c))), ...CAMPOS.map(d => linha(d.c, d.n, tem("campos", d.c))), ...MATRIZ.map(d => linha(d.c, d.n, tem("matriz", d.c)))
    ],
    sinais: EMERG.map(g => linha(g.c, g.n, x => x[g.c.toLowerCase()])),
    divergencias: pares.filter(([a, b]) => a.dim !== b.dim || MARCAS_VALIDAS.some(m => a.marcas.includes(m) !== b.marcas.includes(m)) || a.esp !== b.esp || a.blg !== b.blg || a.acu !== b.acu)
  };
}

/* Segunda codificação a partir de um arquivo JSON do mesmo parecer */
async function segundaDeArquivo(p, arquivo) {
  let o; try { o = JSON.parse(await arquivo.text()); } catch (e) { throw new Error("O arquivo não é um JSON válido."); }
  if (!o || o.schema !== APP.schema || !o.parecer || !Array.isArray(o.excertos)) throw new Error("O arquivo não é um registro de parecer deste instrumento.");
  if (String(o.parecer.codigo_parecer).toUpperCase() !== p.identificacao.codigo_parecer.toUpperCase()) throw new Error(`O arquivo é do parecer ${o.parecer.codigo_parecer}, e não do ${p.identificacao.codigo_parecer}.`);
  const ok = await integro(o);
  return {
    origem: `Arquivo ${arquivo.name}${o.id_registro ? ` (${o.id_registro})` : ""}${ok === false ? ", alterado depois de gerado" : ""}`, texto: o.texto_parecer || "",
    excertos: o.excertos.map(e => ({ ...e, inicio: e.posicao ? e.posicao.inicio : 0, fim: e.posicao ? e.posicao.fim : 0 }))
  };
}

/* Segunda codificação SIMULADA do parecer de exemplo, só para demonstrar a medida */
const DIVERGENCIAS_EXEMPLO = [
  { achar: "Tem uma boa relação", tira: ["M5"] },
  { achar: "Costuma perguntar", tira: ["M4"] },
  { achar: "Nas atividades em pequenos grupos", poe: ["M2"] },
  { achar: "Demonstra carinho", tira: ["M4"] },
  { achar: "Já reconhece todas as letras", dim: "DMC", tira: ["M1"] },
  { achar: "A criança é filha de família venezuelana", blg: NM },
  { achar: "No geral, consideramos", fora: true },
  { achar: "É muito inteligente.", divide: "É muito inteligente." }
];
function segundaDeExemplo(p) {
  const out = [];
  for (const e of ordenados(p)) {
    const c = { inicio: e.inicio, fim: e.fim, excerto_literal: e.excerto_literal, dimensao_dominante: e.dimensao_dominante, marcas: [...e.marcas], direitos: [...e.direitos], campos: [...e.campos], categorias_matriz: [...e.categorias_matriz], esp_nivel: e.esp_nivel, blg_nivel: e.blg_nivel, acu_nivel: e.acu_nivel };
    const d = DIVERGENCIAS_EXEMPLO.find(x => e.excerto_literal.startsWith(x.achar));
    if (d) {
      if (d.fora) continue;
      if (d.dim) c.dimensao_dominante = d.dim;
      if (d.tira) c.marcas = c.marcas.filter(m => !d.tira.includes(m));
      if (d.poe) d.poe.forEach(m => { if (!c.marcas.includes(m)) c.marcas.push(m); });
      if ("blg" in d) c.blg_nivel = d.blg;
      if (d.divide && e.excerto_literal.length > d.divide.length + 1) {
        const corte = e.inicio + d.divide.length, resto = e.excerto_literal.slice(d.divide.length), salto = resto.length - resto.trimStart().length;
        out.push({ ...c, fim: corte, excerto_literal: d.divide });
        out.push({ ...c, inicio: corte + salto, excerto_literal: resto.trimStart() });
        continue;
      }
    }
    out.push(c);
  }
  return { origem: "Segunda codificação simulada (apenas demonstração)", texto: p.texto_parecer, excertos: out };
}

/* ---------- segunda leitura por IA (opcional, só a pedido) ---------- */
function promptLeitura(p, ex) {
  const bloco = (titulo, itens) => titulo + "\n" + itens.map(x => `- ${x.c} (${x.n}): ${x.d}`).join("\n");
  return [
    "Você atua como segunda codificadora numa pesquisa de análise de conteúdo (Bardin) sobre pareceres descritivos da pré-escola (crianças de 4 e 5 anos).",
    "Codifique cada trecho de forma independente, usando somente o livro de códigos abaixo. O objeto da pesquisa é o documento: não avalie o professor.",
    "",
    "LIVRO DE CÓDIGOS",
    bloco("1. Dimensão dominante: exatamente uma por trecho.", DIMS),
    bloco("2. Marcas: todas as presentes; lista vazia se nenhuma. M1 a M4 são âncoras de observação; M5 é alerta de rótulo.",
      [...ANCORAS.map(a => ({ c: a.c, n: a.nome, d: `${a.d} Indicadores: ${a.ind}.` })), { c: ROTULO.c, n: ROTULO.nome, d: `${ROTULO.d} Exemplos: ${ROTULO.ind}.` }]),
    bloco("3. Direitos de Aprendizagem (BNCC): todos os presentes.", DIREITOS),
    bloco("4. Campos de Experiência (BNCC): todos os presentes.", CAMPOS),
    bloco("5. Categorias matriz do projeto: todas as presentes.", MATRIZ),
    "6. Categorias emergentes: 0 = não mencionado; 2 ou 3 conforme abaixo.",
    ...EMERG.map(g => `- ${g.c} (${g.n}): ${g.d} 2 = ${g.niveis[0].n}: ${g.niveis[0].d} 3 = ${g.niveis[1].n}: ${g.niveis[1].d}`),
    "",
    "TEXTO COMPLETO DO PARECER (somente contexto)",
    '"""', p.texto_parecer, '"""',
    "",
    "TRECHOS A CODIFICAR",
    ...ex.map((e, i) => `${i + 1}. «${e.excerto_literal}»`),
    "",
    "RESPOSTA",
    "Responda somente com um array JSON, um objeto por trecho, na mesma ordem, neste formato:",
    '[{"n":1,"dimensao":"DML","marcas":["M1","M4"],"direitos":["DExpr"],"campos":["EF"],"matriz":[],"esp":0,"blg":0,"acu":0,"motivo":"frase curta citando as palavras do trecho que sustentam os códigos"}]'
  ].join("\n");
}
function conferirLeitura(arr, ex) {
  if (!Array.isArray(arr)) throw { code: "formato" };
  const so = (v, validos) => Array.isArray(v) ? validos.filter(c => v.includes(c)) : [];
  const nv = (g, v) => Number(v) === 2 ? g.niveis[0].v : Number(v) === 3 ? g.niveis[1].v : NM;
  const out = {};
  arr.forEach((o, i) => {
    if (!o || typeof o !== "object") return;
    const e = ex[(Number(o.n) || i + 1) - 1]; if (!e) return;
    out[e.k] = {
      dimensao_dominante: DIMS.some(d => d.c === o.dimensao) ? o.dimensao : "", marcas: so(o.marcas, MARCAS_VALIDAS),
      direitos: so(o.direitos, DIREITOS.map(d => d.c)), campos: so(o.campos, CAMPOS.map(d => d.c)), categorias_matriz: so(o.matriz, MATRIZ.map(d => d.c)),
      esp_nivel: nv(EMERG[0], o.esp), blg_nivel: nv(EMERG[1], o.blg), acu_nivel: nv(EMERG[2], o.acu), motivo: String(o.motivo || "").slice(0, 400)
    };
  });
  if (!Object.keys(out).length) throw { code: "formato" };
  return out;
}
const MSG_IA = {
  not_granted: "A segunda leitura por IA não foi autorizada nesta visualização.", sampling_disabled: "A segunda leitura por IA não está disponível para esta conta.",
  not_declared: "A segunda leitura por IA não está disponível nesta página.", capability_disabled: "A segunda leitura por IA não está disponível nesta visualização.", capability_removed: "A segunda leitura por IA não está disponível nesta visualização.",
  rate_limited: "Limite de uso atingido. Tente de novo mais tarde.", session_expired: "Entre de novo na sua conta e tente outra vez.", refused: "O Claude não aceitou este conteúdo.",
  invalid_json: "A resposta veio em formato inesperado. Tente de novo.", empty_completion: "A resposta veio vazia. Tente de novo.", formato: "A resposta veio em formato inesperado. Tente de novo.",
  prompt_too_large: "O parecer é longo demais para uma única leitura."
};
async function pedirLeituraIA(p) {
  const sample = await capacidade("sample");
  if (!sample) { avisar("A segunda leitura por IA não está disponível nesta visualização."); return false; }
  const ex = ordenados(p).filter(e => e.ancora_ok);
  if (!ex.length) { avisar("Codifique ao menos um excerto antes."); return false; }
  S.ia = { estado: "lendo", ctl: new AbortController(), chave: p.key }; desenhar();
  try {
    const arr = await sample.json(promptLeitura(p, ex), { signal: S.ia.ctl.signal, modelTier: "default" });
    p.segunda_leitura = { origem: "Segunda leitura por IA (Claude)", feita_em: agora(), excertos: conferirLeitura(arr, ex) };
    S.ia = { estado: "", ctl: null };
    await store.gravarJa(p);
    return true;
  } catch (e) {
    const c = e && e.code; S.ia = { estado: "", ctl: null };
    if (c !== "cancelled") avisar(MSG_IA[c] || "Não foi possível concluir a leitura agora. Tente de novo.", 6000);
    return false;
  }
}
function segundaDaIA(p) {
  const l = p.segunda_leitura; if (!l || !l.excertos) return null;
  return { origem: `${l.origem}, ${dataHora(l.feita_em)}`, texto: p.texto_parecer, excertos: ordenados(p).filter(e => l.excertos[e.k]).map(e => ({ inicio: e.inicio, fim: e.fim, excerto_literal: e.excerto_literal, ...l.excertos[e.k] })) };
}
