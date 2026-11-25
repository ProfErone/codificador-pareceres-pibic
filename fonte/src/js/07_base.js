/* ---------- desenho: base ---------- */
const ABERTOS = new Set();          // blocos "ver definições" abertos, para sobreviver ao redesenho

function chip({ act, f = "", v = "", on = false, html, title = "", ro = false, cls = "" }) {
  return `<button type="button" class="chip ${cls}" data-act="${act}" data-f="${f}" data-v="${esc(v)}" aria-pressed="${on}"${title ? ` title="${esc(title)}"` : ""}${ro ? " disabled" : ""}>${html}</button>`;
}
function ajuda(id, itens) {
  return `<details class="ajuda" data-id="${id}"${ABERTOS.has(id) ? " open" : ""}><summary>Ver definições</summary><dl>${itens.map(x =>
    `<div><dt><span class="cod">${x.c}</span> ${esc(x.nome || x.n)}</dt><dd>${esc(x.d)}${x.ind ? ` <span class="muted">Indicadores: ${esc(x.ind)}.</span>` : ""}${x.ex ? ` <i>“${esc(x.ex)}”</i>` : ""}</dd></div>`).join("")}</dl></details>`;
}
function seloDe(p) {
  if (p.demo) return `<span class="selo demo">Exemplo</span>`;
  if (p.status === "finalizado") return `<span class="selo fin">${esc(p.id_registro)}</span>`;
  if (p.status === "substituido") return `<span class="selo hist">Substituído</span>`;
  return `<span class="selo rasc">Rascunho</span>`;
}
/* Barra segmentada dos três níveis do registro */
function barraNiveis(niv, fina = false) {
  const tot = NIVEIS.reduce((s, n) => s + (niv[n] || 0), 0);
  if (!tot) return `<div class="seg${fina ? " fina" : ""}" role="img" aria-label="Sem excertos"><span class="vz" style="flex:1"></span></div>`;
  const rot = NIVEIS.map(n => `${ROT_NIVEL[n]}: ${niv[n]} (${pct(niv[n], tot)}%)`).join("; ");
  return `<div class="seg${fina ? " fina" : ""}" role="img" aria-label="${rot}">` + NIVEIS.filter(n => niv[n] > 0).map(n => {
    const s = pct(niv[n], tot);
    return `<span class="${n}" style="flex:${niv[n]} 1 0"${fina ? "" : ' tabindex="0"'} data-dica="${ROT_NIVEL[n]}|${niv[n]} de ${pl(tot, "excerto", "excertos")} (${s}%)">${!fina && s >= 15 ? s + "%" : ""}</span>`;
  }).join("") + `</div>`;
}
const legendaNiveis = () => `<div class="legenda">${NIVEIS.map(n => `<span><i class="sw ${n}"></i>${ROT_NIVEL[n]}</span>`).join("")}</div>`;

/* ---------- moldura ---------- */
function desenhar() {
  desenharTopo();
  const c = $("#corpo");
  if (!S.pronto) { c.className = "corpo"; c.innerHTML = `<div class="carregando" role="status">Abrindo os pareceres…</div>`; return; }
  if (S.vista === "pareceres") {
    c.className = "corpo duas";
    c.innerHTML = `
      <aside class="lista" aria-label="Pareceres">
        <div class="topo"><button class="btn pri" data-act="novo">Novo parecer</button>
          <input id="filtro" placeholder="Filtrar por código" aria-label="Filtrar pareceres por código" value="${esc(S.filtro)}"></div>
        <div class="itens" id="itens"></div>
        <div class="pe"><button class="btn" data-act="zip">Gerar ZIP final</button><button class="btn" data-act="backup">Fazer backup</button><button class="btn" data-act="importar">Importar</button>
          <input type="file" id="arqImportar" accept=".json,application/json" multiple hidden></div>
      </aside>
      <main class="folha" id="folha"></main>`;
    desenharLista(); desenharFolha();
  } else {
    c.className = "corpo";
    c.innerHTML = S.vista === "painel" ? htmlPainel() : S.vista === "conc" ? htmlConcordancia() : htmlMetodo();
  }
}
function desenharTopo() {
  document.querySelectorAll(".vistas a").forEach(a => a.setAttribute("aria-current", a.dataset.vista === S.vista ? "page" : "false"));
  const f = finalizados().length, r = reais().filter(p => p.status === "rascunho").length;
  $("#prog").innerHTML = `<span class="trilho" aria-hidden="true"><i style="width:${Math.min(100, 100 * f / APP.total)}%"></i></span><b>${f}</b> de ${APP.total} finalizados${r ? `, ${r} em rascunho` : ""}`;
  pintarGuarda();
}
function pintarGuarda(pendente) {
  const el = $("#guarda"); if (!el) return;
  const hora = S.salvoEm ? " às " + S.salvoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
  if (!S.pronto) { el.className = "guarda"; el.textContent = "Conectando…"; el.title = ""; return; }
  if (store.modo === "conta") { el.className = "guarda conta"; el.textContent = pendente ? "Salvando…" : "Salvo na sua conta" + hora; el.title = "Os dados ficam na sua conta do Claude. Só você os vê."; }
  else if (store.modo === "local") { el.className = "guarda local"; el.textContent = pendente ? "Salvando…" : "Salvo só neste navegador" + hora; el.title = "Baixe o JSON de cada parecer finalizado e faça backup: limpar os dados do navegador apaga os pareceres."; }
  else { el.className = "guarda sem"; el.textContent = "Sem armazenamento: baixe cada JSON"; el.title = "Este navegador não permite salvar dados. O JSON de cada parecer é a única cópia."; }
}
function desenharLista() {
  const el = $("#itens"); if (!el) return;
  const q = S.filtro.trim().toUpperCase();
  const ps = todos().filter(p => !q || p.identificacao.codigo_parecer.toUpperCase().includes(q))
    .sort((a, b) => (a.demo - b.demo) || ordenaCodigo(a.identificacao.codigo_parecer, b.identificacao.codigo_parecer) || (a.versao - b.versao));
  el.innerHTML = ps.length ? ps.map(p => {
    const pend = p.status === "rascunho" ? pendenciasDe(p) : 0;
    const falta = p.status === "finalizado" && !p.demo && !p.json_baixado && store.modo !== "conta";
    return `<button class="item" data-act="abrir" data-k="${p.key}" aria-current="${p.key === S.sel}">
      <span class="c">${esc(p.identificacao.codigo_parecer)}${p.versao > 1 ? ` <small class="muted">v${p.versao}</small>` : ""}</span>${seloDe(p)}
      <span class="m">${pl(p.excertos.length, "excerto", "excertos")}${pend ? `, <span class="nao">${pl(pend, "pendência", "pendências")}</span>` : ""}${falta ? `, <span class="at">JSON não baixado</span>` : ""}</span></button>`;
  }).join("") : `<p class="muted peq" style="padding:10px">${q ? "Nenhum parecer com esse código." : "Nenhum parecer ainda."}</p>`;
}

/* Volta ao topo, seja qual for o elemento que rola (página inteira no celular, painel interno no computador) */
function aoTopo() { for (const s of ["#corpo", "#folha"]) { const el = $(s); if (el) el.scrollTop = 0; } try { window.scrollTo(0, 0); } catch (e) { /* sem rolagem */ } }

function aoTopoDaFolha() { const f = $("#folha"); if (f) f.scrollTop = 0; if (window.innerWidth <= 820) { const c = $("#cab"); if (c) c.scrollIntoView({ block: "start" }); } }

/* Redesenha mantendo o foco no mesmo controle */
function comFoco(fn) {
  const a = document.activeElement, d = a && a.dataset, id = a && a.id;
  const zona = a && a.closest ? a.closest("#tira, #editor, #area, #cab, #itens") : null, zonaId = zona && zona.id;
  const chave = d && d.act ? [d.act, d.f || "", d.v || ""] : null;
  fn();
  let alvo = id ? document.getElementById(id) : null;
  if (!alvo && chave) {
    const raiz = (zonaId && document.getElementById(zonaId)) || document;
    alvo = [...raiz.querySelectorAll(`[data-act="${chave[0]}"]`)].find(x => (x.dataset.f || "") === chave[1] && (x.dataset.v || "") === chave[2]);
  }
  if (alvo && alvo !== document.activeElement && !alvo.disabled) { try { alvo.focus({ preventScroll: true }); } catch (e) { /* sem foco */ } }
}

/* ---------- janelas ---------- */
let focoAntes = null;
function abrirModal(html, larga = false) {
  if (!$("#modalRaiz").innerHTML) focoAntes = document.activeElement;
  $("#modalRaiz").innerHTML = `<div class="fundo" data-act="fechar-fundo"><div class="modal${larga ? " larga" : ""}" role="dialog" aria-modal="true" aria-labelledby="mTit">${html}</div></div>`;
  const alvo = $("#modalRaiz input:not([type=hidden]), #modalRaiz textarea, #modalRaiz .btn.pri") || $("#modalRaiz .btn");
  if (alvo) { try { alvo.focus(); } catch (e) { /* sem foco */ } }
}
function fecharModal() {
  $("#modalRaiz").innerHTML = "";
  if (focoAntes && focoAntes.isConnected) { try { focoAntes.focus({ preventScroll: true }); } catch (e) { /* sem foco */ } }
  focoAntes = null;
}
function modalCopiar(nome, texto) {
  const zip = /\.zip$/.test(nome), alvo = nome.replace(/\.zip$/, ".json");
  abrirModal(`<h2 id="mTit">Copiar ${zip ? "o pacote de registros" : esc(nome)}</h2>
    <p>Esta visualização não entregou o arquivo. Copie o conteúdo abaixo e cole num arquivo de texto com o nome <b>${esc(alvo)}</b>.
    ${zip ? "O pacote traz os mesmos registros do ZIP. As tabelas e as fichas são refeitas ao importar o pacote num Codificador que permita baixar arquivos." : "O conteúdo é o mesmo do arquivo."}</p>
    <textarea class="copia" id="copiaTxt" readonly>${esc(texto)}</textarea>
    <div class="acoes"><button class="btn" data-act="fechar">Fechar</button><button class="btn pri" data-act="copiar-modal">Copiar tudo</button></div>`, true);
}
async function copiarTexto(texto) {
  try { await navigator.clipboard.writeText(texto); avisar("Copiado."); return true; }
  catch (e) { return false; }
}

/* ---------- dica ao passar o mouse ou focar (gráficos) ---------- */
function mostrarDica(el) {
  const [t, d] = (el.dataset.dica || "").split("|"); if (!t) return;
  const r = $("#dicaRaiz"); r.innerHTML = `<div class="dica-flutuante" role="tooltip"><b></b><br><span></span></div>`;
  const b = r.firstChild; b.querySelector("b").textContent = t; b.querySelector("span").textContent = d || "";
  const q = el.getBoundingClientRect(), w = b.offsetWidth, h = b.offsetHeight;
  b.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, q.left + q.width / 2 - w / 2)) + "px";
  b.style.top = (q.top - h - 8 < 8 ? q.bottom + 8 : q.top - h - 8) + "px";
}
const esconderDica = () => { const r = $("#dicaRaiz"); if (r) r.innerHTML = ""; };
