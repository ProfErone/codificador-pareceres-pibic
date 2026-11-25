/* ---------- desenho: a folha de trabalho de um parecer ---------- */
const PASSOS = [["doc", "Parecer"], ["cod", "Codificação"], ["fec", "Fechamento"]];

function desenharFolha() {
  const m = $("#folha"); if (!m) return;
  const p = atual();
  if (!p) {
    m.innerHTML = `<div class="vazio"><h1>Nenhum parecer aberto</h1>
      <p>Crie um parecer para começar. Ao ser finalizado, cada parecer recebe um número de registro, fica travado e gera um arquivo JSON. Um parecer nunca é gravado por cima de outro.</p>
      <div class="linha"><button class="btn pri" data-act="novo">Novo parecer</button>${todos().some(x => x.demo) ? "" : `<button class="btn" data-act="exemplo">Abrir o parecer de exemplo</button>`}</div></div>`;
    return;
  }
  m.innerHTML = `<div id="cab"></div><div class="area" id="area"></div>`;
  pintarCab(); pintarArea();
}
/* Registro reunido de outro navegador ou aparelho, onde tinha outro número */
const origemDe = p => { const o = p.registro && p.registro.origem; return o && o.id_registro && o.id_registro !== p.id_registro ? ` Veio de outro navegador ou aparelho, onde era ${esc(o.id_registro)}.` : ""; };
function pintarCab() {
  const el = $("#cab"), p = atual(); if (!el || !p) return;
  const id = p.identificacao, pend = pendenciasDe(p), ro = !editavel(p);
  const meta = IDENT.map(g => id[g.f] ? (g.f === "imigracao" ? "imigração: " + rotIdent(g.f, id[g.f]).toLowerCase() : rotIdent(g.f, id[g.f])) : null).filter(Boolean);
  meta.push(pl(palavras(p.texto_parecer), "palavra", "palavras"), pl(p.excertos.length, "excerto", "excertos"));
  let aviso = "";
  if (p.status === "substituido") aviso = `<div class="aviso hist"><span class="dito">Versão substituída por <b>${esc(p.substituido_por || "outra versão")}</b>. Fica no histórico, somente para leitura.${origemDe(p)}</span><button class="btn p" data-act="baixar-json">Baixar JSON</button></div>`;
  else if (p.status === "finalizado" && p.demo) aviso = `<div class="aviso demo"><span class="dito">Exemplo finalizado: o registro está travado, como ficará cada parecer real.</span><button class="btn p" data-act="baixar-json">Baixar JSON</button><button class="btn p" data-act="exemplo-refazer">Restaurar o exemplo</button></div>`;
  else if (p.status === "finalizado") aviso = `<div class="aviso fin"><span class="dito">Finalizado como <b>${esc(p.id_registro)}</b> em ${dataHora(p.finalizado_em)}. O registro está travado.${origemDe(p)}</span><button class="btn p" data-act="baixar-json">Baixar JSON</button><button class="btn p" data-act="corrigir">Corrigir em nova versão</button></div>`
    + (!p.json_baixado && store.modo !== "conta" ? `<div class="aviso alerta"><span class="dito">O JSON deste parecer ainda não foi baixado. Neste navegador, o arquivo é a cópia segura.</span></div>` : "");
  else if (p.demo) aviso = `<div class="aviso demo"><span class="dito">Parecer de exemplo, montado com os 20 excertos do P07 da planilha original. Pode mexer à vontade: ele não entra nas contagens nem no ZIP.</span><button class="btn p" data-act="exemplo-refazer">Restaurar o exemplo</button><button class="btn p" data-act="exemplo-remover">Remover da lista</button></div>`;
  else if (p.substitui) aviso = `<div class="aviso demo"><span class="dito">Nova versão de <b>${esc(p.substitui)}</b>. Ao finalizar, recebe outro número, e a versão anterior vai para o histórico.</span></div>`;
  el.innerHTML = `
    <div class="cab"><h1>${esc(id.codigo_parecer)}</h1>${seloDe(p)}<span class="meta">${esc(meta.join(", "))}</span>
      ${!ro && !p.demo ? `<button class="btn leve p perigo" data-act="excluir-parecer" style="margin-left:auto">Excluir rascunho</button>` : ""}</div>
    ${aviso}
    <ol class="passos" aria-label="Etapas do parecer">${PASSOS.map(([k, t], i) => `<li><button class="passo"${S.passo === k ? ' aria-current="step"' : ""} data-act="passo" data-v="${k}">
      <span class="n">${i + 1}</span>${t}${k === "cod" && pend && !ro ? `<span class="pend" title="Pendências">${pend}</span>` : passoPronto(p, k) ? `<span class="ok" title="Completo">✓</span>` : ""}</button></li>`).join("")}</ol>`;
}
function pintarArea() {
  const el = $("#area"), p = atual(); if (!el || !p) return;
  const ro = !editavel(p);
  if (S.passo === "doc") el.innerHTML = htmlDoc(p, ro);
  else if (S.passo === "cod") { el.innerHTML = htmlCod(p, ro); pintarCod(); }
  else el.innerHTML = htmlFec(p, ro);
}

/* ----- passo 1: o documento ----- */
function htmlDoc(p, ro) {
  const id = p.identificacao;
  const ident = IDENT.map(g => `<div class="campo"><span class="rot">${g.rot}</span><div class="chips" role="group" aria-label="${g.rot}">${g.op.map(o => chip({ act: "ident", f: g.f, v: o[0], on: id[g.f] === o[0], html: esc(o[1]), ro })).join("")}</div></div>`).join("");
  /* Sem excertos, o texto é guardado enquanto se digita. Com excertos, a troca do texto é um ato explícito. */
  const vivo = !ro && !p.excertos.length, editando = !ro && p.excertos.length > 0 && S.editTexto;
  const texto = vivo
    ? `<div class="campo"><label for="txt">Texto do parecer</label><span class="dica">Cole o parecer inteiro, já anonimizado. Os excertos são selecionados neste texto, por isso a cópia é sempre literal.</span>
        <textarea id="txt" class="doc" data-vivo="1" placeholder="Cole aqui o texto do parecer">${esc(p.texto_parecer)}</textarea>
        <span class="muted peq" id="contagem">${pl(palavras(p.texto_parecer), "palavra", "palavras")}</span></div>`
    : editando
    ? `<div class="campo"><label for="txt">Texto do parecer</label>
        <textarea id="txt" class="doc">${esc(S.textoPendente != null ? S.textoPendente : p.texto_parecer)}</textarea></div>
        <div class="al w"><b>Atenção</b><span>Este parecer já tem ${pl(p.excertos.length, "excerto", "excertos")}. Ao usar o novo texto, cada trecho é procurado de novo; os que não forem encontrados ficam pendentes.</span></div>
        <div class="linha"><button class="btn pri" data-act="usar-texto">Usar este texto</button><button class="btn" data-act="cancelar-texto">Cancelar</button></div>`
    : `<div class="campo"><span class="rot">Texto do parecer</span><div class="docver" tabindex="0">${esc(p.texto_parecer)}</div>
        <div class="linha"><span class="muted peq">${pl(palavras(p.texto_parecer), "palavra", "palavras")}, contadas do texto</span>${ro ? "" : `<button class="btn p" data-act="editar-texto">Editar texto</button>`}</div></div>`;
  return `<div class="g2">
    <div class="ficha pilha"><h2>Identificação</h2>
      <div class="campo"><span class="rot">Código do parecer</span><div class="fixo">${esc(id.codigo_parecer)}</div><span class="dica">Definido na criação. Não muda.</span></div>
      ${ident}</div>
    <div class="ficha pilha">${texto}
      <label class="chk"><input type="checkbox" id="anon"${id.anonimizado ? " checked" : ""}${ro ? " disabled" : ""}><span>Confirmo que o texto está anonimizado: sem nome de criança, familiar, professor ou escola.</span></label>
      <div class="linha"><button class="btn pri" id="b-continuar" data-act="passo" data-v="cod"${p.texto_parecer.trim() ? "" : " disabled"}>Continuar para a codificação</button></div></div>
  </div>`;
}

/* ----- passo 2: codificação ----- */
function htmlCod(p, ro) {
  if (!p.texto_parecer) return `<div class="ficha pilha"><p>Cole o texto do parecer na etapa 1 para começar a codificar.</p><div><button class="btn pri" data-act="passo" data-v="doc">Ir para a etapa 1</button></div></div>`;
  return `<div class="cod2">
    <section class="fonte" aria-label="Texto do parecer">
      <div class="leg"><span>Dimensão</span>${DIMS.map(d => `<span class="${d.c}"><i class="pt"></i>${d.c}</span>`).join("")}
        <span>Apoio</span><span><i class="am n0"></i>sem lastro</span><span><i class="am n1"></i>traço</span><span><i class="am n2"></i>lastro</span><span id="cobertura"></span></div>
      <div class="texto" id="texto" tabindex="0"></div>
      ${ro ? "" : `<div class="selbar"><span id="selinfo" class="muted">Selecione um trecho do texto para codificar.</span>
        <span class="linha"><button class="btn p" id="b-ajustar" data-act="ajustar" hidden>Ajustar o excerto aberto</button><button class="btn pri p" id="b-novo" data-act="novo-excerto" disabled>Codificar trecho</button></span></div>`}
    </section>
    <section aria-label="Excertos"><div class="tira" id="tira"></div><div id="editor"></div></section>
  </div>`;
}
function pintarCod() { pintarTexto(); pintarTira(); pintarEditor(); }
const CLASSE_NIVEL = { Ausencia: "n0", Traco: "n1", Lastro: "n2" };
function pintarTexto() {
  const el = $("#texto"), p = atual(); if (!el || !p) return;
  const t = p.texto_parecer, ex = ordenados(p).filter(e => e.ancora_ok); let h = "", pos = 0;
  ex.forEach(e => {
    if (e.inicio < pos) return;
    const n = numeroDe(p, e), nv = nivelDo(e), dim = e.dimensao_dominante;
    h += esc(t.slice(pos, e.inicio));
    h += `<mark class="${dim || "sd"} ${dim ? CLASSE_NIVEL[nv] : ""}${e.k === S.ex ? " at" : ""}" data-act="escolher" data-v="${esc(e.k)}" title="Excerto ${n}: ${dim ? dim + ", " : "sem dimensão, "}${ROT_NIVEL[nv].toLowerCase()}">${esc(t.slice(e.inicio, e.fim))}</mark>`;
    pos = e.fim;
  });
  h += esc(t.slice(pos));
  const topo = el.scrollTop; el.innerHTML = h; el.scrollTop = topo;
  const cob = $("#cobertura"); if (cob) cob.textContent = p.excertos.length ? `${Math.round(100 * resumoDoParecer(p).cobertura)}% do texto codificado` : "";
}
function pintarTira() {
  const el = $("#tira"), p = atual(); if (!el || !p) return;
  const ex = ordenados(p);
  el.innerHTML = ex.length ? ex.map((e, i) => {
    const err = alertasDe(p, e).some(a => a[0] === "e"), nv = nivelDo(e);
    return `<button class="exb ${e.dimensao_dominante}${err ? " err" : ""}" data-act="escolher" data-v="${esc(e.k)}" aria-current="${e.k === S.ex}" title="${esc(e.excerto_literal.slice(0, 100))}">
      <i class="gl ${nv}" aria-hidden="true"></i>${i + 1}${e.dimensao_dominante ? " " + e.dimensao_dominante : ""}${e.duvida ? " ?" : ""}<span class="sr">, ${ROT_NIVEL[nv]}</span></button>`;
  }).join("") : `<p class="muted">Nenhum excerto ainda. Selecione um trecho no texto e escolha Codificar trecho.</p>`;
}
function citacao(e) {
  const t = e.excerto_literal; let h = "", pos = 0;
  for (const a of indicadoresNo(t)) {
    if (a.i < pos) continue;
    h += esc(t.slice(pos, a.i)) + `<u title="Palavra indicadora de ${a.m}">${esc(t.slice(a.i, a.f))}</u>`; pos = a.f;
  }
  return h + esc(t.slice(pos));
}
function pintarEditor() {
  const el = $("#editor"), p = atual(); if (!el || !p) return;
  const e = p.excertos.find(x => x.k === S.ex);
  if (!e) { el.innerHTML = p.excertos.length ? `<div class="ficha muted">Escolha um excerto acima, ou clique num trecho marcado no texto.</div>` : ""; return; }
  const ro = !editavel(p), ex = ordenados(p), i = ex.indexOf(e), n = nAncoras(e), nv = nivelDo(e), sug = ro ? [] : marcasSugeridas(e), A = alertasDe(p, e);
  const ant = ex[i - 1], prox = ex[i + 1];
  const grupo = (rot, itens, f, idAjuda) => `<div class="sub"><span class="rot">${rot}</span><div class="chips" role="group" aria-label="${rot}">${itens.map(d =>
    chip({ act: "lista", f, v: d.c, on: e[f].includes(d.c), html: `<span class="cod">${d.c}</span>${esc(d.n)}`, title: d.d, ro })).join("")}</div>${ajuda(idAjuda, itens)}</div>`;
  el.innerHTML = `<div class="editor ${e.dimensao_dominante}">
    <blockquote class="lit">${ro ? esc(e.excerto_literal) : citacao(e)}</blockquote>
    <div class="exmeta"><span>Excerto ${i + 1} de ${ex.length}</span><span>${pl(palavras(e.excerto_literal), "palavra", "palavras")}</span>${!ro && sug.length ? `<span>As palavras sublinhadas são indicadores do Livro de Códigos.</span>` : ""}</div>

    <div class="q"><h3>De que fala?<small>uma dimensão dominante</small></h3>
      <div class="chips" role="group" aria-label="Dimensão dominante">${DIMS.map(d => chip({ act: "dim", v: d.c, on: e.dimensao_dominante === d.c, cls: "dim " + d.c, html: `<i class="pt"></i><span class="cod">${d.c}</span>${d.n}`, title: d.d, ro })).join("")}</div>
      ${e.dimensao_dominante && (!ro || e.dimensao_secundaria) ? `<div class="sub"><span class="dica">${ro ? "Dimensão secundária (não entra nas contagens)." : "Tocou também outra dimensão? Registre como secundária. Ela não entra nas contagens."}</span>
        <div class="chips" role="group" aria-label="Dimensão secundária">${DIMS.filter(d => d.c !== e.dimensao_dominante).map(d => chip({ act: "sec", v: d.c, on: e.dimensao_secundaria === d.c, html: `<span class="cod">${d.c}</span>${d.n}`, title: d.d, ro })).join("")}</div></div>` : ""}
      ${ajuda("dim", DIMS)}</div>

    <div class="q"><h3>Com que apoio?<small>marque o que o trecho diz; o nível é calculado</small></h3>
      <div class="ancoras" role="group" aria-label="Âncoras de observação">${ANCORAS.map(a => `<button type="button" class="anc${sug.includes(a.c) ? " sug" : ""}" data-act="marca" data-v="${a.c}" aria-pressed="${e.marcas.includes(a.c)}" title="${esc(a.d + " Indicadores: " + a.ind + ".")}"${ro ? " disabled" : ""}>
        <span class="cod">${a.c}${sug.includes(a.c) ? ", sugerida" : ""}</span><b>${a.n}</b><span class="p">${a.p}</span></button>`).join("")}</div>
      <div class="regua" role="img" aria-label="Nível do registro: ${ROT_NIVEL[nv]}">${NIVEIS.map((x, j) => `<div class="${x}${x === nv ? " on" : ""}"><b>${ROT_NIVEL[x]}</b><span>${["nenhuma âncora", "1 âncora", "2 ou mais"][j]}</span></div>`).join("")}</div>
      <p class="dica">${n ? "Menção com situação (MC)" : "Menção sem situação (MS)"}, ${pl(n, "âncora", "âncoras")} de 4.</p>
      <div class="chips">${chip({ act: "marca", v: ROTULO.c, on: temRotulo(e), cls: "alerta" + (sug.includes(ROTULO.c) ? " sug" : ""), html: `<span class="cod">M5</span>Rótulo: adjetivo que julga em vez de descrever${sug.includes(ROTULO.c) ? " (sugerida)" : ""}`, title: ROTULO.d, ro })}
        ${sug.length ? `<button class="btn p" data-act="aceitar-sug">Aceitar sugestões (${sug.join(", ")})</button>` : ""}</div>
      ${ajuda("anc", [...ANCORAS, ROTULO])}</div>

    <div class="q"><h3>Em diálogo com quê?<small>todos os presentes</small></h3>
      ${grupo("Direitos de Aprendizagem", DIREITOS, "direitos", "dir")}
      ${grupo("Campos de Experiência", CAMPOS, "campos", "cam")}
      ${grupo("Categorias matriz", MATRIZ, "categorias_matriz", "mat")}</div>

    <div class="q"><h3>Que sinais traz?<small>só quando aparecem</small></h3>
      ${EMERG.map(g => `<div class="sub"><span class="rot"><span class="cod">${g.c}</span> ${g.n}</span><div class="chips" role="group" aria-label="${g.n}">${g.niveis.map(x =>
        chip({ act: "emerg", f: g.f, v: x.v, on: e[g.f] === x.v, html: esc(x.n), title: x.d, ro })).join("")}${e[g.f] === NM ? `<span class="muted peq" style="align-self:center">não mencionado</span>` : ""}</div></div>`).join("")}
      ${ajuda("eme", EMERG.flatMap(g => g.niveis.map(x => ({ c: g.c, n: `${g.n}: ${x.n.toLowerCase()}`, d: x.d, ex: x.ex }))))}</div>

    <div class="q"><h3>Notas</h3>
      <textarea id="obs" rows="3" data-k="${esc(e.k)}" placeholder="Justificativa, dúvida, o que mais ajudar a conferir depois"${ro ? " disabled" : ""}>${esc(e.observacoes)}</textarea>
      <label class="chk"><input type="checkbox" id="duv"${e.duvida ? " checked" : ""}${ro ? " disabled" : ""}><span>Levar este excerto como dúvida para a orientação</span></label>
      <div class="alertas" id="alertas">${htmlAlertas(A)}</div></div>

    <div class="pe-ed"><div class="linha">
        <button class="btn p" id="b-ant" data-act="escolher" data-v="${ant ? esc(ant.k) : ""}"${ant ? "" : " disabled"}>Anterior</button>
        <button class="btn p" id="b-prox" data-act="escolher" data-v="${prox ? esc(prox.k) : ""}"${prox ? "" : " disabled"}>Próximo</button></div>
      ${ro ? "" : `<button class="btn p perigo" data-act="excluir-excerto">Excluir excerto</button>`}</div>
  </div>`;
}
function htmlAlertas(A) {
  return A.map(a => `<div class="al ${a[0]}"><b>${a[0] === "e" ? "Pendência" : a[0] === "w" ? "Alerta" : "Nota"}</b><span>${esc(a[1])}</span></div>`).join("");
}

/* ----- passo 3: fechamento ----- */
function htmlFec(p, ro) {
  const r = resumoDoParecer(p), f = p.fechamento, ex = ordenados(p), conf = conferencia(p), pronto = conf.every(c => c.ok);
  const lista = (v, base) => v.length ? v.map(c => `<span class="cod" title="${esc(base.find(x => x.c === c).n)}">${c}</span>`).join(", ") : `<span class="sim">nada ausente</span>`;
  const sinais = EMERG.map(g => { const x = r.em[g.c], n = x.n2 + x.n3; return `<tr><td><span class="cod">${g.c}</span> ${g.n}</td><td>${rotEmerg(g, r.emNivel[g.f])}</td><td class="num">${n ? pl(n, "excerto", "excertos") : ""}</td></tr>`; }).join("");
  return `<div class="fec">
    <div class="ficha"><h2>O que este parecer registra</h2><p class="dica">Calculado dos excertos. Nada aqui é digitado.</p>
      <div class="bloco"><h3>Com que apoio?</h3>${barraNiveis(r.niv)}${legendaNiveis()}
        <p>${r.tot ? `Nível predominante: <b>${ROT_PRED[r.pred]}</b>. ${r.pred === "Equilibrio" ? "Nenhum nível passa da metade dos excertos." : "Mais da metade dos excertos está neste nível."}` : "Ainda não há excertos."}
        ${r.tot ? ` Rótulo (M5) em ${pl(r.rot, "excerto", "excertos")}.` : ""}</p></div>
      <div class="bloco"><h3>De que fala?</h3><div class="rol"><table class="t"><thead><tr><th>Dimensão</th><th class="num">Excertos</th><th class="num">Sem lastro</th><th class="num">Traço</th><th class="num">Lastro</th></tr></thead><tbody>
        ${DIMS.map(d => { const x = r.porDim[d.c]; return `<tr><td><span class="cod">${d.c}</span> ${d.n}</td><td class="num">${x.total}</td><td class="num">${x.Ausencia}</td><td class="num">${x.Traco}</td><td class="num">${x.Lastro}</td></tr>`; }).join("")}</tbody></table></div></div>
      <div class="bloco"><h3>Não registrado neste parecer</h3><table class="t"><tbody>
        <tr><td>Dimensões</td><td>${lista(r.aus.dimensao, DIMS)}</td></tr><tr><td>Direitos de Aprendizagem</td><td>${lista(r.aus.direito, DIREITOS)}</td></tr>
        <tr><td>Campos de Experiência</td><td>${lista(r.aus.campo, CAMPOS)}</td></tr><tr><td>Categorias matriz</td><td>${lista(r.aus.matriz, MATRIZ)}</td></tr></tbody></table></div>
      <div class="bloco"><h3>Que sinais traz?</h3><table class="t"><tbody>${sinais}</tbody></table></div>
      <div class="bloco"><h3>Quanto do texto foi codificado</h3><p>${r.tot ? `${pl(r.tot, "excerto cobre", "excertos cobrem")} ${Math.round(100 * r.cobertura)}% das ${r.totPal} palavras do parecer.` : "Ainda não há excertos."}</p></div>
    </div>
    <div class="pilha">
      <div class="ficha pilha"><h2>O que só você pode dizer</h2>
        <div class="campo"><label for="rep">Excerto mais representativo</label>
          <select id="rep" class="inp"${ro ? " disabled" : ""}><option value="">Escolha um excerto</option>${ex.map((e, i) => `<option value="${esc(e.k)}"${f.excerto_representativo === e.k ? " selected" : ""}>${i + 1}. ${esc(e.excerto_literal.slice(0, 80))}${e.excerto_literal.length > 80 ? "…" : ""}</option>`).join("")}</select></div>
        <div class="campo"><label for="sint">Síntese em uma frase</label><textarea id="sint" rows="4" data-ff="sintese_uma_frase" placeholder="O que este parecer, no conjunto, revela"${ro ? " disabled" : ""}>${esc(f.sintese_uma_frase)}</textarea></div>
        <div class="campo"><label for="obsg">Observações sobre o documento</label><textarea id="obsg" rows="2" data-ff="observacoes_gerais" placeholder="Estrutura, formato, tipo de texto"${ro ? " disabled" : ""}>${esc(f.observacoes_gerais)}</textarea></div>
        <div class="campo"><label for="obsa">Observações sobre as ausências</label><textarea id="obsa" rows="2" data-ff="observacoes_ausencia" placeholder="Por que alguma ausência chama a atenção"${ro ? " disabled" : ""}>${esc(f.observacoes_ausencia)}</textarea></div>
      </div>
      <div class="ficha pilha"><h2>${ro ? "Registro" : "Finalizar"}</h2>
        ${ro ? "" : `<ul class="conf" id="conf">${htmlConf(conf)}</ul>
          <div class="linha"><button class="btn pri" id="b-finalizar" data-act="finalizar"${pronto ? "" : " disabled"}>${p.demo ? "Finalizar o exemplo" : "Finalizar parecer"}</button>
          <span class="dica" id="dicaFin">${pronto ? "O parecer recebe um número de registro e fica travado." : "Complete os itens marcados para liberar."}</span></div>`}
        <details class="nums" data-id="json"${ABERTOS.has("json") ? " open" : ""}><summary>Ver o JSON deste parecer</summary><pre class="json" id="previa">${ABERTOS.has("json") ? esc(JSON.stringify(p.registro || registroDe(p), null, 2)) : ""}</pre></details>
      </div>
    </div>
  </div>`;
}
function htmlConf(conf) {
  return conf.map(c => `<li><span class="s ${c.ok ? "sim" : "nao"}">${c.ok ? "✓" : "✗"}</span><span>${esc(c.t)}${c.ok || c.passo === "fec" ? "" : ` <button class="btn leve p" data-act="passo" data-v="${c.passo}">resolver</button>`}</span></li>`).join("");
}
/* Atualiza a conferência do fechamento sem redesenhar os campos em que a pessoa está digitando */
function pintarConf() {
  const p = atual(), el = $("#conf"); if (!p || !el) return;
  const conf = conferencia(p), pronto = conf.every(c => c.ok);
  el.innerHTML = htmlConf(conf);
  const b = $("#b-finalizar"); if (b) b.disabled = !pronto;
  const d = $("#dicaFin"); if (d) d.textContent = pronto ? "O parecer recebe um número de registro e fica travado." : "Complete os itens marcados para liberar.";
  const pr = $("#previa"); if (pr && ABERTOS.has("json")) pr.textContent = JSON.stringify(registroDe(p), null, 2);
}
