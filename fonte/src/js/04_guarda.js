/* ---------- armazenamento ----------
   1) Conta do Claude de quem codifica (área privada: nem o dono da página lê).
   2) Navegador (cópia local, uma chave por parecer).
   3) Se nada disso estiver disponível, a página avisa e o JSON de cada parecer passa a ser a única cópia. */
const ESPERA_CONTA = 6000;                                   // quanto esperar pela conta antes de seguir só com o navegador
const SEM_PERMISSAO = ["invalid_argument", "not_granted", "revoked"];
/* Conta, em uma frase, o que as leis de unicidade ajustaram ao reunir dados de dois aparelhos */
function avisarUnicidade(r) {
  const t = r.trocas || [], d = r.dup || [], f = [];
  if (t.length) f.push(`Número de registro repetido em outro aparelho: ${t.map(x => `${x.codigo} passou de ${x.de} para ${x.para}`).join("; ")}.`);
  if (d.length) f.push(`Código finalizado em dois aparelhos: ${d.map(x => `em ${x.codigo} vale ${x.vale}, e ${x.historico} foi para o histórico`).join("; ")}.`);
  if (f.length) avisar(f.join(" "), 12000);
}
const store = {
  modo: "local",                    // "conta" | "local" | "memoria"
  db: null, uid: null, lsOk: true, filas: {}, relogios: {}, ocupado: false,
  semConta: false,                  // true = esta visualização não dá acesso à conta; false = ainda pode responder (rede lenta)

  lsLer() {
    const out = { meta: null, P: {} };
    let n = 0;
    try { n = localStorage.length; } catch (e) { this.lsOk = false; return out; }
    try { const antigo = localStorage.getItem(CHAVE_LS_ANTIGA); if (antigo) { const o = JSON.parse(antigo); out.meta = o.meta || null; Object.assign(out.P, o.P || {}); } } catch (e) { /* formato antigo ilegível: ignora */ }
    const chaves = [];
    try { for (let i = 0; i < n; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIXO_LS)) chaves.push(k); } } catch (e) { this.lsOk = false; return out; }
    for (const k of chaves) {
      try {
        const v = JSON.parse(localStorage.getItem(k));
        if (k === PREFIXO_LS + "meta") out.meta = { ...(out.meta || {}), ...v };
        else if (k.startsWith(PREFIXO_LS + "p:") && v && v.key) out.P[v.key] = v;
      } catch (e) { /* uma chave ilegível não impede as outras */ }
    }
    return out;
  },
  lsGravar(p) {
    try { localStorage.setItem(PREFIXO_LS + "p:" + p.key, JSON.stringify(paraGuardar(p))); return true; }
    catch (e) { this.lsFalhou(); return false; }
  },
  lsGravarMeta() { try { localStorage.setItem(PREFIXO_LS + "meta", JSON.stringify({ contador: S.meta.contador, modelo: APP.modelo })); } catch (e) { this.lsFalhou(); } },
  lsFalhou() {
    if (!this.lsOk) return;
    this.lsOk = false;
    if (this.modo !== "conta") { this.modo = "memoria"; avisar("Este navegador não está salvando os dados. Baixe o JSON de cada parecer e faça um Backup.", 7000); }
    pintarGuarda();
  },

  refMeta() { return this.db.doc("data/users/" + this.uid + "/meta"); },
  col() { return this.refMeta().collection("pareceres"); },

  /* "sim" = conta alcançada · "nao" = esta visualização não oferece conta · "tarde" = não respondeu a tempo */
  async conectar() {
    let db, user, id;
    try { [db, user] = await Promise.all([comLimite(capacidade("db"), ESPERA_CONTA), comLimite(capacidade("user"), ESPERA_CONTA)]); } catch (e) { return "tarde"; }
    if (!db || !user) return "nao";
    try { id = await comLimite(user.id(), ESPERA_CONTA); } catch (e) { return "tarde"; }
    if (!id) return "nao";
    this.db = db; this.uid = id; return "sim";
  },

  /* Lê a conta e mescla com a memória: vale a versão mais recente de cada parecer */
  async puxar() {
    const [ms, qs] = await Promise.all([comLimite(this.refMeta().get(), 12000), comLimite(this.col().get(), 12000)]);
    const rMeta = ms && ms.exists ? (ms.data() || {}) : {};
    const remoto = {}, carimbo = {};                                  // carimbo: a data de cada parecer como está na conta
    (qs && qs.docs || []).forEach(d => { if (d.exists) { const o = copia(d.data()); if (o && o.key) { remoto[o.key] = o; carimbo[o.key] = o.atualizado_em || ""; } } });
    let mudou = false;
    for (const [k, r] of Object.entries(remoto)) {
      if (this.relogios[k]) continue;                                   // há edição local ainda não enviada
      const l = S.P[k];
      if (!l || (r.atualizado_em || "") > (l.atualizado_em || "")) { S.P[k] = aoAbrir(r); mudou = true; }
    }
    const antes = S.meta.contador || 0;
    S.meta.contador = Math.max(antes, rMeta.contador || 0, maiorNumero());
    const ren = await renumerarRepetidos(), dup = umAtivoPorCodigo();          // dois aparelhos sem se ver: número e código continuam únicos
    if (S.meta.contador !== antes || ren.trocas.length || dup.length) mudou = true;
    const enviar = Object.keys(S.P).filter(k => !(k in carimbo) || (S.P[k].atualizado_em || "") > carimbo[k]);
    return { enviar, mudou, trocas: ren.trocas, dup };
  },

  async iniciar() {
    const local = this.lsLer();
    if (local.meta) S.meta.contador = Math.max(S.meta.contador || 0, local.meta.contador || 0);
    for (const o of Object.values(local.P)) if (o && o.key) S.P[o.key] = aoAbrir(o);
    let naConta = false, enviar = [], r = null;
    try {
      const c = await this.conectar();
      if (c === "sim") {
        r = await this.puxar(); enviar = r.enviar;
        await comLimite(this.refMeta().set({ contador: S.meta.contador, modelo: APP.modelo }), 12000);   // também testa a permissão de escrita
        naConta = true;
      } else this.semConta = c === "nao";
    } catch (e) { naConta = false; this.semConta = SEM_PERMISSAO.includes(e && e.code); }
    this.modo = naConta ? "conta" : "local";
    if (!naConta) { this.db = null; S.meta.contador = Math.max(S.meta.contador || 0, maiorNumero()); }
    const migrados = await migrarTudo();
    for (const k of Object.keys(S.P)) this.lsGravar(S.P[k]);
    this.lsGravarMeta();
    try { localStorage.removeItem(CHAVE_LS_ANTIGA); } catch (e) { /* sem armazenamento local */ }
    if (!naConta && !this.lsOk) this.modo = "memoria";
    if (naConta) for (const k of new Set([...enviar, ...migrados])) if (S.P[k]) await this.enviar(S.P[k]);
    if (r) avisarUnicidade(r);
    if (!naConta && !this.semConta) setTimeout(() => this.ressincronizar(), 20000);   // a conta pode só estar lenta: tenta de novo
  },

  /* Guarda com pequena espera (durante a digitação) */
  guardar(p) {
    p.atualizado_em = depoisDe(p.atualizado_em); this.lsGravar(p);
    clearTimeout(this.relogios[p.key]);
    this.relogios[p.key] = setTimeout(() => { delete this.relogios[p.key]; this.enviar(p); }, 700);
    pintarGuarda(true);
  },
  /* Guarda imediatamente (finalizar, criar, excluir) */
  async gravarJa(p) {
    p.atualizado_em = depoisDe(p.atualizado_em); this.lsGravar(p);
    clearTimeout(this.relogios[p.key]); delete this.relogios[p.key];
    await this.enviar(p);
  },
  enviar(p) {
    if (this.modo !== "conta") { S.salvoEm = new Date(); pintarGuarda(); return Promise.resolve(); }
    const k = p.key, corpo = paraGuardar(p);
    this.filas[k] = (this.filas[k] || Promise.resolve())
      .then(() => this.col().doc(k).set(corpo))
      .then(() => { S.salvoEm = new Date(); pintarGuarda(); })
      .catch(err => this.falhou(err));
    return this.filas[k];
  },
  falhou(err) {
    const c = err && err.code;
    if (c === "invalid_argument" || c === "revoked" || c === "not_granted") {
      this.modo = this.lsOk ? "local" : "memoria";
      avisar("Sua conta não tem permissão para salvar nesta página. Os dados seguem neste navegador: faça um Backup.", 7000);
    } else if (c === "quota_exceeded") avisar("O espaço desta página na conta está cheio. Gere o ZIP e faça um Backup.", 7000);
    else avisar("Não foi possível salvar na conta agora. Os dados seguem neste navegador.", 5000);
    pintarGuarda();
  },
  async gravarMeta() {
    this.lsGravarMeta();
    if (this.modo !== "conta") return;
    this.filas.__meta = (this.filas.__meta || Promise.resolve()).then(() => this.refMeta().set({ contador: S.meta.contador, modelo: APP.modelo })).catch(() => {});
    return this.filas.__meta;
  },
  /* Próximo número de registro: relê a conta antes, para nunca repetir um número dado em outro aparelho */
  async proximoNumero() {
    let n = Math.max(S.meta.contador || 0, maiorNumero());
    const l = this.lsLer();                                          // outra aba deste navegador pode ter finalizado um parecer
    if (l.meta) n = Math.max(n, l.meta.contador || 0);
    for (const o of Object.values(l.P)) { const x = /^REG-(\d+)$/.exec((o && o.id_registro) || ""); if (x) n = Math.max(n, +x[1]); }
    if (this.modo === "conta") {
      try {
        const [ms, qs] = await Promise.all([comLimite(this.refMeta().get(), 8000), comLimite(this.col().get(), 8000)]);
        if (ms && ms.exists) n = Math.max(n, (ms.data() || {}).contador || 0);
        (qs && qs.docs || []).forEach(d => { const x = d.exists && /^REG-(\d+)$/.exec((d.data() || {}).id_registro || ""); if (x) n = Math.max(n, +x[1]); });
      } catch (e) { /* sem resposta da conta: segue com o que há em memória */ }
    }
    return n + 1;
  },
  /* Ao voltar para a aba: busca o que mudou em outro aparelho. Se a conta não respondeu na abertura, tenta alcançá-la agora. */
  async ressincronizar() {
    if (this.ocupado || !S.pronto || (this.modo !== "conta" && this.semConta)) return;
    this.ocupado = true;
    try {
      let r;
      if (this.modo !== "conta") {
        const c = await this.conectar();
        if (c !== "sim") { this.semConta = c === "nao"; return; }
        r = await this.puxar();
        await comLimite(this.refMeta().set({ contador: S.meta.contador, modelo: APP.modelo }), 12000);
        this.modo = "conta"; r.mudou = true;
        avisar("Conta alcançada. Os dados deste navegador foram reunidos aos da sua conta.", 6000);
      } else r = await this.puxar();
      for (const k of r.enviar) if (S.P[k] && !this.relogios[k]) await this.enviar(S.P[k]);
      if (r.mudou) { const mig = await migrarTudo(); for (const k of mig) if (S.P[k]) await this.enviar(S.P[k]); for (const k of Object.keys(S.P)) this.lsGravar(S.P[k]); this.lsGravarMeta(); desenhar(); }
      if (r.trocas.length) await this.gravarMeta();
      avisarUnicidade(r);
    } catch (e) {
      if (this.modo !== "conta") { this.db = null; if (SEM_PERMISSAO.includes(e && e.code)) this.semConta = true; }   // senão, tenta de novo na próxima vez
    } finally { this.ocupado = false; pintarGuarda(); }
  }
};

/* Traz pareceres gravados com regras anteriores do piloto para as regras atuais */
async function migrarTudo() {
  const mudados = [];
  for (const p of Object.values(S.P)) {
    if (p.excluido || (p.modelo || 0) >= APP.modelo) continue;
    if (p.demo) { S.P[p.key] = { key: p.key, excluido: true, demo: true, atualizado_em: depoisDe(p.atualizado_em) }; S.refazerExemplo = true; mudados.push(p.key); continue; }
    (p.excertos || (p.excertos = [])).forEach(e => {
      e.marcas = (e.marcas || []).filter(m => MARCAS_VALIDAS.includes(m));
      delete e.nivel_registro; delete e.nivel_manual; delete e.dimensao_nivel;
      e.dimensao_secundaria = e.dimensao_secundaria || ""; e.direitos = e.direitos || []; e.campos = e.campos || []; e.categorias_matriz = e.categorias_matriz || [];
      EMERG.forEach(g => { if (!e[g.f]) e[g.f] = NM; });
      if (typeof e.ancora_ok !== "boolean") e.ancora_ok = true;
      e.observacoes = e.observacoes || ""; e.duvida = !!e.duvida;
    });
    const f = p.fechamento || {};
    p.fechamento = { excerto_representativo: f.excerto_representativo || "", sintese_uma_frase: f.sintese_uma_frase || "", observacoes_gerais: f.observacoes_gerais || "", observacoes_ausencia: f.observacoes_ausencia || "" };
    p.modelo = APP.modelo;
    if (p.status !== "rascunho" && !p.registro) {
      const cod = p.identificacao.codigo_parecer, mapa = {};
      ordenados(p).forEach((e, i) => { mapa[e.k] = `${cod}-E${zeros(i + 1)}`; });
      p.fechamento.excerto_representativo = mapa[p.fechamento.excerto_representativo] || "";
      p.excertos.forEach(e => { e.k = mapa[e.k]; });
      p.registro = await selar(registroDe(p));
    }
    p.atualizado_em = depoisDe(p.atualizado_em); mudados.push(p.key);
  }
  return mudados;
}
