/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const agora = () => new Date().toISOString();
/* Carimbo de alteração: a hora de agora, mas sempre depois do carimbo anterior. Assim uma alteração feita aqui nunca perde
   para a cópia que ela alterou, mesmo que o relógio de outro aparelho esteja adiantado. */
const depoisDe = antes => { const a = agora(); return antes && antes >= a ? new Date(Date.parse(antes) + 1).toISOString() : a; };
const palavras = t => (String(t || "").trim().match(/\S+/g) || []).length;
const copia = o => JSON.parse(JSON.stringify(o));
const zeros = (n, w = 2) => String(n).padStart(w, "0");
const pl = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const pctTxt = (a, b) => b ? pct(a, b) + "%" : "—";
const dataHora = iso => { try { return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); } catch (e) { return iso || ""; } };
const carimbo = () => { const d = new Date(); return `${d.getFullYear()}${zeros(d.getMonth() + 1)}${zeros(d.getDate())}`; };
const ehLetra = ch => !!ch && /[\p{L}\p{N}]/u.test(ch);
const comLimite = (p, ms) => Promise.race([Promise.resolve(p), new Promise((_, rej) => setTimeout(() => rej({ code: "tempo_esgotado" }), ms))]);
const ordenaCodigo = (a, b) => String(a).localeCompare(String(b), "pt", { numeric: true });

function avisar(msg, ms = 3600) {
  const r = $("#avisoRaiz"); if (!r) return;
  r.innerHTML = `<div class="aviso-flutuante" role="status">${esc(msg)}</div>`;
  clearTimeout(avisar.t); avisar.t = setTimeout(() => { r.innerHTML = ""; }, ms);
}

/* Capacidades da plataforma (armazenamento na conta, download, segunda leitura).
   Cada uma pode faltar: a página funciona sem elas. */
const CAP = {};
function capacidade(nome) {
  if (!(nome in CAP)) {
    CAP[nome] = (window.claude && typeof window.claude.use === "function")
      ? comLimite(window.claude.use(nome), 10500).catch(() => null)
      : Promise.resolve(null);
  }
  return CAP[nome];
}

/* SHA-256 em hexadecimal; se o navegador não oferecer, usa CRC-32 (mais fraco, mas detecta alteração acidental) */
async function resumoDe(texto) {
  const bytes = new TextEncoder().encode(texto);
  try {
    const b = await crypto.subtle.digest("SHA-256", bytes);
    return "sha256:" + [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
  } catch (e) {
    return "crc32:" + crc32(bytes).toString(16).padStart(8, "0");
  }
}
let TABELA_CRC = null;
function crc32(u8) {
  if (!TABELA_CRC) { TABELA_CRC = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; TABELA_CRC[n] = c >>> 0; } }
  let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = TABELA_CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
