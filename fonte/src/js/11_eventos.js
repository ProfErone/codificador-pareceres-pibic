/* ---------- ações ---------- */
function intervaloSelecionado() {
  const box = $("#texto"), p = atual(); if (!box || !p) return null;
  const s = window.getSelection(); if (!s || !s.rangeCount || s.isCollapsed) return null;
  const r = s.getRangeAt(0); if (!box.contains(r.startContainer) || !box.contains(r.endContainer)) return null;
  const pre = document.createRange(); pre.selectNodeContents(box); pre.setEnd(r.startContainer, r.startOffset);
  const t = p.texto_parecer; let i = pre.toString().length, f = i + r.toString().length;
  while (i < f && /\s/.test(t[i])) i++;
  while (f > i && /\s/.test(t[f - 1])) f--;
  if (f <= i) return null;
  while (i > 0 && ehLetra(t[i - 1]) && ehLetra(t[i])) i--;               // completa a palavra à esquerda
  while (f < t.length && ehLetra(t[f]) && ehLetra(t[f - 1])) f++;         // e à direita
  return { inicio: i, fim: f };
}
const limparSelecao = () => { try { window.getSelection().removeAllRanges(); } catch (e) { /* sem seleção */ } };
const selecaoRecente = () => S.selPend || (S.selUlt && Date.now() - S.selUlt.t < 1500 ? S.selUlt.r : null);

/* Depois de mudar um excerto: guarda e redesenha só o necessário */
function mudouExcerto(p) {
  store.guardar(p);
  comFoco(() => { pintarTexto(); pintarTira(); pintarEditor(); });
  pintarCab(); desenharLista();
}
function abrirParecer(chave, passo) {
  S.sel = chave; S.editTexto = false; S.selPend = null;
  const p = atual();
  S.ex = p && p.excertos.length ? ordenados(p)[0].k : null;
  S.passo = passo || (p && p.texto_parecer ? "cod" : "doc");
  if (S.vista !== "pareceres") { S.vista = "pareceres"; try { if (location.hash && location.hash !== "#pareceres") location.hash = "#pareceres"; } catch (e) { /* sem rota */ } desenhar(); } else { desenharLista(); desenharFolha(); }
  aoTopoDaFolha();
}
function validaCodigo(v) {
  const c = String(v).trim().toUpperCase();
  if (!c) return { ok: false, msg: "Use o código dado pela Secretaria: P seguido de dois dígitos, como P07." };
  if (!/^P\d{2,3}$/.test(c)) return { ok: false, erro: true, msg: "O código é P seguido de dois dígitos, como P07." };
  const ja = codigoEmUso(c);
  if (ja) return { ok: false, erro: true, msg: `${c} já existe (${ja.status === "finalizado" ? "finalizado como " + ja.id_registro : "em rascunho"}). Para corrigir um parecer finalizado, abra-o e escolha Corrigir em nova versão.` };
  return { ok: true, c, msg: "Código disponível." };
}

/* O que a importação fez, em frases: o que entrou, o que já estava, o que mudou de número e o que ficou de fora */
function relatoImportacao(r) {
  const f = [`${pl(r.novos, "parecer importado", "pareceres importados")}${r.historico ? `, com ${pl(r.historico, "versão anterior no histórico", "versões anteriores no histórico")}` : ""}.`];
  if (r.repetidos) f.push(`${pl(r.repetidos, "item já estava aqui e ficou como estava", "itens já estavam aqui e ficaram como estavam")}: nada é gravado por cima.`);
  if (r.renumerados.length) {
    const t = r.renumerados, mostra = t.slice(0, 8).map(x => `${esc(x.codigo)}, de ${esc(x.de)} para ${esc(x.para)}`).join("; ");
    f.push(`${pl(t.length, "registro recebeu novo número, porque o número de origem já estava em uso aqui", "registros receberam novo número, porque o número de origem já estava em uso aqui")}: ${mostra}${t.length > 8 ? `; e mais ${t.length - 8}` : ""}. O número de origem fica guardado no registro.`);
  }
  if (r.conflitos.length) f.push(`<span class="nao">Não importado: ${r.conflitos.map(esc).join(", ")}.</span> ${r.conflitos.length > 1 ? "Esses códigos já têm parecer aqui" : "Esse código já tem parecer aqui"}, e o Codificador não escolhe entre duas codificações. Para trocar a de um parecer finalizado, use Corrigir em nova versão.`);
  if (r.alterados) f.push(`<span class="nao">${pl(r.alterados, "registro recusado", "registros recusados")}: o conteúdo foi alterado depois de gerado.</span>`);
  if (r.exemplos) f.push("O parecer de exemplo não é importado.");
  if (r.estranhos) f.push(`${pl(r.estranhos, "arquivo não reconhecido", "arquivos não reconhecidos")}.`);
  return f.map(x => `<p>${x}</p>`).join("");
}

const ACOES = {
  /* ----- janelas ----- */
  fechar() { fecharModal(); },
  "fechar-fundo"(el, ev) { if (ev.target === el) fecharModal(); },
  async "copiar-modal"() { const t = $("#copiaTxt"); if (!t) return; if (!(await copiarTexto(t.value))) { t.focus(); t.select(); avisar("Selecionei o texto: use Ctrl+C para copiar."); } },

  /* ----- pareceres ----- */
  novo() {
    abrirModal(`<h2 id="mTit">Novo parecer</h2>
      <div class="campo"><label for="ncod">Código do parecer</label><input id="ncod" class="inp" autocomplete="off" maxlength="5" placeholder="P01" style="font-weight:700;max-width:160px">
      <span class="dica" id="nmsg" aria-live="polite">Use o código dado pela Secretaria: P seguido de dois dígitos, como P07.</span></div>
      <div class="acoes"><button class="btn" data-act="fechar">Cancelar</button><button class="btn pri" data-act="criar" id="b-criar" disabled>Criar parecer</button></div>`);
  },
  async criar() {
    const r = validaCodigo($("#ncod").value); if (!r.ok) return;
    const p = novoParecer(r.c); S.P[p.key] = p; fecharModal(); await store.gravarJa(p); desenharTopo(); abrirParecer(p.key, "doc");
  },
  abrir(el) { abrirParecer(el.dataset.k); },
  exemplo() { carregarExemplo(); },
  async "exemplo-refazer"() { for (const d of todos().filter(x => x.demo)) await excluir(d); carregarExemplo(); avisar("Exemplo restaurado."); },
  async "exemplo-remover"() { for (const d of todos().filter(x => x.demo)) await excluir(d); S.sel = null; S.ex = null; desenhar(); avisar("Exemplo removido. Para abri-lo de novo, vá em Método."); },
  "excluir-parecer"() {
    const p = atual(); if (!p || !editavel(p) || p.demo) return;
    abrirModal(`<h2 id="mTit">Excluir o rascunho ${esc(p.identificacao.codigo_parecer)}?</h2>
      <p>${p.excertos.length ? `${pl(p.excertos.length, "excerto codificado será apagado", "excertos codificados serão apagados")}. ` : ""}Esta ação não pode ser desfeita.${p.substitui ? ` A versão finalizada ${esc(p.substitui)} continua valendo.` : ""}</p>
      <div class="acoes"><button class="btn pri" data-act="fechar">Manter o rascunho</button><button class="btn perigo" data-act="excluir-parecer-ok">Excluir rascunho</button></div>`);
  },
  async "excluir-parecer-ok"() { const p = atual(); fecharModal(); if (!p || !editavel(p)) return; await excluir(p); S.sel = null; S.ex = null; desenhar(); avisar("Rascunho excluído."); },
  passo(el) {
    const p = atual();
    if (editavel(p) && !p.excertos.length && p.texto_parecer !== p.texto_parecer.trim()) { p.texto_parecer = p.texto_parecer.trim(); store.guardar(p); }
    S.passo = el.dataset.v; S.editTexto = false; S.textoPendente = null; S.selPend = null; desenharFolha(); aoTopoDaFolha();
  },

  /* ----- etapa 1 ----- */
  ident(el) {
    const p = atual(); if (!editavel(p)) return; const f = el.dataset.f, v = el.dataset.v;
    p.identificacao[f] = p.identificacao[f] === v ? "" : v; store.guardar(p);
    el.closest(".chips").querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", String(p.identificacao[f] === c.dataset.v)));   // sem redesenhar: o texto em digitação fica onde está
    pintarCab();
  },
  "usar-texto"() {
    const p = atual(), t = $("#txt"); if (!editavel(p) || !t) return;
    const v = t.value.replace(/\r\n?/g, "\n").trim(); if (!v) { avisar("Cole o texto do parecer."); return; }
    p.texto_parecer = v; relocalizar(p); S.editTexto = false; S.textoPendente = null; store.guardar(p); desenharLista(); desenharFolha();
    const perdidos = p.excertos.filter(e => !e.ancora_ok).length; if (perdidos) avisar(`${pl(perdidos, "excerto não foi localizado", "excertos não foram localizados")} no novo texto. Veja as pendências na etapa 2.`, 6000);
  },
  "editar-texto"() { S.editTexto = true; S.textoPendente = null; pintarArea(); const t = $("#txt"); if (t) t.focus(); },
  "cancelar-texto"() { S.editTexto = false; S.textoPendente = null; pintarArea(); },

  /* ----- etapa 2 ----- */
  escolher(el) {
    const p = atual(); if (!p || !el.dataset.v) return;
    if (el.tagName === "MARK" && intervaloSelecionado()) return;          // a pessoa está selecionando dentro de um trecho marcado
    S.ex = el.dataset.v; comFoco(pintarCod);
    if (window.innerWidth < 1040 && el.tagName !== "BUTTON") { const ed = $("#editor"); if (ed) ed.scrollIntoView({ block: "start" }); }
  },
  "novo-excerto"() {
    const p = atual(), r = selecaoRecente(); if (!editavel(p) || !r) return;
    const rival = p.excertos.find(e => e.ancora_ok && r.inicio < e.fim && r.fim > e.inicio);
    if (rival) { S.ex = rival.k; pintarCod(); avisar(`Esse trecho se sobrepõe ao excerto ${numeroDe(p, rival)}. Cada pedaço do texto pertence a um só excerto: ajuste a seleção, ou abra o excerto e use Ajustar.`, 6500); return; }
    const e = novoExcerto(r.inicio, r.fim, p.texto_parecer.slice(r.inicio, r.fim));
    p.excertos.push(e); S.ex = e.k; S.selPend = null; S.selUlt = null; limparSelecao();
    mudouExcerto(p);
    const alvo = $("#editor .chip.dim"); if (alvo) { try { alvo.focus({ preventScroll: window.innerWidth >= 1040 }); } catch (x) { /* sem foco */ } }
  },
  ajustar() {
    const p = atual(), r = selecaoRecente(), e = p && p.excertos.find(x => x.k === S.ex); if (!editavel(p) || !r || !e) return;
    const rival = p.excertos.find(x => x !== e && x.ancora_ok && r.inicio < x.fim && r.fim > x.inicio);
    if (rival) { avisar(`A nova seleção se sobrepõe ao excerto ${numeroDe(p, rival)}.`, 5000); return; }
    e.inicio = r.inicio; e.fim = r.fim; e.excerto_literal = p.texto_parecer.slice(r.inicio, r.fim); e.ancora_ok = true;
    S.selPend = null; S.selUlt = null; limparSelecao(); mudouExcerto(p); avisar("Excerto ajustado para a nova seleção.");
  },
  "excluir-excerto"(el) {
    const p = atual(), e = p && p.excertos.find(x => x.k === S.ex); if (!editavel(p) || !e) return;
    if (el.dataset.certo !== "1") { el.dataset.certo = "1"; el.textContent = "Confirmar exclusão"; setTimeout(() => { if (el.isConnected) { el.dataset.certo = ""; el.textContent = "Excluir excerto"; } }, 3500); return; }
    const ex = ordenados(p), i = ex.indexOf(e), viz = ex[i + 1] || ex[i - 1];
    p.excertos = p.excertos.filter(x => x !== e);
    if (p.fechamento.excerto_representativo === e.k) p.fechamento.excerto_representativo = "";
    S.ex = viz ? viz.k : null; mudouExcerto(p);
  },
  dim(el) { const p = atual(), e = p && p.excertos.find(x => x.k === S.ex); if (!editavel(p) || !e) return; const v = el.dataset.v; e.dimensao_dominante = e.dimensao_dominante === v ? "" : v; if (e.dimensao_secundaria === e.dimensao_dominante || !e.dimensao_dominante) e.dimensao_secundaria = ""; mudouExcerto(p); },
  sec(el) { const p = atual(), e = p && p.excertos.find(x => x.k === S.ex); if (!editavel(p) || !e) return; const v = el.dataset.v; e.dimensao_secundaria = e.dimensao_secundaria === v ? "" : v; mudouExcerto(p); },
  marca(el) { const p = atual(), e = p && p.excertos.find(x => x.k === S.ex); if (!editavel(p) || !e) return; const v = el.dataset.v, i = e.marcas.indexOf(v); if (i >= 0) e.marcas.splice(i, 1); else e.marcas.push(v); mudouExcerto(p); },
  "aceitar-sug"() { const p = atual(), e = p && p.excertos.find(x => x.k === S.ex); if (!editavel(p) || !e) return; marcasSugeridas(e).forEach(m => e.marcas.push(m)); mudouExcerto(p); },
  lista(el) { const p = atual(), e = p && p.excertos.find(x => x.k === S.ex); if (!editavel(p) || !e) return; const a = e[el.dataset.f], v = el.dataset.v, i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); mudouExcerto(p); },
  emerg(el) { const p = atual(), e = p && p.excertos.find(x => x.k === S.ex); if (!editavel(p) || !e) return; const f = el.dataset.f, v = el.dataset.v; e[f] = e[f] === v ? NM : v; mudouExcerto(p); },

  /* ----- etapa 3 e registro ----- */
  finalizar() {
    const p = atual(); if (!editavel(p) || !conferencia(p).every(c => c.ok)) return;
    const al = p.excertos.reduce((a, e) => a + alertasDe(p, e).filter(x => x[0] === "w").length, 0), duv = p.excertos.filter(e => e.duvida).length;
    abrirModal(`<h2 id="mTit">Finalizar ${esc(p.identificacao.codigo_parecer)}?</h2>
      <p>${p.demo ? "O exemplo fica travado, como ficará cada parecer real." : "O parecer recebe o próximo número de registro e fica travado."} Para corrigir depois, você cria uma nova versão, com outro número. Esta não é apagada.</p>
      ${al || duv ? `<p class="dica">${[al ? pl(al, "alerta", "alertas") + " nos excertos" : "", duv ? pl(duv, "excerto marcado", "excertos marcados") + " como dúvida" : ""].filter(Boolean).join(" e ")}. Isso não impede a finalização e fica registrado no JSON.</p>` : ""}
      <div class="acoes"><button class="btn" data-act="fechar">Voltar</button><button class="btn pri" data-act="finalizar-ok">Finalizar parecer</button></div>`);
  },
  async "finalizar-ok"() {
    const p = atual(); fecharModal(); if (!editavel(p) || !conferencia(p).every(c => c.ok)) return;
    const outro = outroAtivoComCodigo(p);
    if (outro) { avisar(`Há outro parecer com o código ${p.identificacao.codigo_parecer} (${outro.status === "finalizado" ? outro.id_registro : "em rascunho"}). Um código, um parecer: exclua um dos rascunhos antes de finalizar.`, 9000); return; }
    await finalizar(p); desenhar();
    abrirModal(`<h2 id="mTit">${esc(p.identificacao.codigo_parecer)} finalizado como ${esc(p.id_registro)}</h2>
      <p>${p.demo ? "O exemplo ficou travado, como ficará cada parecer real. O JSON mostra o formato do registro." : "O registro está travado. " + (store.modo === "conta" ? "Baixe o JSON agora ou depois: todos entram no ZIP final." : "Baixe o JSON agora: neste navegador, o arquivo é a cópia segura do parecer.")}</p>
      <div class="acoes"><button class="btn" data-act="fechar">Fechar</button>${!p.demo && store.modo !== "conta" ? `<button class="btn" data-act="backup">Fazer backup</button>` : ""}<button class="btn pri" data-act="baixar-json-modal">Baixar JSON</button></div>`);
  },
  async "baixar-json-modal"() { const p = atual(); fecharModal(); if (p) { await baixarJson(p); pintarCab(); } },
  async "baixar-json"() { const p = atual(); if (p) { await baixarJson(p); pintarCab(); } },
  corrigir() { const p = atual(); if (!p || p.status !== "finalizado" || p.demo) return; const n = novaVersao(p); desenharTopo(); abrirParecer(n.key, "cod"); avisar(`Versão ${n.versao} criada em rascunho. O registro ${p.id_registro} continua valendo até você finalizar esta.`, 6000); },

  /* ----- arquivos ----- */
  zip() {
    const f = finalizados().length, r = reais().filter(p => p.status === "rascunho").length;
    if (!f) { avisar("Ainda não há parecer finalizado para o ZIP."); return; }
    abrirModal(`<h2 id="mTit">Gerar o ZIP final</h2>
      <p><b>${f}</b> de ${APP.total} pareceres finalizados entram no arquivo.${r ? ` ${pl(r, "rascunho fica", "rascunhos ficam")} de fora.` : ""}</p>
      <p class="dica">O ZIP traz um JSON por parecer, as versões substituídas, o manifesto com os números de registro, três tabelas CSV para o Excel e uma ficha de leitura por parecer.</p>
      <div class="acoes"><button class="btn" data-act="fechar">Cancelar</button><button class="btn pri" data-act="zip-ok">Gerar e baixar o ZIP</button></div>`);
  },
  async "zip-ok"() { fecharModal(); await gerarZip(); },
  async backup() { if (!todos().some(p => !p.demo)) { avisar("Ainda não há pareceres para o backup."); return; } await fazerBackup(); },
  importar() { const i = $("#arqImportar"); if (i) i.click(); },

  /* ----- concordância ----- */
  "conc-arquivo"() { const i = $("#arqConc"); if (i) i.click(); },
  "conc-exemplo"() { const p = S.P[S.conc.chave]; if (!p) return; const B = segundaDeExemplo(p); S.conc = { chave: p.key, B, res: comparar(p, B), erro: "" }; desenhar(); },
  "ia-pedir"() {
    const p = S.P[S.conc.chave]; if (!p) return;
    abrirModal(`<h2 id="mTit">Pedir uma segunda leitura por IA?</h2>
      <p>O texto do parecer, que você confirmou estar anonimizado, e os trechos recortados são enviados ao Claude, na sua conta, para uma codificação independente. A sua codificação não muda: a leitura da IA aparece só nesta página, para comparação.</p>
      <p class="dica">Use como apoio à calibração. A decisão sobre cada código continua sendo humana, e o uso de IA deve constar na descrição do método.</p>
      <div class="acoes"><button class="btn" data-act="fechar">Cancelar</button><button class="btn pri" data-act="ia-ok">Pedir a segunda leitura</button></div>`);
  },
  async "ia-ok"() { const p = S.P[S.conc.chave]; fecharModal(); if (!p) return; const ok = await pedirLeituraIA(p); if (ok) { const B = segundaDaIA(p); S.conc = { chave: p.key, B, res: comparar(p, B), erro: "" }; } if (S.vista === "conc") desenhar(); },
  "ia-parar"() { if (S.ia.ctl) S.ia.ctl.abort(); },
  "ia-ver"() { const p = S.P[S.conc.chave], B = p && segundaDaIA(p); if (!B) return; S.conc = { chave: p.key, B, res: comparar(p, B), erro: "" }; desenhar(); },
  async "duvidas-copiar"() { const t = textoDasDuvidas(); if (t && !(await copiarTexto(t))) modalCopiar("duvidas.txt", t); },
  async "conc-copiar"() { const p = S.P[S.conc.chave]; if (!p || !S.conc.res) return; const t = pautaDeDivergencias(p, S.conc.res); if (!(await copiarTexto(t))) modalCopiar("divergencias.txt", t); }
};

/* ---------- escuta ---------- */
document.addEventListener("click", async ev => {
  const nav = ev.target.closest(".vistas a");
  if (nav) { S.vista = nav.dataset.vista; desenhar(); aoTopo(); return; }
  const el = ev.target.closest("[data-act]"); if (!el || el.disabled) return;
  const fn = ACOES[el.dataset.act]; if (!fn) return;
  try { await fn(el, ev); }
  catch (e) { console.error(e); avisar("Algo não funcionou nesta ação. Seus dados estão salvos; recarregue a página se o problema continuar.", 7000); }
});
document.addEventListener("change", async ev => {
  const t = ev.target, p = atual();
  try {
    if (t.id === "arqImportar") {
      const arqs = [...t.files]; t.value = ""; if (!arqs.length) return;
      avisar("Importando. Aguarde um instante.", 120000);
      let r; try { r = await importar(arqs); } finally { clearTimeout(avisar.t); const q = $("#avisoRaiz"); if (q) q.innerHTML = ""; }
      desenhar();
      abrirModal(`<h2 id="mTit">Importação concluída</h2>${relatoImportacao(r)}
        <div class="acoes"><button class="btn pri" data-act="fechar">Fechar</button></div>`);
      return;
    }
    if (t.id === "arqConc") {
      const arq = t.files[0], q = S.P[S.conc.chave]; t.value = ""; if (!arq || !q) return;
      try { const B = await segundaDeArquivo(q, arq); S.conc = { chave: q.key, B, res: comparar(q, B), erro: "" }; }
      catch (e) { S.conc = { chave: q.key, B: null, res: null, erro: e.message || "Não foi possível ler o arquivo." }; }
      desenhar(); return;
    }
    if (t.id === "concP") { S.conc = { chave: t.value, B: null, res: null, erro: "" }; desenhar(); return; }
    if (!editavel(p)) return;
    if (t.id === "anon") { p.identificacao.anonimizado = t.checked; store.guardar(p); pintarCab(); return; }
    if (t.id === "duv") { const e = p.excertos.find(x => x.k === S.ex); if (e) { e.duvida = t.checked; mudouExcerto(p); } return; }
    if (t.id === "rep") { p.fechamento.excerto_representativo = t.value; store.guardar(p); pintarConf(); pintarCab(); }
  } catch (e) { console.error(e); avisar("Algo não funcionou nesta ação. Recarregue a página se o problema continuar.", 7000); }
});
document.addEventListener("input", ev => {
  const t = ev.target;
  if (t.id === "filtro") { S.filtro = t.value; desenharLista(); return; }
  if (t.id === "ncod") { const r = validaCodigo(t.value), m = $("#nmsg"); m.textContent = r.msg; m.className = "dica " + (r.ok ? "sim" : r.erro ? "nao" : ""); $("#b-criar").disabled = !r.ok; return; }
  const p = atual(); if (!editavel(p)) return;
  if (t.id === "txt") {
    if (t.dataset.vivo && !p.excertos.length) {
      p.texto_parecer = t.value.replace(/\r\n?/g, "\n"); store.guardar(p);
      const c = $("#contagem"); if (c) c.textContent = pl(palavras(p.texto_parecer), "palavra", "palavras");
      const b = $("#b-continuar"); if (b) b.disabled = !p.texto_parecer.trim();
      pintarCab();
    } else S.textoPendente = t.value;
    return;
  }
  if (t.id === "obs") { const e = p.excertos.find(x => x.k === t.dataset.k); if (e) { e.observacoes = t.value; store.guardar(p); const a = $("#alertas"); if (a) a.innerHTML = htmlAlertas(alertasDe(p, e)); } return; }
  if (t.dataset.ff) { p.fechamento[t.dataset.ff] = t.value; store.guardar(p); pintarConf(); pintarCab(); }
});
document.addEventListener("keydown", ev => {
  if (ev.key === "Escape" && $("#modalRaiz").innerHTML) { fecharModal(); return; }
  if (ev.key === "Enter" && ev.target.id === "ncod") { ev.preventDefault(); const b = $("#b-criar"); if (b && !b.disabled) b.click(); }
});
/* seleção no texto do parecer */
document.addEventListener("mousedown", ev => { if (ev.target.closest("#b-novo, #b-ajustar")) ev.preventDefault(); });
document.addEventListener("selectionchange", () => {
  const info = $("#selinfo"), b = $("#b-novo"), aj = $("#b-ajustar"), p = atual(); if (!info || !b || !p) return;
  const r = intervaloSelecionado(); S.selPend = r;
  if (r) {
    S.selUlt = { r, t: Date.now() };
    info.textContent = `Trecho selecionado: ${pl(palavras(p.texto_parecer.slice(r.inicio, r.fim)), "palavra", "palavras")}.`; info.className = "";
    b.disabled = false; if (aj) aj.hidden = !p.excertos.some(e => e.k === S.ex);
  } else {
    clearTimeout(S.selRel);
    S.selRel = setTimeout(() => {
      if (intervaloSelecionado() || !info.isConnected) return;
      info.textContent = "Selecione um trecho do texto para codificar."; info.className = "muted"; b.disabled = true; if (aj) aj.hidden = true;
    }, 600);
  }
});
/* blocos que abrem e fecham: lembrar o estado e preencher a prévia do JSON só quando aberta */
document.addEventListener("toggle", ev => {
  const d = ev.target; if (!d || !d.dataset || !d.dataset.id) return;
  if (d.open) ABERTOS.add(d.dataset.id); else ABERTOS.delete(d.dataset.id);
  if (d.dataset.id === "json" && d.open) { const p = atual(), pr = $("#previa"); if (p && pr) pr.textContent = JSON.stringify(p.registro || registroDe(p), null, 2); }
}, true);
/* dicas dos gráficos */
document.addEventListener("pointerover", ev => { const el = ev.target.closest && ev.target.closest("[data-dica]"); if (el) mostrarDica(el); });
document.addEventListener("pointerout", ev => { if (ev.target.closest && ev.target.closest("[data-dica]")) esconderDica(); });
document.addEventListener("focusin", ev => { const el = ev.target.closest && ev.target.closest("[data-dica]"); if (el) mostrarDica(el); });
document.addEventListener("focusout", esconderDica);
/* rotas e volta à aba */
const ROTAS = { pareceres: "pareceres", painel: "painel", concordancia: "conc", metodo: "metodo" };
function lerRota() { const h = (location.hash || "").replace(/^#/, ""); if (ROTAS[h]) { S.vista = ROTAS[h]; return true; } return false; }
window.addEventListener("hashchange", () => { const antes = S.vista; if (lerRota() && S.vista !== antes) { desenhar(); aoTopo(); } });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") store.ressincronizar(); });
window.addEventListener("online", () => store.ressincronizar());
/* outra aba deste navegador gravou algo: acompanha, sem passar por cima do que está em edição aqui */
window.addEventListener("storage", ev => {
  if (!S.pronto || !ev.key || !ev.key.startsWith(PREFIXO_LS) || !ev.newValue) return;
  let v; try { v = JSON.parse(ev.newValue); } catch (e) { return; }
  if (ev.key === PREFIXO_LS + "meta") { S.meta.contador = Math.max(S.meta.contador || 0, v.contador || 0); return; }
  if (!v || !v.key || store.relogios[v.key]) return;
  const l = S.P[v.key];
  if (l && (l.atualizado_em || "") >= (v.atualizado_em || "")) return;
  S.P[v.key] = aoAbrir(v);
  clearTimeout(S.relAba); S.relAba = setTimeout(() => { if (!$("#modalRaiz").innerHTML) desenhar(); }, 250);
});
