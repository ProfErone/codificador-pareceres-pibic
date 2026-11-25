import os, pathlib
RAIZ = pathlib.Path(__file__).resolve().parent.parent
CHROME = os.environ.get("CHROME", "/usr/bin/google-chrome")
import asyncio, json, sys
from playwright.async_api import async_playwright
URL = RAIZ.joinpath("dist","index.html").as_uri()
MOCK = RAIZ.joinpath("test","mock.js").read_text(encoding="utf-8")
OK = []; FAIL = []
def check(nome, cond, extra=""):
    (OK if cond else FAIL).append(nome); print(("  ok   " if cond else "  FALHA ") + nome + (f"  [{extra}]" if extra and not cond else ""))
def ex(k, i, f, lit, dim, marcas, **kw):
    d = {"k": k, "inicio": i, "fim": f, "excerto_literal": lit, "ancora_ok": True, "dimensao_dominante": dim, "dimensao_nivel": "MC", "dimensao_secundaria": "", "direitos": ["DCon"], "campos": [], "categorias_matriz": [],
         "esp_nivel": "NAO_MENCIONADO", "blg_nivel": "NAO_MENCIONADO", "acu_nivel": "NAO_MENCIONADO", "marcas": marcas, "nivel_registro": "Lastro", "nivel_manual": True, "duvida": False, "observacoes": "obs"}
    d.update(kw); return d
T = "Na roda, tem contado histórias. É agitado."
def antigo(key, cod, status, reg=None, demo=False):
    return {"key": key, "status": status, "demo": demo, "versao": 1, "id_registro": reg, "substitui": None,
            "identificacao": {"codigo_parecer": cod, "tipo_instituicao": "EMEB", "semestre": "2026/2", "idade": "5", "imigracao": "Sim", "anonimizado": True},
            "texto_parecer": T, "excertos": [ex("ka", 0, 31, T[0:31], "DML", ["M1", "M4", "M6", "M9"], blg_nivel="Nivel 3 - Registro sensivel"), ex("kb", 32, 42, T[32:42], "DMS", ["M5", "M8"])],
            "fechamento": {"nivel_registro_predominante": "Equilibrio", "nivel_auto": True, "excerto_representativo": "kb", "sintese_uma_frase": "Síntese antiga.", "observacoes_gerais": "", "esp_nivel": "", "blg_nivel": "", "acu_nivel": "", "emerg_auto": True, "observacoes_ausencia": ""},
            "criado_em": "2026-11-12T10:00:00.000Z", "atualizado_em": "2026-11-12T10:00:00.000Z", "finalizado_em": "2026-11-12T11:00:00.000Z" if reg else None}
P = {"kdemo": antigo("kdemo", "EX07", "rascunho", demo=True), "krasc": antigo("krasc", "P05", "rascunho"), "kfin": antigo("kfin", "P06", "finalizado", "REG-0001")}
async def conferir(pg, rotulo):
    r = await pg.evaluate("""async () => { const t = todos(), fin = t.find(p => p.identificacao.codigo_parecer === 'P06'), ras = t.find(p => p.identificacao.codigo_parecer === 'P05'), demo = t.filter(p => p.demo);
      return {cods: t.map(p => p.identificacao.codigo_parecer).sort(), demoN: demo.length && demo[0].excertos.length, demoNovo: demo.length && demo[0].key !== 'kdemo', rasMarcas: ras.excertos.map(e => e.marcas), rasModelo: ras.modelo, rasSemNivel: !('nivel_registro' in ras.excertos[0]),
        rasFec: Object.keys(ras.fechamento).sort(), finReg: !!fin.registro, finOk: fin.registro && await integro(fin.registro), finKs: fin.excertos.map(e => e.k), finRep: fin.fechamento.excerto_representativo, finNiv: fin.registro && fin.registro.excertos.map(e => e.nivel_registro),
        finBlg: fin.registro && fin.registro.ausencias.blg_nivel, cont: S.meta.contador, antiga: localStorage.getItem('pibic_pareceres_v1'), chaves: Object.keys(localStorage).filter(k => k.startsWith('pibic:p:')).length, modo: store.modo} }""")
    check(rotulo + ": pareceres preservados e exemplo refeito", r["cods"] == ["EX07", "P05", "P06"] and r["demoN"] == 20 and r["demoNovo"], str(r["cods"]))
    check(rotulo + ": rascunho migrado (marcas M1–M5, sem campos antigos)", r["rasMarcas"] == [["M1", "M4"], ["M5"]] and r["rasModelo"] == 4 and r["rasSemNivel"] and r["rasFec"] == ["excerto_representativo", "observacoes_ausencia", "observacoes_gerais", "sintese_uma_frase"], str(r["rasMarcas"]))
    check(rotulo + ": finalizado antigo recebe registro selado", r["finReg"] and r["finOk"] is True and r["finKs"] == ["P06-E01", "P06-E02"] and r["finRep"] == "P06-E02" and r["finNiv"] == ["Lastro", "Ausencia"] and r["finBlg"] == "Nivel 3 - Registro sensivel", str(r))
    check(rotulo + ": contador e chaves", r["cont"] == 1 and r["antiga"] is None and r["chaves"] >= 3, str({k: r[k] for k in ["cont", "antiga", "chaves", "modo"]}))
    return r
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME); errs = []
        print("== formato antigo no navegador")
        ctx = await b.new_context(); await ctx.add_init_script("if (!localStorage.getItem('__ja')) { localStorage.setItem('__ja','1'); localStorage.setItem('pibic_pareceres_v1', " + json.dumps(json.dumps({"meta": {"contador": 1, "schema": "pibic-pareceres/1.0", "regra_versao": 3}, "P": P})) + "); }")
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); await pg.goto(URL); await pg.wait_for_timeout(900)
        await conferir(pg, "local")
        await pg.reload(); await pg.wait_for_timeout(800)
        r = await pg.evaluate("() => ({n: todos().length, demos: todos().filter(p => p.demo).length})")
        check("local: segunda carga estável", r["n"] == 3 and r["demos"] == 1, str(r))
        print("== formato antigo na conta")
        db = {"data/users/u_teste/meta": {"contador": 1, "schema": "pibic-pareceres/1.0", "regra_versao": 3}}
        for k, v in P.items(): db["data/users/u_teste/meta/pareceres/" + k] = v
        ctx2 = await b.new_context(); await ctx2.add_init_script("if (!localStorage.getItem('__ja')) { localStorage.setItem('__ja','1'); localStorage.setItem('__mockdb', " + json.dumps(json.dumps(db)) + "); }" + MOCK)
        pg2 = await ctx2.new_page(); pg2.on("pageerror", lambda e: errs.append("conta " + str(e))); await pg2.goto(URL); await pg2.wait_for_timeout(1000)
        r = await conferir(pg2, "conta")
        check("conta: modo conta", r["modo"] == "conta")
        d = await pg2.evaluate("() => { const db = JSON.parse(localStorage.getItem('__mockdb')); return {demoLapide: db['data/users/u_teste/meta/pareceres/kdemo'].excluido === true, fin: !!db['data/users/u_teste/meta/pareceres/kfin'].registro && !db['data/users/u_teste/meta/pareceres/kfin'].excertos, ras: db['data/users/u_teste/meta/pareceres/krasc'].modelo, n: Object.keys(db).length} }")
        check("conta: migração gravada de volta", d["demoLapide"] and d["fin"] and d["ras"] == 4 and d["n"] == 5, str(d))
        check("nenhum erro de página", not errs, str(errs[:3]))
        await b.close()
    print(f"\n{len(OK)} ok, {len(FAIL)} falhas")
    if FAIL: print("FALHAS:", FAIL); sys.exit(1)
asyncio.run(main())
