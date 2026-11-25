import os, pathlib
RAIZ = pathlib.Path(__file__).resolve().parent.parent
CHROME = os.environ.get("CHROME", "/usr/bin/google-chrome")
import asyncio, json, base64, io, zipfile, time
from playwright.async_api import async_playwright
URL = RAIZ.joinpath("dist","index.html").as_uri()
MOCK = RAIZ.joinpath("test","mock.js").read_text(encoding="utf-8")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME)
        for modo, init in [("local", None), ("conta", MOCK)]:
            ctx = await b.new_context(viewport={"width": 1440, "height": 900})
            if init: await ctx.add_init_script(init)
            pg = await ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e))); await pg.goto(URL); await pg.wait_for_timeout(900)
            t0 = time.time()
            r = await pg.evaluate("""async () => {
              const base = todos().find(p => p.demo); const t0 = performance.now();
              for (let i = 1; i <= 60; i++) {
                const p = novoParecer('P' + String(i).padStart(2, '0')); Object.assign(p.identificacao, {tipo_instituicao: i % 2 ? 'EMEB' : 'CMEI', semestre: i % 3 ? '2026/2' : '2027/1', idade: i % 2 ? '4' : '5', imigracao: i % 5 ? 'Nao' : 'Sim', anonimizado: true});
                p.texto_parecer = (base.texto_parecer + '\\n\\n').repeat(2).trim();           // ~700 palavras
                const n = base.excertos.length; ordenados(base).forEach((e, j) => { if ((i + j) % 4 === 0) return; const c = copia(e); c.k = uid() + j; p.excertos.push(c); });
                ordenados(base).forEach((e, j) => { if ((i + j) % 3) return; const c = copia(e); c.k = uid() + 'b' + j; const d = base.texto_parecer.length + 2; c.inicio += d; c.fim += d; p.excertos.push(c); });
                p.fechamento.excerto_representativo = p.excertos[0].k; p.fechamento.sintese_uma_frase = 'Síntese do parecer ' + i + '.';
                S.P[p.key] = p; await store.gravarJa(p); await finalizar(p);
              }
              const t1 = performance.now(); desenhar(); const t2 = performance.now(); S.vista = 'painel'; desenhar(); const t3 = performance.now();
              const ls = Object.keys(localStorage).filter(k => k.startsWith('pibic:')).reduce((s, k) => s + localStorage.getItem(k).length, 0);
              const ok = finalizados().every(p => p.texto_parecer.slice(p.excertos[0].inicio, p.excertos[0].fim) === p.excertos[0].excerto_literal);
              const regs = finalizados().map(p => p.id_registro).sort();
              const tz = performance.now(); const { regs: rr, hist } = conjuntoFinal(); const t = tabelasCsv(rr);
              const blob = await montarZip([...rr.map(o => ({nome: 'pareceres/' + o.id_registro + '.json', dados: JSON.stringify(o, null, 2)})), {nome: 'excertos.csv', dados: t.excertos}, ...rr.map(o => ({nome: 'fichas/' + o.parecer.codigo_parecer + '.md', dados: fichaMd(o)}))]);
              const tz2 = performance.now(); const d = dadosDoPainel();
              return {criar_ms: Math.round(t1 - t0), desenhar_ms: Math.round(t2 - t1), painel_ms: Math.round(t3 - t2), ls_chars: ls, ok, n: regs.length, primeiro: regs[0], ultimo: regs[regs.length - 1], unicos: new Set(regs).size, zip_ms: Math.round(tz2 - tz), zip_kb: Math.round(blob.size / 1024),
                N: d.N, E: d.E, soma: d.niv.Ausencia + d.niv.Traco + d.niv.Lastro, grupos: d.grupos.length, maiorDoc: Math.max(...finalizados().map(p => JSON.stringify(paraGuardar(p)).length)), modo: store.modo};
            }""")
            print(modo, json.dumps(r), "erros:", errs[:2])
            await pg.reload(); await pg.wait_for_timeout(1500)
            r2 = await pg.evaluate("() => ({n: finalizados().length, cont: S.meta.contador, modo: store.modo, prog: document.querySelector('#prog').textContent})")
            print("  após recarregar:", r2)
        await b.close()
asyncio.run(main())
