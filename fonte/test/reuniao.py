"""Reunião de dados: dois navegadores, dois aparelhos, conta lenta. Número único, código único, nada gravado por cima."""
import os, pathlib
RAIZ = pathlib.Path(__file__).resolve().parent.parent
CHROME = os.environ.get("CHROME", "/usr/bin/google-chrome")

import asyncio, json, hashlib, sys
from playwright.async_api import async_playwright
URL = RAIZ.joinpath("dist","index.html").as_uri()
MOCK = RAIZ.joinpath("test","mock.js").read_text(encoding="utf-8")
OK = []; FAIL = []
def check(nome, cond, extra=""):
    (OK if cond else FAIL).append(nome); print(("  ok   " if cond else "  FALHA ") + nome + (f"  [{extra}]" if extra and not cond else ""))

CRIA = """async ([cod, finaliza]) => { const p = novoParecer(cod); Object.assign(p.identificacao, {tipo_instituicao:'EMEB', semestre:'2026/2', idade:'5', imigracao:'Nao', anonimizado:true});
  p.texto_parecer = 'No parque, tem corrido com os colegas desde o início do ano. É uma criança difícil. Parecer ' + cod + '.';
  const a = novoExcerto(0, 60, p.texto_parecer.slice(0, 60)); Object.assign(a, {dimensao_dominante:'DMF', marcas:['M1','M2','M4']});
  p.excertos.push(a); p.fechamento.excerto_representativo = a.k; p.fechamento.sintese_uma_frase = 'Síntese de ' + cod + '.'; S.P[p.key] = p; await store.gravarJa(p);
  if (finaliza) await finalizar(p); await new Promise(r => setTimeout(r, 15)); return p.key; }"""
CORRIGE = """async ([cod, finaliza]) => { const v1 = finalizados().find(p => p.identificacao.codigo_parecer === cod); const n = novaVersao(v1); n.fechamento.sintese_uma_frase += ' Corrigida.'; await store.gravarJa(n);
  if (finaliza) await finalizar(n); await new Promise(r => setTimeout(r, 15)); return n.key; }"""
ESTADO = """async () => { const out = []; for (const p of todos().filter(x => !x.demo)) out.push({cod: p.identificacao.codigo_parecer, v: p.versao, st: p.status, id: p.id_registro, sub: p.substitui, por: p.substituido_por || null,
  ok: p.registro ? await integro(p.registro) : null, origem: p.registro && p.registro.origem ? p.registro.origem.id_registro : null, regSub: p.registro ? p.registro.substitui : null, regId: p.registro ? p.registro.id_registro : null});
  return out.sort((a, b) => (a.cod + a.v).localeCompare(b.cod + b.v)); }"""
BACKUP = "() => JSON.stringify({ tipo: 'backup-completo', schema: APP.schema, gerado_em: agora(), meta: { contador: S.meta.contador }, pareceres: todos().filter(p => !p.demo).map(paraGuardar) })"

def sha_ok(o):
    resto = {k: v for k, v in o.items() if k != "integridade"}
    return "sha256:" + hashlib.sha256(json.dumps(resto, ensure_ascii=False, separators=(",", ":")).encode("utf-8")).hexdigest() == o["integridade"]["resumo"]

async def importa(pg, nome, texto):
    await pg.set_input_files("#arqImportar", [{"name": nome, "mimeType": "application/json", "buffer": texto.encode()}]); await pg.wait_for_timeout(600)
    t = await pg.evaluate("() => document.querySelector('.modal').textContent"); await pg.click('[data-act="fechar"]'); return t

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME); errs = []
        async def pagina(init=None):
            ctx = await b.new_context(viewport={"width": 1440, "height": 900})
            if init: await ctx.add_init_script(init)
            pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); await pg.goto(URL); return pg

        print("== 1. dois navegadores, cada um com a sua numeração")
        A = await pagina(); B = await pagina(); await A.wait_for_timeout(900)
        await A.evaluate(CRIA, ["P01", True]); await A.evaluate(CRIA, ["P02", True]); await A.evaluate(CORRIGE, ["P02", True])
        await B.evaluate(CRIA, ["P10", True]); await B.evaluate(CRIA, ["P11", True]); await B.evaluate(CORRIGE, ["P10", True]); await B.evaluate(CRIA, ["P01", True])
        await B.evaluate(CORRIGE, ["P11", False]); await B.evaluate(CRIA, ["P12", False])
        ea = await A.evaluate(ESTADO); eb = await B.evaluate(ESTADO)
        check("A numerou 1 a 3; B numerou 1 a 4", [x["id"] for x in ea] == ["REG-0001", "REG-0002", "REG-0003"] and sorted(x["id"] for x in eb if x["id"]) == ["REG-0001", "REG-0002", "REG-0003", "REG-0004"], str([x["id"] for x in eb]))
        selosB = await B.evaluate("() => Object.fromEntries(todos().filter(p => p.registro && !p.demo).map(p => [p.identificacao.codigo_parecer + 'v' + p.versao, p.registro.integridade.resumo]))")
        bkB = await B.evaluate(BACKUP)
        txt = await importa(A, "backupB.json", bkB)
        e = await A.evaluate(ESTADO); por = {x["cod"] + "v" + str(x["v"]): x for x in e}
        check("relato: 3 pareceres, 1 versão no histórico", "3 pareceres importados, com 1 versão anterior no histórico" in txt, txt[:200])
        check("relato: P01 não importado, sem gravar por cima", "Não importado: P01." in txt and len([x for x in e if x["cod"] == "P01"]) == 1 and por["P01v1"]["id"] == "REG-0001", txt)
        check("relato: três registros renumerados", "3 registros receberam novo número" in txt and "P10, de REG-0001 para REG-0005" in txt, txt)
        ids = [x["id"] for x in e if x["id"]]
        check("números únicos depois de reunir", len(ids) == len(set(ids)) == 6, str(ids))
        check("registros de A intactos", por["P01v1"]["origem"] is None and por["P02v1"]["id"] == "REG-0002" and por["P02v2"]["id"] == "REG-0003" and por["P02v2"]["sub"] == "REG-0002" and por["P02v1"]["st"] == "substituido")
        check("P10: v1 no histórico, v2 ativa, referências refeitas", por["P10v1"]["id"] == "REG-0005" and por["P10v1"]["st"] == "substituido" and por["P10v1"]["por"] == "REG-0007" and por["P10v2"]["id"] == "REG-0007" and por["P10v2"]["regSub"] == "REG-0005" and por["P10v2"]["st"] == "finalizado", str([por["P10v1"], por["P10v2"]]))
        check("P11: finalizado segue valendo; a correção em rascunho aponta para o novo número", por["P11v1"]["id"] == "REG-0006" and por["P11v1"]["st"] == "finalizado" and por["P11v2"]["st"] == "rascunho" and por["P11v2"]["sub"] == "REG-0006", str([por["P11v1"], por["P11v2"]]))
        check("origem guardada", por["P10v1"]["origem"] == "REG-0001" and por["P11v1"]["origem"] == "REG-0002" and por["P10v2"]["origem"] == "REG-0003")
        check("todos os selos conferem no Codificador", all(x["ok"] is True for x in e if x["id"]), str([(x["cod"], x["ok"]) for x in e]))
        regs = await A.evaluate("() => todos().filter(p => p.registro && !p.demo).map(p => p.registro)")
        check("todos os selos conferem em Python", all(sha_ok(o) for o in regs))
        o10 = [o for o in regs if o["parecer"]["codigo_parecer"] == "P10" and o["versao"] == 2][0]
        check("bloco origem: número, referência e selo de origem", o10["origem"] == {"id_registro": "REG-0003", "substitui": "REG-0001", "integridade": selosB["P10v2"]} and list(o10.keys())[-2:] == ["origem", "integridade"], str(o10.get("origem")))
        check("contador depois de reunir", await A.evaluate("async () => await store.proximoNumero()") == 8)
        man = await A.evaluate("() => { const { regs, hist } = conjuntoFinal(); return manifestoDe(regs, hist); }")
        arqs = [x["arquivo"] for x in man["registros"]] + [x["arquivo"] for x in man["historico"]]
        check("manifesto: nomes únicos e número de origem", len(arqs) == len(set(arqs)) and [x.get("numero_de_origem") for x in man["registros"]] == [None, None, "REG-0003", "REG-0002"], str(man["registros"]))
        await A.click('.item:has-text("P10"):has-text("v2")'); await A.wait_for_timeout(150); c2 = await A.inner_text("#cab")
        await A.click('.item:has-text("P10") >> nth=0'); await A.wait_for_timeout(150); c1 = await A.inner_text("#cab")
        check("a folha diz de onde veio, também no histórico", "onde era REG-0003" in c2 and "onde era REG-0001" in c1 and "substituída por REG-0007" in c1, c1[:160])
        txt = await importa(A, "backupB.json", bkB)
        e2 = await A.evaluate(ESTADO)
        check("reimportar: nada entra, nada muda", "0 pareceres importados" in txt and "já estavam aqui" in txt and e2 == e, txt[:160])
        # finalizar a correção importada: novo número, a versão anterior vai para o histórico
        await A.evaluate("async () => { const p = todos().find(x => x.identificacao.codigo_parecer === 'P11' && x.status === 'rascunho'); await finalizar(p); }")
        e = await A.evaluate(ESTADO); por = {x["cod"] + "v" + str(x["v"]): x for x in e}
        check("correção importada finaliza com o próximo número", por["P11v2"]["id"] == "REG-0008" and por["P11v2"]["regSub"] == "REG-0006" and por["P11v1"]["st"] == "substituido" and por["P11v1"]["por"] == "REG-0008", str([por["P11v1"], por["P11v2"]]))
        # caminho de volta: o backup de A entra em B sem repetir número
        txt = await importa(B, "backupA.json", await A.evaluate(BACKUP))
        eb = await B.evaluate(ESTADO); ids = [x["id"] for x in eb if x["id"]]
        check("volta para B: números únicos e selos íntegros", len(ids) == len(set(ids)) and all(x["ok"] is True for x in eb if x["id"]) and "Não importado: P01." in txt, str(ids) + txt[:120])
        check("volta para B: P02 chegou com o histórico", any(x["cod"] == "P02" and x["st"] == "finalizado" for x in eb) and any(x["cod"] == "P02" and x["st"] == "substituido" for x in eb))

        print("== 2. registros avulsos: a correção chega depois")
        C = await pagina(); await C.wait_for_timeout(900)
        v1 = [o for o in regs if o["parecer"]["codigo_parecer"] == "P02" and o["versao"] == 1][0]; v2 = [o for o in regs if o["parecer"]["codigo_parecer"] == "P02" and o["versao"] == 2][0]
        await importa(C, "v1.json", json.dumps(v1, ensure_ascii=False)); txt = await importa(C, "v2.json", json.dumps(v2, ensure_ascii=False))
        ec = await C.evaluate(ESTADO)
        check("v2 avulsa substitui a v1 que estava aqui", [(x["v"], x["st"]) for x in ec] == [(1, "substituido"), (2, "finalizado")] and "1 parecer importado" in txt, str(ec))
        outro = await B.evaluate("() => todos().find(p => p.identificacao.codigo_parecer === 'P01' && !p.demo).registro")
        await importa(C, "p01.json", json.dumps(outro, ensure_ascii=False))
        ec = await C.evaluate(ESTADO); p01 = [x for x in ec if x["cod"] == "P01"][0]
        check("registro avulso com número em uso é renumerado", p01["id"] == "REG-0004" and p01["origem"] == "REG-0004" or (p01["id"] not in ("REG-0002", "REG-0003") and p01["ok"] is True), str(p01))

        print("== 3. um código, um parecer: conferido ao finalizar")
        k = await C.evaluate(CRIA, ["P30", False])
        await C.evaluate("""(k) => { const o = copia(S.P[k]); o.key = 'kgemeo'; S.P.kgemeo = o; S.sel = k; S.passo = 'fec'; desenhar(); }""", k)
        await C.click('[data-act="finalizar"]'); await C.click('[data-act="finalizar-ok"]'); await C.wait_for_timeout(300)
        r = await C.evaluate("(k) => ({st: S.P[k].status, aviso: document.querySelector('#avisoRaiz').textContent})", k)
        check("dois rascunhos com o mesmo código: não finaliza", r["st"] == "rascunho" and "Um código, um parecer" in r["aviso"], str(r))

        print("== 4. dois aparelhos na mesma conta que não se viram")
        D = await pagina(MOCK); await D.wait_for_timeout(900)
        await D.evaluate(CRIA, ["P01", True])
        await D.evaluate("""async () => { const mk = async (cod, id, quando, chave) => { const p = novoParecer(cod); p.key = chave; Object.assign(p.identificacao, {tipo_instituicao:'CMEI', semestre:'2027/1', idade:'4', imigracao:'Sim', anonimizado:true});
            p.texto_parecer = 'Na roda, tem contado histórias. Outro aparelho, ' + cod + '.'; const a = novoExcerto(0, 31, p.texto_parecer.slice(0, 31)); Object.assign(a, {dimensao_dominante:'DML', marcas:['M1','M4']}); a.k = cod + '-E01';
            p.excertos.push(a); p.fechamento.excerto_representativo = a.k; p.fechamento.sintese_uma_frase = 'Outro aparelho.'; p.status = 'finalizado'; p.id_registro = id; p.finalizado_em = quando; p.atualizado_em = quando;
            p.registro = await selar(registroDe(p)); return paraGuardar(p); };
          const db = JSON.parse(localStorage.getItem('__mockdb')), base = 'data/users/u_teste/meta/pareceres/', depois = new Date(Date.now() + 60000).toISOString();
          db[base + 'kzoutro1'] = await mk('P05', 'REG-0001', depois, 'kzoutro1');        // mesmo número, outro parecer
          db[base + 'kzoutro2'] = await mk('P01', 'REG-0009', depois, 'kzoutro2');        // mesmo código, finalizado depois
          localStorage.setItem('__mockdb', JSON.stringify(db)); }""")
        await D.evaluate("async () => await store.ressincronizar()"); await D.wait_for_timeout(400)
        ed = await D.evaluate(ESTADO); por = {x["cod"] + ":" + x["id"]: x for x in ed}; ids = [x["id"] for x in ed]
        check("número repetido entre aparelhos: o finalizado depois é renumerado", "P05:REG-0010" in por and por["P05:REG-0010"]["origem"] == "REG-0001" and por["P05:REG-0010"]["ok"] is True and len(ids) == len(set(ids)), str(ids))
        check("código finalizado duas vezes: vale o mais recente", por["P01:REG-0009"]["st"] == "finalizado" and por["P01:REG-0001"]["st"] == "substituido" and por["P01:REG-0001"]["por"] == "REG-0009" and await D.evaluate("() => finalizados().length") == 2, str(ed))
        r = await D.evaluate("() => { const db = JSON.parse(localStorage.getItem('__mockdb')); const b = 'data/users/u_teste/meta/pareceres/'; return {p05: db[b + 'kzoutro1'].id_registro, cont: db['data/users/u_teste/meta'].contador, aviso: document.querySelector('#avisoRaiz').textContent}; }")
        check("ajustes gravados na conta e contados em uma frase", r["p05"] == "REG-0010" and r["cont"] == 10 and "Número de registro repetido" in r["aviso"] and "Código finalizado em dois aparelhos" in r["aviso"], str(r))
        await D.evaluate("async () => await store.ressincronizar()"); await D.wait_for_timeout(300)
        check("sincronizar de novo não muda mais nada", await D.evaluate(ESTADO) == ed)

        print("== 5. conta lenta na abertura, alcançada depois")
        E = await pagina("localStorage.setItem('__flag_lento','1');" + MOCK); await E.wait_for_timeout(6900)
        r = await E.evaluate("() => ({modo: store.modo, sem: store.semConta, n: todos().length})")
        check("abre no navegador, sem desistir da conta", r["modo"] == "local" and r["sem"] is False and r["n"] == 1, str(r))
        await E.evaluate(CRIA, ["P40", True])
        await E.evaluate("async () => await store.ressincronizar()"); await E.wait_for_timeout(400)
        r = await E.evaluate("() => { const db = JSON.parse(localStorage.getItem('__mockdb') || '{}'); return {modo: store.modo, txt: document.querySelector('#guarda').textContent, docs: Object.keys(db).length, reg: Object.values(db).some(d => d.id_registro === 'REG-0001'), cont: (db['data/users/u_teste/meta'] || {}).contador}; }")
        check("conta alcançada: dados do navegador enviados", r["modo"] == "conta" and "na sua conta" in r["txt"] and r["reg"] and r["cont"] == 1 and r["docs"] == 3, str(r))
        F = await pagina("localStorage.setItem('__flag_ro','1');" + MOCK); await F.wait_for_timeout(900)
        r = await F.evaluate("() => ({modo: store.modo, sem: store.semConta})")
        check("sem permissão de escrita: não insiste", r["modo"] == "local" and r["sem"] is True, str(r))
        G = await pagina(); await G.wait_for_timeout(900)
        check("fora da plataforma: não insiste", await G.evaluate("() => store.semConta") is True)

        print("== 6. visualizador que não chama de volta")
        H = await pagina("localStorage.setItem('__flag_hotmudo','1');" + MOCK); await H.wait_for_timeout(1200)
        antes = await H.evaluate("() => S.pronto === true")
        await H.wait_for_timeout(2600)
        check("a página abre assim mesmo", (not antes) and await H.evaluate("() => S.pronto === true && todos().length === 1"))

        check("nenhum erro de página", not errs, str(errs[:3]))
        await b.close()
    print(f"\n{len(OK)} ok, {len(FAIL)} falhas")
    if FAIL: print("FALHAS:", FAIL); sys.exit(1)
asyncio.run(main())
