/* ---------- arquivos: JSON, ZIP, CSV, fichas, backup, importação ---------- */

async function comprimir(u8) {
  if (typeof CompressionStream === "undefined") return null;
  try { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer()); }
  catch (e) { return null; }
}
/* ZIP mínimo e padrão (deflate quando o navegador oferece; senão, sem compressão). Nomes em UTF-8. */
async function montarZip(arquivos) {
  const enc = new TextEncoder(), partes = [], indice = []; let pos = 0;
  const d = new Date();
  const hora = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
  const dia = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
  for (const a of arquivos) {
    const nome = enc.encode(a.nome), bruto = typeof a.dados === "string" ? enc.encode(a.dados) : a.dados;
    const crc = crc32(bruto); let comp = await comprimir(bruto), metodo = 8;
    if (!comp || comp.length >= bruto.length) { comp = bruto; metodo = 0; }
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, metodo, true);
    lh.setUint16(10, hora, true); lh.setUint16(12, dia, true); lh.setUint32(14, crc, true); lh.setUint32(18, comp.length, true);
    lh.setUint32(22, bruto.length, true); lh.setUint16(26, nome.length, true); lh.setUint16(28, 0, true);
    partes.push(new Uint8Array(lh.buffer), nome, comp);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, metodo, true);
    ch.setUint16(12, hora, true); ch.setUint16(14, dia, true); ch.setUint32(16, crc, true); ch.setUint32(20, comp.length, true); ch.setUint32(24, bruto.length, true);
    ch.setUint16(28, nome.length, true); ch.setUint32(42, pos, true);
    indice.push(new Uint8Array(ch.buffer), nome);
    pos += 30 + nome.length + comp.length;
  }
  const tamIndice = indice.reduce((s, b) => s + b.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true); fim.setUint16(8, arquivos.length, true); fim.setUint16(10, arquivos.length, true);
  fim.setUint32(12, tamIndice, true); fim.setUint32(16, pos, true);
  return new Blob([...partes, ...indice, new Uint8Array(fim.buffer)], { type: "application/zip" });
}

/* CSV para o Excel em português: separador ponto e vírgula, UTF-8 com BOM */
const celula = v => { const s = Array.isArray(v) ? v.join(", ") : (v ?? ""); return '"' + String(s).replace(/"/g, '""') + '"'; };
const csv = (cab, linhas) => "﻿" + [cab.map(celula).join(";"), ...linhas.map(l => l.map(celula).join(";"))].join("\r\n");

function tabelasCsv(regs) {
  const cDir = DIREITOS.map(d => d.c), cCam = CAMPOS.map(d => d.c), cMat = MATRIZ.map(d => d.c), cDim = DIMS.map(d => d.c);
  const um = (lista, c) => lista.includes(c) ? 1 : 0;
  const excertos = csv(
    ["ID_Excerto", "Codigo_Parecer", "ID_Registro", "Localizacao", "Excerto_Literal", "Dimensao_Dominante", "Dimensao_Nivel", "Dimensao_Secundaria", "Marcas_Presentes", "N_Ancoras", "Nivel_Registro",
      "Direitos", "Campos", "Categorias_Matriz", "ESP_Nivel", "BLG_Nivel", "ACU_Nivel", "Duvida", "Observacoes",
      ...MARCAS_VALIDAS, ...cDir, ...cCam, ...cMat, "Tipo_Instituicao", "Semestre", "Idade", "Imigracao"],
    regs.flatMap(o => o.excertos.map(e => [e.id_excerto, e.codigo_parecer, o.id_registro, e.localizacao, e.excerto_literal, e.dimensao_dominante, e.dimensao_nivel, e.dimensao_secundaria || "", e.marcas_presentes, e.n_ancoras, e.nivel_registro,
      e.direitos, e.campos, e.categorias_matriz, e.esp_nivel, e.blg_nivel, e.acu_nivel, e.duvida ? "Sim" : "", e.observacoes,
      ...MARCAS_VALIDAS.map(c => um(e.marcas_presentes, c)), ...cDir.map(c => um(e.direitos, c)), ...cCam.map(c => um(e.campos, c)), ...cMat.map(c => um(e.categorias_matriz, c)),
      o.parecer.tipo_instituicao, o.parecer.semestre, o.parecer.idade, o.parecer.imigracao])));
  const pareceres = csv(
    ["Codigo_Parecer", "ID_Registro", "Versao", "Tipo_Instituicao", "Semestre", "Idade", "Imigracao", "Extensao_Palavras", "N_Excertos", "Cobertura_Pct", "Nivel_Registro_Predominante",
      "N_Sem_Lastro", "N_Traco", "N_Lastro", "N_Rotulo_M5", "ESP_Nivel", "BLG_Nivel", "ACU_Nivel", ...cDim, ...cDir, ...cCam, ...cMat,
      "Excerto_Representativo", "Sintese_Uma_Frase", "Observacoes_Gerais", "Finalizado_Em"],
    regs.map(o => [o.parecer.codigo_parecer, o.id_registro, o.versao, o.parecer.tipo_instituicao, o.parecer.semestre, o.parecer.idade, o.parecer.imigracao, o.parecer.extensao_palavras, o.parecer.n_excertos,
      Math.round(100 * (o.parecer.cobertura_do_texto || 0)), o.parecer.nivel_registro_predominante,
      o.contagens.nivel_registro.Ausencia, o.contagens.nivel_registro.Traco, o.contagens.nivel_registro.Lastro, o.contagens.rotulo_M5, o.ausencias.esp_nivel, o.ausencias.blg_nivel, o.ausencias.acu_nivel,
      ...cDim.map(c => um(o.ausencias.dimensao_ausente, c) ? 0 : 1), ...cDir.map(c => um(o.ausencias.direito_ausente, c) ? 0 : 1), ...cCam.map(c => um(o.ausencias.campo_ausente, c) ? 0 : 1), ...cMat.map(c => um(o.ausencias.categoria_matriz_ausente, c) ? 0 : 1),
      o.parecer.excerto_representativo, o.parecer.sintese_uma_frase, o.parecer.observacoes_gerais, o.finalizado_em]));
  const ausencias = csv(
    ["Codigo_Parecer", "ID_Registro", "Dimensao_Ausente", "Direito_Ausente", "Campo_Ausente", "Categoria_Matriz_Ausente", "ESP_Nivel", "BLG_Nivel", "ACU_Nivel", "Observacoes_Ausencia"],
    regs.map(o => [o.parecer.codigo_parecer, o.id_registro, o.ausencias.dimensao_ausente, o.ausencias.direito_ausente, o.ausencias.campo_ausente, o.ausencias.categoria_matriz_ausente,
      o.ausencias.esp_nivel, o.ausencias.blg_nivel, o.ausencias.acu_nivel, o.ausencias.observacoes_ausencia]));
  return { excertos, pareceres, ausencias };
}

/* Ficha de leitura de um parecer, em Markdown (a ficha-resumo prevista no Livro de Códigos) */
function fichaMd(o) {
  const pa = o.parecer, c = o.contagens, a = o.ausencias, L = [];
  const lista = v => v && v.length ? v.join(", ") : "nenhuma ausência";
  const barra = s => String(s ?? "").replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");
  L.push(`# Parecer ${pa.codigo_parecer}`, "",
    `Registro ${o.id_registro || "(rascunho)"}, versão ${o.versao}${o.substitui ? `, substitui ${o.substitui}` : ""}. ${APP.livro}.`, "",
    `- Instituição: ${pa.tipo_instituicao}`, `- Semestre: ${pa.semestre}`, `- Idade: ${pa.idade} anos`, `- Imigração: ${rotIdent("imigracao", pa.imigracao)}`,
    `- Extensão: ${pa.extensao_palavras} palavras, ${pa.n_excertos} excertos, ${Math.round(100 * (pa.cobertura_do_texto || 0))}% do texto codificado`, "",
    "## Síntese", "", pa.sintese_uma_frase || "(sem síntese)", "",
    "## Excerto representativo", "", pa.excerto_representativo ? "> " + pa.excerto_representativo.replace(/\n+/g, " ") : "(não escolhido)", "",
    "## Com que apoio? (nível do registro)", "",
    `Sem lastro: ${c.nivel_registro.Ausencia}. Traço: ${c.nivel_registro.Traco}. Lastro: ${c.nivel_registro.Lastro}. Predominante: ${ROT_PRED[pa.nivel_registro_predominante] || pa.nivel_registro_predominante}.`,
    `Rótulo (M5) em ${c.rotulo_M5} excerto(s).`, "",
    "| Dimensão | Excertos | Sem lastro | Traço | Lastro |", "|---|---:|---:|---:|---:|",
    ...DIMS.map(d => { const x = c.por_dimensao[d.c] || { total: 0, Ausencia: 0, Traco: 0, Lastro: 0 }; return `| ${d.c} ${d.n} | ${x.total} | ${x.Ausencia} | ${x.Traco} | ${x.Lastro} |`; }), "",
    "## Não registrado neste parecer", "",
    `- Dimensões: ${lista(a.dimensao_ausente)}`, `- Direitos de Aprendizagem: ${lista(a.direito_ausente)}`, `- Campos de Experiência: ${lista(a.campo_ausente)}`, `- Categorias matriz: ${lista(a.categoria_matriz_ausente)}`,
    ...(a.observacoes_ausencia ? ["", a.observacoes_ausencia] : []), "",
    "## Sinais", "",
    ...EMERG.map(g => `- ${g.n} (${g.c}): ${rotEmerg(g, a[g.f])}`), "",
    "## Excertos", "",
    "| Nº | Excerto literal | Dimensão | Nível | Marcas | Direitos | Campos | Matriz | Sinais | Notas |", "|---|---|---|---|---|---|---|---|---|---|",
    ...o.excertos.map((e, i) => {
      const sinais = EMERG.filter(g => e[g.f] && e[g.f] !== NM).map(g => `${g.c}: ${rotEmerg(g, e[g.f])}`).join("; ");
      return `| ${i + 1} | ${barra(e.excerto_literal)} | ${e.dimensao_dominante}${e.dimensao_secundaria ? ` (+${e.dimensao_secundaria})` : ""} | ${ROT_NIVEL[e.nivel_registro]} (${e.dimensao_nivel}) | ${e.marcas_presentes.join(", ")} | ${e.direitos.join(", ")} | ${e.campos.join(", ")} | ${e.categorias_matriz.join(", ")} | ${sinais} | ${e.duvida ? "DÚVIDA. " : ""}${barra(e.observacoes)} |`;
    }), "");
  if (pa.observacoes_gerais) L.push("## Observações gerais", "", pa.observacoes_gerais, "");
  return L.join("\n");
}

const LEIA_ME = n => [
  "CODIFICADOR DE PARECERES - PIBIC/UNOESC",
  APP.projeto, "",
  `Este arquivo reúne ${n} parecer(es) finalizado(s) de ${APP.total} previstos.`, "",
  "CONTEÚDO",
  "manifesto.json      lista dos registros, com número, versão e resumo de integridade de cada um",
  "pareceres/          um JSON por parecer finalizado: é o registro oficial",
  "historico/          versões substituídas por correção (não entram nas contagens)",
  "consolidado/        três tabelas CSV geradas dos JSON, para o Excel:",
  "                    excertos.csv (uma linha por excerto, com colunas 0/1 por código),",
  "                    pareceres.csv (uma linha por parecer) e ausencias.csv",
  "fichas/             uma ficha de leitura por parecer, em Markdown", "",
  "COMO LER",
  "Nível do registro: número de âncoras de observação (M1 a M4) no excerto.",
  "0 = Ausencia (sem lastro); 1 = Traco; 2 ou mais = Lastro. MC = pelo menos uma âncora; MS = nenhuma.",
  "Conjuntos diferentes (dimensões, direitos, campos, matriz, emergentes, marcas) nunca se somam na mesma conta.",
  "Os CSV usam ponto e vírgula como separador e abrem direto no Excel em português.", "",
  "INTEGRIDADE",
  "Cada JSON traz o campo integridade.resumo (SHA-256 do próprio registro). O Codificador confere esse resumo ao importar:",
  "um arquivo alterado depois de gerado é recusado.",
  "Registro com o bloco origem: foi reunido de outro navegador ou aparelho, onde tinha outro número. O bloco guarda o número e o resumo de origem."
].join("\r\n");

/* Registro pronto para entregar: o selado, se o parecer está finalizado; senão, o estado atual do rascunho */
async function registroPara(p) { return p.registro ? p.registro : await selar(registroDe(p)); }

/* Entrega um arquivo. Se a visualização não permitir download, oferece o conteúdo para copiar. */
async function entregar(nome, dados, textoAlternativo) {
  const dl = await capacidade("downloads");
  if (dl) {
    try { await dl.save({ filename: nome, data: dados }); avisar("Arquivo entregue: " + nome); return true; }
    catch (e) {
      const c = e && e.code;
      if (c === "declined") { avisar("Download cancelado."); return false; }
      if (c === "rate_limited") { avisar("Já há um download aguardando a sua confirmação."); return false; }
    }
  }
  /* Fora do claude.ai (GitHub Pages, arquivo aberto no computador): o navegador baixa o arquivo direto */
  if (!window.claude) {
    try {
      const blob = dados instanceof Blob ? dados : new Blob([dados], { type: /\.zip$/i.test(nome) ? "application/zip" : "application/json" });
      const url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = nome; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      avisar("Arquivo baixado: " + nome); return true;
    } catch (e) { /* segue para copiar */ }
  }
  if (textoAlternativo) { modalCopiar(nome, textoAlternativo); return false; }
  avisar("Esta visualização não permite baixar arquivos. Abra o Codificador no claude.ai.", 6000);
  return false;
}
async function baixarJson(p) {
  const texto = JSON.stringify(await registroPara(p), null, 2);
  const ok = await entregar(nomeDoArquivo(p), texto, texto);
  if (ok && p.status === "finalizado" && !p.json_baixado) { p.json_baixado = true; await store.gravarJa(p); desenharLista(); }
  return ok;
}

function manifestoDe(regs, hist) {
  return {
    schema: APP.schema, instrumento: { nome: APP.nome, versao: APP.versao, livro_de_codigos: APP.livro }, gerado_em: agora(),
    total_previsto: APP.total, finalizados: regs.length, faltam: Math.max(0, APP.total - regs.length),
    rascunhos_nao_incluidos: reais().filter(p => p.status === "rascunho").map(p => p.identificacao.codigo_parecer).sort(ordenaCodigo),
    ultimo_numero_de_registro: S.meta.contador,
    registros: regs.map(o => ({ id_registro: o.id_registro, codigo_parecer: o.parecer.codigo_parecer, versao: o.versao, substitui: o.substitui, arquivo: `pareceres/${o.id_registro}_${o.parecer.codigo_parecer}_v${o.versao}.json`, integridade: o.integridade.resumo, ...(o.origem ? { numero_de_origem: o.origem.id_registro } : {}) })),
    historico: hist.map(p => ({ id_registro: p.id_registro, codigo_parecer: p.identificacao.codigo_parecer, versao: p.versao, substituido_por: p.substituido_por || null, arquivo: "historico/" + nomeDoArquivo(p), integridade: p.registro.integridade.resumo }))
  };
}
function conjuntoFinal() {
  const fin = finalizados().sort((a, b) => ordenaCodigo(a.identificacao.codigo_parecer, b.identificacao.codigo_parecer));
  const hist = todos().filter(p => !p.demo && p.status === "substituido" && p.registro).sort((a, b) => ordenaCodigo(a.id_registro, b.id_registro));
  return { regs: fin.map(p => p.registro), hist };
}
async function gerarZip() {
  const { regs, hist } = conjuntoFinal();
  const man = manifestoDe(regs, hist), t = tabelasCsv(regs);
  const arquivos = [
    { nome: "LEIA-ME.txt", dados: LEIA_ME(regs.length) },
    { nome: "manifesto.json", dados: JSON.stringify(man, null, 2) },
    ...regs.map(o => ({ nome: `pareceres/${o.id_registro}_${o.parecer.codigo_parecer}_v${o.versao}.json`, dados: JSON.stringify(o, null, 2) })),
    ...hist.map(p => ({ nome: "historico/" + nomeDoArquivo(p), dados: JSON.stringify(p.registro, null, 2) })),
    { nome: "consolidado/excertos.csv", dados: t.excertos }, { nome: "consolidado/pareceres.csv", dados: t.pareceres }, { nome: "consolidado/ausencias.csv", dados: t.ausencias },
    ...regs.map(o => ({ nome: `fichas/${o.parecer.codigo_parecer}.md`, dados: fichaMd(o) }))
  ];
  const zip = await montarZip(arquivos);
  const pacote = JSON.stringify({ tipo: "pacote-final", manifesto: man, registros: regs, historico: hist.map(p => p.registro) }, null, 2);
  return entregar(`PIBIC_pareceres_${carimbo()}_${regs.length}de${APP.total}.zip`, zip, pacote);
}
async function fazerBackup() {
  const d = new Date();
  const texto = JSON.stringify({ tipo: "backup-completo", schema: APP.schema, gerado_em: agora(), meta: { contador: S.meta.contador }, pareceres: todos().filter(p => !p.demo).map(paraGuardar) }, null, 2);
  return entregar(`BACKUP_pibic_${carimbo()}_${zeros(d.getHours())}${zeros(d.getMinutes())}.json`, texto, texto);
}

/* Importa backup, pacote ou registros avulsos. Três leis:
   1) Nunca grava por cima: a identidade de um registro é o seu selo; o que já está aqui é só contado como repetido.
   2) Um código, uma linhagem: se o código já tem parecer ativo aqui, o que chega fica de fora, a não ser que seja a correção dele.
   3) Número único: registro que chega com um número já usado aqui por outro parecer recebe o próximo número livre e guarda o de origem. */
async function importar(lista) {
  const r = { novos: 0, historico: 0, repetidos: 0, exemplos: 0, conflitos: [], renumerados: [], alterados: 0, estranhos: 0 }, chegando = [];
  const conhecido = o => [...todos(), ...chegando].some(x => x.registro && mesmoRegistro(x.registro, o));
  const aceitaRegistro = async o => {
    if (!o || o.schema !== APP.schema || !o.id_registro || !o.parecer || !Array.isArray(o.excertos)) { r.estranhos++; return; }
    if (o.exemplo) { r.exemplos++; return; }
    if ((await integro(o)) === false) { r.alterados++; return; }
    if (conhecido(o)) { r.repetidos++; return; }
    chegando.push(aoAbrir({ key: uid(), modelo: APP.modelo, status: "finalizado", demo: false, versao: o.versao || 1, id_registro: o.id_registro, substitui: o.substitui || null,
      registro: o, json_baixado: true, criado_em: o.criado_em || agora(), finalizado_em: o.finalizado_em || null, atualizado_em: agora() }));
  };
  for (const arq of lista) {
    let o; try { o = JSON.parse(await arq.text()); } catch (e) { r.estranhos++; continue; }
    if (o && o.tipo === "backup-completo" && Array.isArray(o.pareceres)) {
      if (o.meta && o.meta.contador) S.meta.contador = Math.max(S.meta.contador || 0, o.meta.contador);
      for (const g of o.pareceres) {
        if (!g || !g.key || g.excluido || g.demo) continue;
        if ((S.P[g.key] && !S.P[g.key].excluido) || chegando.some(x => x.key === g.key)) { r.repetidos++; continue; }
        if (g.registro) {
          if ((await integro(g.registro)) === false) { r.alterados++; continue; }
          if (conhecido(g.registro)) { r.repetidos++; continue; }
        }
        chegando.push(aoAbrir(copia(g)));
      }
    } else if (o && o.tipo === "pacote-final" && Array.isArray(o.registros)) {
      for (const x of [...o.registros, ...(o.historico || [])]) await aceitaRegistro(x);
    } else await aceitaRegistro(o);
  }
  /* quem foi substituído por quem: vale a versão seguinte já finalizada, procurada primeiro no que chega e depois aqui */
  const locais = todos().filter(x => !x.demo);
  for (const p of chegando) if (p.status !== "rascunho") {
    const segue = y => y !== p && y.status !== "rascunho" && codigoDe(y) === codigoDe(p) && y.substitui && y.substitui === p.id_registro;
    const suc = chegando.find(segue) || (locais.some(x => codigoDe(x) === codigoDe(p) && x.id_registro === p.id_registro) ? null : locais.find(segue));
    if (suc) { p.status = "substituido"; p.substituido_por = suc.id_registro || null; } else { p.status = "finalizado"; delete p.substituido_por; }
  }
  /* um código, uma linhagem */
  const aceitos = [], tocados = [], grupos = {};
  for (const p of chegando) (grupos[codigoDe(p)] = grupos[codigoDe(p)] || []).push(p);
  for (const [cod, g] of Object.entries(grupos)) {
    const emCorrecao = p => p.status === "finalizado" && g.some(y => y.status === "rascunho" && y.substitui === p.id_registro);   // finalizado com correção em rascunho: um par, não dois rivais
    const ativos = g.filter(p => p.status !== "substituido" && !emCorrecao(p)), a = ativos[0];
    const aqui = locais.filter(x => x.status !== "substituido" && codigoDe(x) === cod), local = aqui[0];
    if (ativos.length > 1 || (a && aqui.length > 1)) { r.conflitos.push(cod); continue; }
    if (a && local) {
      /* só entra se for a correção do parecer que está aqui (a referência pode trazer o número que ele tinha na origem) */
      const eLocal = id => !!id && (id === local.id_registro || (local.registro && local.registro.origem && local.registro.origem.id_registro === id));
      const corrige = local.status === "finalizado" && eLocal(a.substitui) && (a.versao || 1) > (local.versao || 1) && !g.some(y => y !== a && y.id_registro === a.substitui);
      if (!corrige) { r.conflitos.push(cod); continue; }
      if (a.substitui !== local.id_registro) await reRegistrar(a, a.id_registro, local.id_registro);
      if (a.status === "finalizado") { local.status = "substituido"; local.substituido_por = a.id_registro; local.atualizado_em = depoisDe(local.atualizado_em); tocados.push(local); }
    }
    aceitos.push(...g); if (a) r.novos++;
  }
  for (const p of aceitos) { S.P[p.key] = p; if (p.status === "substituido") r.historico++; }
  await migrarTudo();
  if (aceitos.some(p => p.registro)) {
    S.meta.contador = Math.max(S.meta.contador || 0, (await store.proximoNumero()) - 1);
    const ren = await renumerarRepetidos(aceitos);
    r.renumerados = ren.trocas;
    for (const p of ren.mexidos) if (!aceitos.includes(p) && !tocados.includes(p)) tocados.push(p);
  }
  S.meta.contador = Math.max(S.meta.contador || 0, maiorNumero());
  for (const p of [...aceitos, ...tocados]) if (S.P[p.key]) await store.gravarJa(S.P[p.key]);
  await store.gravarMeta();
  return r;
}
