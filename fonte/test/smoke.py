import os, pathlib
RAIZ = pathlib.Path(__file__).resolve().parent.parent
CHROME = os.environ.get("CHROME", "/usr/bin/google-chrome")
import asyncio, json, sys
from playwright.async_api import async_playwright
URL = RAIZ.joinpath("dist","index.html").as_uri()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME)
        ctx = await b.new_context(viewport={"width":1440,"height":900})
        pg = await ctx.new_page(); errs=[]
        pg.on("pageerror", lambda e: errs.append("PAGEERROR "+str(e)))
        pg.on("console", lambda m: errs.append("CONSOLE "+m.text) if m.type=="error" else None)
        await pg.goto(URL); await pg.wait_for_timeout(1200)
        r = await pg.evaluate("""()=>{ const p=atual(); const r=resumoDoParecer(p);
          return {modo:store.modo, cod:p.identificacao.codigo_parecer, n:p.excertos.length, niv:r.niv, pred:r.pred, aus:r.aus, em:r.emNivel, cob:r.cobertura, pal:r.totPal, lei:leiNoExemplo(),
            ancoras:p.excertos.every(e=>p.texto_parecer.slice(e.inicio,e.fim)===e.excerto_literal), conf:conferencia(p).map(c=>c.t+':'+c.ok), pend:pendenciasDe(p)} }""")
        print(json.dumps(r, ensure_ascii=False, indent=1))
        await pg.screenshot(path=str(RAIZ / "fotos") + "/cod.png")
        for v in ["doc","fec"]:
            await pg.click(f'button.passo[data-v="{v}"]'); await pg.wait_for_timeout(200)
            await pg.screenshot(path=fstr(RAIZ / "fotos") + "/{v}.png", full_page=False)
        for h in ["painel","concordancia","metodo"]:
            await pg.click(f'.vistas a[href="#{h}"]'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=fstr(RAIZ / "fotos") + "/{h}.png")
        print("ERRS", errs)
        await b.close()
asyncio.run(main())
