import os, pathlib
RAIZ = pathlib.Path(__file__).resolve().parent.parent
CHROME = os.environ.get("CHROME", "/usr/bin/google-chrome")
import asyncio, sys
from playwright.async_api import async_playwright
URL = RAIZ.joinpath("dist","index.html").as_uri()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME)
        async def pagina(w, h, esquema="light"):
            ctx = await b.new_context(viewport={"width": w, "height": h}, color_scheme=esquema); pg = await ctx.new_page(); await pg.goto(URL); await pg.wait_for_timeout(900); return pg
        pg = await pagina(1280, 800)
        await pg.screenshot(path=str(RAIZ / "fotos") + "/a_cod_1280.png")
        await pg.evaluate("() => { document.querySelector('#folha').scrollTop = 520 }"); await pg.wait_for_timeout(100)
        await pg.screenshot(path=str(RAIZ / "fotos") + "/a_cod_1280_b.png")
        await pg.evaluate("() => { document.querySelector('#folha').scrollTop = 1250 }"); await pg.wait_for_timeout(100)
        await pg.screenshot(path=str(RAIZ / "fotos") + "/a_cod_1280_c.png")
        await pg.click('.vistas a[href="#concordancia"]'); await pg.wait_for_timeout(150); await pg.click('[data-act="conc-exemplo"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=str(RAIZ / "fotos") + "/b_conc.png", full_page=False)
        await pg.evaluate("() => { document.querySelector('#corpo').scrollTop = 760 }"); await pg.wait_for_timeout(100)
        await pg.screenshot(path=str(RAIZ / "fotos") + "/b_conc2.png")
        await pg.click('.vistas a[href="#painel"]'); await pg.wait_for_timeout(150)
        await pg.evaluate("() => { document.querySelector('#corpo').scrollTop = 700 }"); await pg.wait_for_timeout(100)
        await pg.screenshot(path=str(RAIZ / "fotos") + "/c_painel2.png")
        await pg.evaluate("() => { document.querySelector('#corpo').scrollTop = 1500 }"); await pg.wait_for_timeout(100)
        await pg.screenshot(path=str(RAIZ / "fotos") + "/c_painel3.png")
        d = await pagina(1280, 800, "dark")
        await d.screenshot(path=str(RAIZ / "fotos") + "/d_dark_cod.png")
        await d.click('.vistas a[href="#painel"]'); await d.wait_for_timeout(150); await d.evaluate("() => { document.querySelector('#corpo').scrollTop = 620 }"); await d.wait_for_timeout(100)
        await d.screenshot(path=str(RAIZ / "fotos") + "/d_dark_painel.png")
        m = await pagina(390, 800)
        await m.screenshot(path=str(RAIZ / "fotos") + "/e_mob_cod.png")
        await m.evaluate("() => window.scrollTo(0, 0)")
        await m.screenshot(path=str(RAIZ / "fotos") + "/e_mob_full.png", full_page=True)
        await m.click('.vistas a[href="#painel"]'); await m.wait_for_timeout(150)
        await m.screenshot(path=str(RAIZ / "fotos") + "/e_mob_painel.png")
        await b.close()
asyncio.run(main())
