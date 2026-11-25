/* ---------- desenho: painel de resultados ----------
   Organizado pelas mesmas quatro perguntas da codificação. Cada pergunta tem a sua contagem:
   conjuntos diferentes nunca são somados. Entram só pareceres finalizados. */
function dadosDoPainel() {
  let ps = finalizados(), exemplo = false;
  if (!ps.length) { const d = todos().find(p => p.demo && p.excertos.length); if (d) { ps = [d]; exemplo = true; } }
  const zero = () => ({ Ausencia: 0, Traco: 0, Lastro: 0 });
  const D = { N: ps.length, exemplo, E: 0, niv: zero(), porDim: {}, anc: { M1: 0, M2: 0, M3: 0, M4: 0 }, rot: 0, pres: {}, occ: {}, em: {}, emImig: {}, nImig: 0, grupos: [], rascunhos: reais().filter(p => p.status === "rascunho").length };
  DIMS.forEach(d => { D.porDim[d.c] = { total: 0, ...zero() }; });
  [...DIMS, ...DIREITOS, ...CAMPOS, ...MATRIZ].forEach(d => { D.pres[d.c] = 0; D.occ[d.c] = 0; });
  EMERG.forEach(g => { D.em[g.c] = { nm: 0, n2: 0, n3: 0, misto: 0 }; D.emImig[g.c] = { nm: 0, n2: 0, n3: 0, misto: 0 }; });
  const grupos = {}; IDENT.forEach(g => g.op.forEach(o => { grupos[g.f + "|" + o[0]] = { variavel: g.rot, valor: o[1], N: 0, niv: zero() }; }));
  for (const p of ps) {
    const r = resumoDoParecer(p), id = p.identificacao, imig = id.imigracao === "Sim";
    D.E += r.tot; D.rot += r.rot;
    NIVEIS.forEach(n => { D.niv[n] += r.niv[n]; }); ANC.forEach(m => { D.anc[m] += r.anc[m]; });
    DIMS.forEach(d => { const x = r.porDim[d.c]; D.porDim[d.c].total += x.total; NIVEIS.forEach(n => { D.porDim[d.c][n] += x[n]; }); });
    for (const conj of [r.tem.dimensao, r.tem.direito, r.tem.campo, r.tem.matriz]) conj.forEach(c => { D.pres[c]++; });
    for (const e of p.excertos) [...e.direitos, ...e.campos, ...e.categorias_matriz].forEach(c => { if (c in D.occ) D.occ[c]++; });
    if (imig) D.nImig++;
    EMERG.forEach(g => { const v = r.emNivel[g.f], k = v === NM ? "nm" : v === g.misto ? "misto" : v === g.niveis[0].v ? "n2" : "n3"; D.em[g.c][k]++; if (imig) D.emImig[g.c][k]++; });
    IDENT.forEach(g => { const x = grupos[g.f + "|" + id[g.f]]; if (x) { x.N++; NIVEIS.forEach(n => { x.niv[n] += r.niv[n]; }); } });
  }
  DIMS.forEach(d => { D.occ[d.c] = D.porDim[d.c].total; });
  D.grupos = Object.values(grupos).filter(g => g.N > 0);
  D.lista = [...ps].sort((a, b) => ordenaCodigo(a.identificacao.codigo_parecer, b.identificacao.codigo_parecer));
  return D;
}

function htmlPainel() {
  const D = dadosDoPainel(), N = D.N, E = D.E;
  if (!N) return `<div class="coluna"><div class="titulo-vista"><h1>Painel</h1><p>Os resultados aparecem aqui quando houver pareceres finalizados.</p></div></div>`;
  const par = n => pl(n, "parecer", "pareceres"), exc = n => pl(n, "excerto", "excertos");
  const tot = x => NIVEIS.reduce((s, n) => s + x[n], 0);
  const linhaBarra = (nomeHtml, v, base, fig, dica) => `<div class="lin"><span class="nome">${nomeHtml}</span><span class="trb" data-dica="${esc(dica)}"><i style="width:${pct(v, base)}%"></i></span><span class="fig">${fig}</span></div>`;
  const linhaNiveis = (nomeHtml, niv, fig) => `<div class="lin"><span class="nome">${nomeHtml}</span>${barraNiveis(niv, true)}<span class="fig">${fig}</span></div>`;
  const nomeCod = d => `<span class="cod">${d.c}</span><span>${esc(d.n)}</span>`;
  const linhasPres = lista => lista.map(d => linhaBarra(nomeCod(d), D.pres[d.c], N, `${D.pres[d.c]} de ${N}`, `${d.n}|aparece em ${D.pres[d.c]} de ${par(N)}, em ${exc(D.occ[d.c])}`)).join("");
  const tabPres = lista => `<details class="nums"><summary>Ver números</summary><div class="rol"><table class="t"><thead><tr><th>Código</th><th>Categoria</th><th class="num">Pareceres com registro</th><th class="num">Pareceres sem registro</th><th class="num">Excertos</th></tr></thead><tbody>
    ${lista.map(d => `<tr><td class="cod">${d.c}</td><td>${esc(d.n)}</td><td class="num">${D.pres[d.c]}</td><td class="num">${N - D.pres[d.c]}</td><td class="num">${D.occ[d.c]}</td></tr>`).join("")}</tbody></table></div></details>`;

  /* frases de leitura: descrevem os números, sem interpretar */
  const maxDim = Math.max(...DIMS.map(d => D.porDim[d.c].total)), topo = DIMS.filter(d => D.porDim[d.c].total === maxDim).map(d => d.n.toLowerCase());
  const fDim = !E ? "" : topo.length === 1 ? `A dimensão ${topo[0]} concentra ${pctTxt(maxDim, E)} dos excertos.`
    : `As dimensões ${topo.slice(0, -1).join(", ")} e ${topo[topo.length - 1]} têm ${pctTxt(maxDim, E)} dos excertos cada.`;
  const fLastro = E ? `Em ${D.niv.Ausencia} de ${exc(E)} (${pctTxt(D.niv.Ausencia, E)}), a afirmação não traz nenhuma âncora de observação. Em ${D.niv.Lastro} (${pctTxt(D.niv.Lastro, E)}), traz duas ou mais.` : "";
  const dirAus = DIREITOS.filter(d => D.pres[d.c] === 0), dirMin = DIREITOS.reduce((a, d) => D.pres[d.c] < D.pres[a.c] ? d : a, DIREITOS[0]);
  const eLista = v => v.length > 1 ? v.slice(0, -1).join(", ") + " e " + v[v.length - 1] : v[0];
  const fDir = dirAus.length ? `${eLista(dirAus.map(d => d.n))} não ${dirAus.length === 1 ? "aparece" : "aparecem"} ${N === 1 ? "neste parecer" : `em nenhum dos ${N} pareceres`}.` : `O direito menos registrado é ${dirMin.n}: aparece em ${D.pres[dirMin.c]} de ${par(N)}.`;
  const esp = D.em.ESP, nEsp = esp.n2 + esp.n3;
  const fEsp = `Há sinal de escolarização precoce em ${nEsp} de ${par(N)}${nEsp ? `; em ${esp.n3}, ela é central` : ""}.`;

  const linhaEm = (g, x, base) => `<tr><td><span class="cod">${g.c}</span> ${g.n}</td><td class="num">${x.nm}</td><td class="num">${x.n2} <small class="muted">${g.niveis[0].n.toLowerCase()}</small></td><td class="num">${x.n3} <small class="muted">${g.niveis[1].n.toLowerCase()}</small></td><td class="num">${g.misto ? x.misto : "—"}</td><td class="num">${base - x.nm} de ${base}</td></tr>`;
  const cabEm = `<thead><tr><th>Sinal</th><th class="num">Não mencionado</th><th class="num">Nível 2</th><th class="num">Nível 3</th><th class="num">Misto</th><th class="num">Com menção</th></tr></thead>`;
  let variavel = "";
  const grupos = D.grupos.map(g => { const cab = g.variavel !== variavel ? `<div class="grupo">${g.variavel}</div>` : ""; variavel = g.variavel; return cab + linhaNiveis(esc(g.valor), g.niv, `${par(g.N)}, ${exc(tot(g.niv))}`); }).join("");

  return `<div class="coluna">
    <div class="titulo-vista"><h1>Painel</h1>
      <p>${D.exemplo ? "Ilustração com o parecer de exemplo." : `Resultados parciais: ${N} de ${APP.total} pareceres finalizados.`} Cada pergunta tem a sua contagem; conjuntos diferentes nunca são somados.${D.rascunhos ? ` ${pl(D.rascunhos, "rascunho não entra", "rascunhos não entram")}.` : ""}</p></div>
    ${D.exemplo ? `<div class="faixa">Estes números são do parecer de exemplo. Quando houver pareceres finalizados, o painel passa a mostrar só eles.</div>` : ""}
    <div class="kpis">
      <div class="kpi um"><b>${D.exemplo ? 0 : N}</b><span>de ${APP.total} pareceres finalizados</span></div>
      <div class="kpi"><b>${E}</b><span>excertos codificados</span><small>${Number.isInteger(E / N) ? E / N : (E / N).toFixed(1).replace(".", ",")} por parecer</small></div>
      <div class="kpi"><b>${pctTxt(D.niv.Ausencia, E)}</b><span>dos excertos sem lastro</span><small>Hipótese 1</small></div>
      <div class="kpi"><b>${nEsp}</b><span>${nEsp === 1 ? "parecer" : "pareceres"} com sinal de escolarização precoce</span><small>Hipótese 2</small></div>
    </div>

    <figure class="fig"><figcaption><h2>De que falam os pareceres?</h2><p>${fDim}</p><span class="ref">Dimensão dominante de cada excerto. Unidade: excerto.</span></figcaption>
      <div class="linhas">${DIMS.map(d => linhaBarra(`<i class="pt ${d.c}"></i>${nomeCod(d)}`, D.porDim[d.c].total, E, `${D.porDim[d.c].total} (${pctTxt(D.porDim[d.c].total, E)})`, `${d.n}|${exc(D.porDim[d.c].total)}, em ${D.pres[d.c]} de ${par(N)}`)).join("")}</div>
      ${tabPres(DIMS)}</figure>

    <figure class="fig"><figcaption><h2>Com que apoio?</h2><p>${fLastro}</p><span class="ref">Hipótese 1: o registro traz atributos ou observações? Nível = número de âncoras (M1 a M4) no excerto.</span></figcaption>
      ${barraNiveis(D.niv)}${legendaNiveis()}
      <h3>Por dimensão</h3><div class="linhas">${DIMS.map(d => linhaNiveis(`<i class="pt ${d.c}"></i>${nomeCod(d)}`, D.porDim[d.c], exc(D.porDim[d.c].total))).join("")}</div>
      <h3>Âncoras presentes e rótulo</h3><div class="linhas">${ANCORAS.map(a => linhaBarra(`<span class="cod">${a.c}</span><span>${a.nome}</span>`, D.anc[a.c], E, `${D.anc[a.c]} (${pctTxt(D.anc[a.c], E)})`, `${a.nome}|presente em ${D.anc[a.c]} de ${exc(E)}`)).join("")}
        ${linhaBarra(`<span class="cod">M5</span><span>${ROTULO.nome}</span>`, D.rot, E, `${D.rot} (${pctTxt(D.rot, E)})`, `${ROTULO.nome}|presente em ${D.rot} de ${exc(E)}`)}</div>
      ${D.grupos.length ? `<h3>Por grupo de pareceres</h3><div class="linhas">${grupos}</div>` : ""}
      <details class="nums"><summary>Ver números</summary><div class="rol"><table class="t"><thead><tr><th>Recorte</th><th class="num">Excertos</th><th class="num">Sem lastro</th><th class="num">Traço</th><th class="num">Lastro</th><th class="num">Com lastro</th></tr></thead><tbody>
        <tr><td><b>Todos</b></td><td class="num">${E}</td><td class="num">${D.niv.Ausencia}</td><td class="num">${D.niv.Traco}</td><td class="num">${D.niv.Lastro}</td><td class="num">${pctTxt(D.niv.Lastro, E)}</td></tr>
        ${DIMS.map(d => { const x = D.porDim[d.c]; return `<tr><td><span class="cod">${d.c}</span> ${d.n}</td><td class="num">${x.total}</td><td class="num">${x.Ausencia}</td><td class="num">${x.Traco}</td><td class="num">${x.Lastro}</td><td class="num">${pctTxt(x.Lastro, x.total)}</td></tr>`; }).join("")}
        ${D.grupos.map(g => `<tr><td>${g.variavel}: ${esc(g.valor)} (${par(g.N)})</td><td class="num">${tot(g.niv)}</td><td class="num">${g.niv.Ausencia}</td><td class="num">${g.niv.Traco}</td><td class="num">${g.niv.Lastro}</td><td class="num">${pctTxt(g.niv.Lastro, tot(g.niv))}</td></tr>`).join("")}
      </tbody></table></div></details></figure>

    <figure class="fig"><figcaption><h2>Em diálogo com quê?</h2><p>${fDir}</p><span class="ref">Objetivo específico 2: presença do referencial da BNCC; e categorias do projeto matriz. Unidade: parecer em que o código aparece.</span></figcaption>
      <h3>Direitos de Aprendizagem</h3><div class="linhas">${linhasPres(DIREITOS)}</div>${tabPres(DIREITOS)}
      <h3>Campos de Experiência</h3><div class="linhas">${linhasPres(CAMPOS)}</div>${tabPres(CAMPOS)}
      <h3>Categorias matriz</h3><div class="linhas">${linhasPres(MATRIZ)}</div>${tabPres(MATRIZ)}</figure>

    <figure class="fig"><figcaption><h2>Que sinais trazem?</h2><p>${fEsp}</p><span class="ref">Hipótese 2: escolarização precoce; e tratamento da diversidade linguística e cultural. Unidade: parecer.</span></figcaption>
      <div class="rol"><table class="t">${cabEm}<tbody>${EMERG.map(g => linhaEm(g, D.em[g.c], N)).join("")}</tbody></table></div>
      ${D.nImig ? `<h3>Só os pareceres de crianças imigrantes (${D.nImig})</h3><div class="rol"><table class="t">${cabEm}<tbody>${EMERG.slice(1).map(g => linhaEm(g, D.emImig[g.c], D.nImig)).join("")}</tbody></table></div>` : ""}
      <p class="dica">Não mencionado significa apenas que o parecer não tratou do tema. Não é prova de descuido.</p></figure>
    <figure class="fig"><figcaption><h2>Parecer por parecer</h2><p>${D.exemplo ? "Por enquanto, só o parecer de exemplo." : "Cada linha é um parecer finalizado."} Escolha o código para abrir o parecer.</p></figcaption>
      <div class="rol"><table class="t"><thead><tr><th>Parecer</th><th>Perfil</th><th class="num">Excertos</th><th style="min-width:150px">Com que apoio?</th><th>Predominante</th><th>Sinais</th></tr></thead><tbody>
      ${D.lista.map(p => { const r = resumoDoParecer(p), id = p.identificacao;
        const sinais = EMERG.filter(g => r.emNivel[g.f] !== NM).map(g => `${g.c}: ${rotEmerg(g, r.emNivel[g.f]).toLowerCase()}`).join("; ");
        return `<tr><td><button class="btn leve p" data-act="abrir" data-k="${p.key}">${esc(id.codigo_parecer)}</button></td><td>${esc([id.tipo_instituicao, id.idade ? id.idade + " anos" : "", id.semestre, id.imigracao === "Sim" ? "imigração" : ""].filter(Boolean).join(", "))}</td>
          <td class="num">${r.tot}</td><td>${barraNiveis(r.niv, true)}</td><td>${ROT_PRED[r.pred]}</td><td>${esc(sinais) || '<span class="muted">nenhum</span>'}</td></tr>`; }).join("")}
      </tbody></table></div>${legendaNiveis()}</figure>
    ${htmlDuvidas()}
  </div>`;
}

/* Excertos marcados como dúvida, em todos os pareceres em andamento ou finalizados: a pauta da orientação */
function duvidasMarcadas() {
  const base = reais().length ? reais() : todos().filter(p => p.demo);            // sem pareceres reais, mostra as dúvidas do exemplo
  return base.sort((a, b) => ordenaCodigo(a.identificacao.codigo_parecer, b.identificacao.codigo_parecer))
    .flatMap(p => ordenados(p).map((e, i) => ({ p, e, n: i + 1 })).filter(x => x.e.duvida));
}
function htmlDuvidas() {
  const d = duvidasMarcadas();
  return `<figure class="fig"><figcaption><h2>Dúvidas para a orientação</h2>
    <p>${d.length ? `${pl(d.length, "excerto marcado", "excertos marcados")} como dúvida, em rascunhos e pareceres finalizados.` : "Nenhum excerto marcado como dúvida."}</p>
    <span class="ref">Cada dúvida anotada e resolvida melhora o Livro de Códigos.</span></figcaption>
    ${d.length ? `<div class="div">${d.map(x => `<div class="dv"><q>${esc(x.e.excerto_literal)}</q><div class="peq"><b>${esc(x.p.identificacao.codigo_parecer)}, excerto ${x.n}</b>${x.e.dimensao_dominante ? ", " + x.e.dimensao_dominante : ""}, ${ROT_NIVEL[nivelDo(x.e)].toLowerCase()}. ${esc(x.e.observacoes) || '<span class="muted">Sem nota.</span>'}</div></div>`).join("")}</div>
      <div class="linha"><button class="btn" data-act="duvidas-copiar">Copiar a lista de dúvidas</button></div>` : ""}</figure>`;
}
function textoDasDuvidas() {
  const d = duvidasMarcadas(); if (!d.length) return "";
  return ["Dúvidas de codificação para a orientação", "", ...d.flatMap((x, i) => [`${i + 1}. ${x.p.identificacao.codigo_parecer}, excerto ${x.n}: «${x.e.excerto_literal}»`,
    `   Codificado como: ${x.e.dimensao_dominante || "sem dimensão"}, ${ROT_NIVEL[nivelDo(x.e)]} (${x.e.marcas.length ? x.e.marcas.join(", ") : "nenhuma marca"})`, `   Nota: ${x.e.observacoes || "sem nota"}`, ""])].join("\n");
}
