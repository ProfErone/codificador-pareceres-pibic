(() => {
  const KEY = "__mockdb";
  const load = () => JSON.parse(localStorage.getItem(KEY) || "{}");
  const save = o => localStorage.setItem(KEY, JSON.stringify(o));
  const cp = o => JSON.parse(JSON.stringify(o));
  const flag = k => localStorage.getItem("__flag_" + k) === "1";
  const docRef = path => {
    if (path.split("/").length % 2) throw new TypeError("doc path parity: " + path);
    return { id: path.split("/").pop(), path,
      async get() { const o = load(); return { id: path.split("/").pop(), exists: path in o, data: () => path in o ? cp(o[path]) : undefined, metadata: { fromCache: false, hasPendingWrites: false } }; },
      async set(d) { if (flag("ro")) throw { code: "invalid_argument", message: "somente leitura" }; if (typeof d !== "object" || Array.isArray(d)) throw { code: "invalid_argument" }; const txt = JSON.stringify(d); if (txt.length > 256 * 1024) throw { code: "invalid_argument", message: "grande" }; const o = load(); o[path] = JSON.parse(txt); save(o); window.__writes = (window.__writes || 0) + 1; },
      async delete() { const o = load(); delete o[path]; save(o); },
      collection(n) { return colRef(path + "/" + n); } };
  };
  const colRef = path => {
    if (path.split("/").length % 2 === 0) throw new TypeError("collection path parity: " + path);
    return { path, doc(id) { return docRef(path + "/" + (id || Math.random().toString(36).slice(2))); },
      async get() { const o = load(); const docs = Object.keys(o).filter(k => k.startsWith(path + "/") && !k.slice(path.length + 1).includes("/")).map(k => ({ id: k.split("/").pop(), exists: true, data: () => cp(o[k]) })); return { docs, size: docs.length, empty: !docs.length }; } };
  };
  const db = { doc: docRef, collection: colRef };
  const user = { id: async () => flag("semid") ? null : "u_teste" };
  const downloads = { save: async ({ filename, data }) => {
    if (flag("recusa")) throw { code: "declined", message: "não" };
    let u; if (typeof data === "string") u = new TextEncoder().encode(data); else u = new Uint8Array(await new Response(data).arrayBuffer());
    let s = ""; u.forEach(x => s += String.fromCharCode(x)); (window.__files = window.__files || []).push({ filename, b64: btoa(s) }); return { status: "saved" }; } };
  const sample = Object.assign(async () => ({ text: "x", truncated: false }), { json: async (input, opts) => {
    window.__prompt = input; if (flag("iaerro")) throw { code: "rate_limited", message: "limite" };
    const n = (input.match(/^\d+\. «/gm) || []).length; const out = [];
    for (let i = 1; i <= n; i++) out.push({ n: i, dimensao: i === 1 ? "DMC" : "DML", marcas: i % 2 ? ["M1", "M4", "M9"] : [], direitos: ["DExpr", "XX"], campos: [], matriz: [], esp: i === 2 ? 3 : 0, blg: 0, acu: 0, motivo: "teste " + i });
    return out; } });
  const caps = { db, user, downloads, sample };
  window.claude = { use: async name => { if (flag("lento")) await new Promise(r => setTimeout(r, 6600)); return flag("sem_" + name) ? null : (caps[name] ?? null); } };
  if (flag("hotmudo")) window.claude.hot = { ready() {}, snapshot() {} };
})();
