import os, pathlib
RAIZ = pathlib.Path(__file__).resolve().parent.parent
CHROME = os.environ.get("CHROME", "/usr/bin/google-chrome")
import asyncio, json, base64, io, zipfile, sys, hashlib
from playwright.async_api import async_playwright

URL = RAIZ.joinpath("dist","index.html").as_uri()
OK = []; FAIL = []
def check(nome, cond, extra=""):
    (OK if cond else FAIL).append(nome)
    print(("  ok   " if cond else "  FALHA ") + nome + (f"  [{extra}]" if extra and not cond else ""))

SEL = """(sub) => { const box = document.querySelector('#texto'); const t = box.textContent; const i = t.indexOf(sub); if (i < 0) return false; const f = i + sub.length;
  const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT); let pos = 0, sN, sO, eN, eO;
  while (w.nextNode()) { const n = w.currentNode, len = n.data.length; if (sN === undefined && i < pos + len) { sN = n; sO = i - pos; } if (f <= pos + len) { eN = n; eO = f - pos; break; } pos += len; }
  const r = document.createRange(); r.setStart(sN, sO); r.setEnd(eN, eO); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return true; }"""

TEXTO = "Na roda de conversa, tem contado histórias com detalhes desde o início do semestre. É agitado e não fala nada na sala.\n\nObservamos que, ao montar quebra-cabeças, vem testando as peças uma a uma. Reconhece algumas letras do próprio nome."

async def selecionar(pg, sub):
    ok = await pg.evaluate(SEL, sub); await pg.wait_for_timeout(120); return ok

async def novo_parecer(pg, cod):
    await pg.click('aside .btn.pri[data-act="novo"]'); await pg.fill("#ncod", cod); await pg.wait_for_timeout(50)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME)
        ctx = await b.new_context(accept_downloads=True, viewport={"width": 1440, "height": 900})
        pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(900)

        print("== 1. exemplo e lei do lastro")
        r = await pg.evaluate("() => ({n: atual().excertos.length, lei: leiNoExemplo(), niv: resumoDoParecer(atual()).niv, modo: store.modo})")
        check("exemplo com 20 excertos", r["n"] == 20)
        check("lei reproduz MC/MS em 19 de 20", r["lei"] == 19)
        check("níveis 10/2/8", r["niv"] == {"Ausencia": 10, "Traco": 2, "Lastro": 8}, str(r["niv"]))
        check("modo local sem a plataforma", r["modo"] == "local")

        print("== 2. criar parecer, código único")
        await novo_parecer(pg, "p12")
        check("botão criar habilitado", await pg.is_enabled("#b-criar"))
        await pg.press("#ncod", "Enter"); await pg.wait_for_timeout(200)
        check("parecer P12 aberto", await pg.inner_text(".cab h1") == "P12")
        await novo_parecer(pg, "P12")
        check("código repetido recusado", not await pg.is_enabled("#b-criar"))
        check("mensagem de código repetido", "já existe" in await pg.inner_text("#nmsg"))
        await pg.fill("#ncod", "12"); await pg.wait_for_timeout(50)
        check("código fora do formato recusado", not await pg.is_enabled("#b-criar"))
        await pg.click('[data-act="fechar"]')

        print("== 3. identificação e texto")
        for f, v in [("tipo_instituicao", "CMEI"), ("semestre", "2027/1"), ("idade", "4"), ("imigracao", "Sim")]:
            await pg.click(f'#area .chip[data-f="{f}"][data-v="{v}"]')
        await pg.fill("#txt", "  " + TEXTO + "\n\n"); await pg.wait_for_timeout(100)
        await pg.click('#area .chip[data-f="imigracao"][data-v="Nao"]'); await pg.click('#area .chip[data-f="imigracao"][data-v="Sim"]')
        check("texto em digitação sobrevive ao clique na identificação", (await pg.input_value("#txt")).strip() == TEXTO)
        await pg.check("#anon")
        r = await pg.evaluate("() => atual().identificacao")
        check("identificação gravada", r["tipo_instituicao"] == "CMEI" and r["idade"] == "4" and r["anonimizado"] is True, str(r))
        await pg.click('button.passo[data-v="cod"]'); await pg.wait_for_timeout(100)
        check("texto exibido igual ao colado", await pg.evaluate("() => document.querySelector('#texto').textContent === atual().texto_parecer"))

        print("== 4. excertos por seleção")
        await selecionar(pg, "Na roda de conversa, tem contado histórias com detalhes desde o início do semestre.")
        check("botão codificar habilitado", await pg.is_enabled("#b-novo"))
        await pg.click("#b-novo"); await pg.wait_for_timeout(120)
        r = await pg.evaluate("() => { const p = atual(), e = p.excertos[0]; return {lit: e.excerto_literal, ok: p.texto_parecer.slice(e.inicio, e.fim) === e.excerto_literal, sug: marcasSugeridas(e)} }")
        check("excerto literal", r["ok"] and r["lit"].startswith("Na roda de conversa"))
        check("sugestões M1, M2 e M4", set(r["sug"]) >= {"M1", "M2", "M4"}, str(r["sug"]))
        await pg.click('#editor .chip.dim[data-v="DML"]')
        await pg.click('[data-act="aceitar-sug"]'); await pg.wait_for_timeout(80)
        r = await pg.evaluate("() => { const e = atual().excertos[0]; return {m: e.marcas, nv: nivelDo(e), mc: mcmsDo(e)} }")
        check("três âncoras = Lastro e MC", r["nv"] == "Lastro" and r["mc"] == "MC", str(r))
        check("régua mostra Lastro", "Lastro" in await pg.inner_text("#editor .regua .on"))
        check("marca no texto com cor e preenchimento", await pg.evaluate("() => { const m = document.querySelector('#texto mark'); return m.classList.contains('DML') && m.classList.contains('n2') }"))
        await pg.click('#editor .chip[data-f="direitos"][data-v="DPar"]'); await pg.click('#editor .chip[data-f="direitos"][data-v="DExpr"]'); await pg.click('#editor .chip[data-f="campos"][data-v="EF"]')
        # sobreposição recusada
        await selecionar(pg, "tem contado histórias"); await pg.click("#b-novo"); await pg.wait_for_timeout(120)
        check("sobreposição recusada", await pg.evaluate("() => atual().excertos.length") == 1)
        # palavra incompleta é completada
        await selecionar(pg, "gitado e não fala nad"); await pg.click("#b-novo"); await pg.wait_for_timeout(120)
        r = await pg.evaluate("() => { const p = atual(), e = ordenados(p)[1]; return {lit: e.excerto_literal, al: alertasDe(p, e).map(a => a[0] + ':' + a[1])} }")
        check("seleção completa as palavras", r["lit"] == "agitado e não fala nada", r["lit"])
        check("pendência sem dimensão", any(a.startswith("e:Falta a dimensão") for a in r["al"]))
        check("alerta 'não fala nada'", any("Não fala nada" in a for a in r["al"]))
        await pg.click('#editor .chip.dim[data-v="DML"]'); await pg.click('#editor .chip[data-f="blg_nivel"][data-v="Nivel 2 - Registro deficitario"]'); await pg.click('#editor .chip[data-v="M5"]')
        r = await pg.evaluate("() => { const p = atual(), e = ordenados(p)[1]; return {al: alertasDe(p, e), nv: nivelDo(e), mc: mcmsDo(e)} }")
        check("alerta resolvido, sem lastro e MS", r["al"] == [] and r["nv"] == "Ausencia" and r["mc"] == "MS", str(r))
        # ajustar o excerto aberto
        await selecionar(pg, "É agitado e não fala nada na sala."); await pg.wait_for_timeout(80)
        check("ajustar visível", await pg.is_visible("#b-ajustar"))
        await pg.click("#b-ajustar"); await pg.wait_for_timeout(120)
        check("excerto ajustado", await pg.evaluate("() => ordenados(atual())[1].excerto_literal") == "É agitado e não fala nada na sala.")
        # terceiro excerto com uma âncora
        await selecionar(pg, "Reconhece algumas letras do próprio nome."); await pg.click("#b-novo"); await pg.wait_for_timeout(120)
        await pg.click('#editor .chip.dim[data-v="DMC"]'); await pg.click('#editor .anc[data-v="M4"]'); await pg.click('#editor .chip[data-f="esp_nivel"][data-v="Nivel 2 - Indicio parcial"]')
        r = await pg.evaluate("() => { const p = atual(); return {r: resumoDoParecer(p), n: p.excertos.length} }")
        check("níveis 1/1/1 e equilíbrio", r["r"]["niv"] == {"Ausencia": 1, "Traco": 1, "Lastro": 1} and r["r"]["pred"] == "Equilibrio", str(r["r"]["niv"]))
        check("emergentes do parecer", r["r"]["emNivel"] == {"esp_nivel": "Nivel 2 - Indicio parcial", "blg_nivel": "Nivel 2 - Registro deficitario", "acu_nivel": "NAO_MENCIONADO"}, str(r["r"]["emNivel"]))
        check("ausências calculadas", r["r"]["aus"]["dimensao"] == ["DMF", "DMS"] and "DBri" in r["r"]["aus"]["direito"], str(r["r"]["aus"]))

        print("== 5. fechamento e finalização")
        await pg.click('button.passo[data-v="fec"]'); await pg.wait_for_timeout(100)
        check("finalizar bloqueado antes da síntese", not await pg.is_enabled("#b-finalizar"))
        await pg.select_option("#rep", index=1); await pg.fill("#sint", "Parecer curto, com um trecho bem ancorado e um rótulo."); await pg.wait_for_timeout(100)
        check("finalizar liberado", await pg.is_enabled("#b-finalizar"))
        await pg.click("#b-finalizar"); await pg.click('[data-act="finalizar-ok"]'); await pg.wait_for_timeout(300)
        r = await pg.evaluate("async () => { const p = atual(); return {reg: p.id_registro, st: p.status, ok: await integro(p.registro), ks: p.excertos.map(e => e.k), rep: p.fechamento.excerto_representativo, n: S.meta.contador, o: p.registro} }")
        check("recebeu REG-0001", r["reg"] == "REG-0001" and r["st"] == "finalizado")
        check("registro íntegro", r["ok"] is True)
        check("chaves viram ids de excerto", r["ks"] == ["P12-E01", "P12-E02", "P12-E03"] and r["rep"] == "P12-E01", str(r["ks"]))
        o = r["o"]
        check("JSON: MC/MS e nível derivados", [(e["dimensao_nivel"], e["nivel_registro"], e["n_ancoras"]) for e in o["excertos"]] == [("MC", "Lastro", 3), ("MS", "Ausencia", 0), ("MC", "Traco", 1)], str([(e["dimensao_nivel"], e["nivel_registro"]) for e in o["excertos"]]))
        check("JSON: extensão calculada", o["parecer"]["extensao_palavras"] == len(TEXTO.split()))
        check("JSON: predominante e ausências", o["parecer"]["nivel_registro_predominante"] == "Equilibrio" and o["ausencias"]["dimensao_ausente"] == ["DMF", "DMS"])
        # conferência independente do resumo (SHA-256 em Python)
        resto = {k: v for k, v in o.items() if k != "integridade"}
        py = "sha256:" + hashlib.sha256(json.dumps(resto, ensure_ascii=False, separators=(",", ":")).encode("utf-8")).hexdigest()
        check("resumo SHA-256 confere fora do navegador", py == o["integridade"]["resumo"], py[:24] + " vs " + o["integridade"]["resumo"][:24])
        check("registro alterado é detectado", await pg.evaluate("async () => { const o = copia(atual().registro); o.excertos[0].dimensao_dominante = 'DMF'; return await integro(o) }") is False)
        await pg.click('[data-act="fechar"]')
        check("travado: fichas desabilitadas", await pg.evaluate("() => { ACOES.passo({dataset:{v:'cod'}}); return [...document.querySelectorAll('#editor .chip, #editor .anc')].every(b => b.disabled) }"))
        check("contador = 1", r["n"] == 1)
        check("progresso 1 de 60", "1" in await pg.inner_text("#prog b"))

        print("== 6. correção por nova versão")
        await pg.click('[data-act="corrigir"]'); await pg.wait_for_timeout(150)
        r = await pg.evaluate("() => { const p = atual(); return {st: p.status, v: p.versao, sub: p.substitui, n: p.excertos.length, k: p.excertos[0].k} }")
        check("versão 2 em rascunho", r["st"] == "rascunho" and r["v"] == 2 and r["sub"] == "REG-0001" and r["n"] == 3)
        await pg.click('#tira .exb >> nth=2'); await pg.click('#editor .anc[data-v="M1"]'); await pg.wait_for_timeout(80)
        await pg.click('button.passo[data-v="fec"]'); await pg.wait_for_timeout(80)
        check("v2 pronta para finalizar", await pg.is_enabled("#b-finalizar"))
        await pg.click("#b-finalizar"); await pg.click('[data-act="finalizar-ok"]'); await pg.wait_for_timeout(300); await pg.click('[data-act="fechar"]')
        r = await pg.evaluate("() => ({reg: atual().id_registro, ant: todos().find(p => p.id_registro === 'REG-0001').status, por: todos().find(p => p.id_registro === 'REG-0001').substituido_por, fin: finalizados().length, novoNivel: atual().registro.excertos[2].nivel_registro})")
        check("v2 = REG-0002; v1 substituída", r["reg"] == "REG-0002" and r["ant"] == "substituido" and r["por"] == "REG-0002" and r["fin"] == 1, str(r))
        check("correção refletida no registro", r["novoNivel"] == "Lastro")

        print("== 7. rascunho, exclusão e persistência local")
        await novo_parecer(pg, "P13"); await pg.press("#ncod", "Enter"); await pg.wait_for_timeout(150)
        await pg.click('[data-act="excluir-parecer"]'); await pg.click('[data-act="excluir-parecer-ok"]'); await pg.wait_for_timeout(150)
        check("rascunho excluído", await pg.evaluate("() => !todos().some(p => p.identificacao.codigo_parecer === 'P13')"))
        await pg.reload(); await pg.wait_for_timeout(900)
        r = await pg.evaluate("async () => { const f = finalizados()[0]; return {cods: todos().map(p => p.identificacao.codigo_parecer + ':' + p.status).sort(), n: f.excertos.length, lit: f.excertos[0].excerto_literal.slice(0, 12), ok: await integro(f.registro), cont: S.meta.contador, guardadoCompacto: !JSON.parse(localStorage.getItem('pibic:p:' + f.key)).excertos} }")
        check("dados voltam após recarregar", r["cods"] == ["EX07:rascunho", "P12:finalizado", "P12:substituido"], str(r["cods"]))
        check("finalizado reabre com excertos", r["n"] == 3 and r["lit"] == "Na roda de c" and r["ok"] is True)
        check("finalizado guardado em forma compacta", r["guardadoCompacto"] is True)
        check("contador preservado", r["cont"] == 2)

        print("== 8. ZIP, CSV, fichas, backup e importação")
        z = await pg.evaluate("""async () => { const { regs, hist } = conjuntoFinal(); const t = tabelasCsv(regs);
            const blob = await montarZip([{nome:'manifesto.json', dados: JSON.stringify(manifestoDe(regs, hist))}, {nome:'consolidado/excertos.csv', dados: t.excertos}, {nome:'consolidado/pareceres.csv', dados: t.pareceres},
              {nome:'consolidado/ausencias.csv', dados: t.ausencias}, {nome:'fichas/P12.md', dados: fichaMd(regs[0])}, {nome:'pareceres/ç é.json', dados: JSON.stringify(regs[0])}]);
            const u = new Uint8Array(await blob.arrayBuffer()); let s = ''; u.forEach(x => s += String.fromCharCode(x)); return btoa(s); }""")
        zf = zipfile.ZipFile(io.BytesIO(base64.b64decode(z)))
        check("ZIP válido", zf.testzip() is None and "pareceres/ç é.json" in zf.namelist(), str(zf.namelist()))
        ex = zf.read("consolidado/excertos.csv").decode("utf-8-sig").split("\r\n")
        cab = ex[0].replace('"', "").split(";")
        check("CSV de excertos: cabeçalho com colunas 0/1", all(c in cab for c in ["M1", "M5", "DBri", "ET", "PDia", "N_Ancoras", "Imigracao"]) and len(ex) == 4, str(cab))
        l1 = dict(zip(cab, [c.strip('"') for c in ex[1].split('";"')]))
        check("CSV: linha 1 coerente", l1["Nivel_Registro"] == "Lastro" and l1["M1"] == "1" and l1["M3"] == "0" and l1["DPar"] == "1" and l1["DBri"] == "0" and l1["Direitos"] == "DPar, DExpr", str({k: l1[k] for k in ["Nivel_Registro", "M1", "M3", "DPar", "Direitos"]}))
        man = json.loads(zf.read("manifesto.json"))
        check("manifesto: 1 registro e 1 no histórico", man["finalizados"] == 1 and len(man["historico"]) == 1 and man["registros"][0]["id_registro"] == "REG-0002", str(man["finalizados"]))
        md = zf.read("fichas/P12.md").decode()
        check("ficha em Markdown", "# Parecer P12" in md and "| 1 | Na roda de conversa" in md)
        async with pg.expect_download() as dz: await pg.click('[data-act="zip"]'); await pg.click('[data-act="zip-ok"]')
        zd = await dz.value; check("fora do claude.ai: o ZIP baixa direto", zd.suggested_filename.endswith(".zip") and zipfile.ZipFile(await zd.path()).testzip() is None, zd.suggested_filename)
        await pg.evaluate("() => { window.claude = { use: async () => null }; }")   # claude.ai sem a capacidade de downloads
        await pg.click('[data-act="zip"]'); await pg.click('[data-act="zip-ok"]'); await pg.wait_for_timeout(400)
        check("sem download: oferece copiar o pacote", await pg.is_visible("#copiaTxt") and '"pacote-final"' in await pg.input_value("#copiaTxt"))
        pacote = await pg.input_value("#copiaTxt"); await pg.click('[data-act="fechar"]')
        await pg.click('[data-act="backup"]'); await pg.wait_for_timeout(200); backup = await pg.input_value("#copiaTxt"); await pg.click('[data-act="fechar"]')
        check("backup sem o exemplo", '"backup-completo"' in backup and "EX07" not in backup)
        # navegador novo: importar backup
        ctx2 = await b.new_context(viewport={"width": 1440, "height": 900}); pg2 = await ctx2.new_page(); pg2.on("pageerror", lambda e: errs.append("ctx2 " + str(e)))
        await pg2.goto(URL); await pg2.wait_for_timeout(800)
        await pg2.set_input_files("#arqImportar", [{"name": "backup.json", "mimeType": "application/json", "buffer": backup.encode()}]); await pg2.wait_for_timeout(500)
        r = await pg2.evaluate("() => ({cods: todos().filter(p => !p.demo).map(p => p.id_registro + ':' + p.status).sort(), cont: S.meta.contador, txt: document.querySelector('.modal').textContent})")
        check("backup restaurado em outro navegador", r["cods"] == ["REG-0001:substituido", "REG-0002:finalizado"] and r["cont"] == 2, str(r))
        await pg2.click('[data-act="fechar"]')
        await pg2.set_input_files("#arqImportar", [{"name": "backup.json", "mimeType": "application/json", "buffer": backup.encode()}]); await pg2.wait_for_timeout(400)
        r = await pg2.evaluate("() => ({n: todos().filter(p => !p.demo).length, txt: document.querySelector('.modal').textContent})")
        check("reimportar não duplica nem sobrescreve", r["n"] == 2 and "0 pareceres importados" in r["txt"], r["txt"])
        await pg2.click('[data-act="fechar"]')
        # terceiro navegador: importar o pacote (registros avulsos) e um registro adulterado
        ctx3 = await b.new_context(); pg3 = await ctx3.new_page(); await pg3.goto(URL); await pg3.wait_for_timeout(800)
        adulterado = json.loads(pacote)["registros"][0]; adulterado["excertos"][0]["dimensao_dominante"] = "DMF"
        await pg3.set_input_files("#arqImportar", [{"name": "x.json", "mimeType": "application/json", "buffer": json.dumps(adulterado, ensure_ascii=False).encode()}]); await pg3.wait_for_timeout(400)
        r = await pg3.evaluate("() => ({n: todos().filter(p => !p.demo).length, txt: document.querySelector('.modal').textContent})")
        check("registro adulterado recusado", r["n"] == 0 and "alterado depois de gerado" in r["txt"], r["txt"])
        await pg3.click('[data-act="fechar"]')
        await pg3.set_input_files("#arqImportar", [{"name": "pacote.json", "mimeType": "application/json", "buffer": pacote.encode()}]); await pg3.wait_for_timeout(500)
        r = await pg3.evaluate("() => ({cods: todos().filter(p => !p.demo).map(p => p.id_registro + ':' + p.status).sort(), cont: S.meta.contador})")
        check("pacote importado com histórico", r["cods"] == ["REG-0001:substituido", "REG-0002:finalizado"] and r["cont"] == 2, str(r))
        await pg3.click('[data-act="fechar"]')
        await novo_parecer(pg3, "P12"); check("após importar, P12 segue único", not await pg3.is_enabled("#b-criar")); await pg3.click('[data-act="fechar"]')
        await novo_parecer(pg3, "P20"); await pg3.press("#ncod", "Enter"); await pg3.wait_for_timeout(150)
        check("próximo número continua do importado", await pg3.evaluate("async () => await store.proximoNumero()") == 3)

        print("== 9. concordância")
        r = await pg.evaluate("""() => { const pares = []; const add = (a, b, n) => { for (let i = 0; i < n; i++) pares.push([{v:a}, {v:b}]); };
            add(1,1,20); add(1,0,5); add(0,1,10); add(0,0,15); const k = kappa(pares, x => x.v); const u = kappa([[{v:1},{v:1}],[{v:1},{v:1}]], x => x.v);
            return {k: k.k, po: k.po, n: k.n, semVar: u.k, f: [faixaKappa(0.4), faixaKappa(0.41), faixaKappa(0.81), faixaKappa(-0.1), faixaKappa(null)]} }""")
        check("kappa do exemplo clássico = 0,40", abs(r["k"] - 0.4) < 1e-9 and abs(r["po"] - 0.7) < 1e-9 and r["n"] == 50, str(r))
        check("kappa sem variação = indefinido", r["semVar"] is None)
        check("faixas de Landis e Koch", r["f"] == ["razoável", "moderada", "quase perfeita", "pobre", "sem variação"], str(r["f"]))
        await pg.click('.vistas a[href="#concordancia"]'); await pg.wait_for_timeout(150)
        await pg.select_option("#concP", label="EX07 (exemplo)"); await pg.wait_for_timeout(100)
        await pg.click('[data-act="conc-exemplo"]'); await pg.wait_for_timeout(150)
        r = await pg.evaluate("() => { const x = S.conc.res; return {pares: x.pares, soA: x.soA.length, soB: x.soB.length, dim: x.principais[0], niv: x.principais[1], div: x.divergencias.length, blg: x.sinais[1]} }")
        check("pareamento 19 em comum, 1 só em A, 1 só em B", r["pares"] == 19 and r["soA"] == 1 and r["soB"] == 1, str(r))
        check("dimensão: 18 de 19 iguais", r["dim"]["iguais"] == 18 and r["dim"]["n"] == 19)
        check("nível: 16 de 19 iguais", r["niv"]["iguais"] == 16, str(r["niv"]))
        check("BLG: 18 de 19 iguais", r["blg"]["iguais"] == 18, str(r["blg"]))
        check("lista de divergências", r["div"] == 6 and await pg.locator(".dv").count() == 8, str(r["div"]))
        # segunda codificação por arquivo, com texto igual
        arq = await pg.evaluate("async () => JSON.stringify(await selar(registroDe(todos().find(p => p.demo))))")
        await pg.set_input_files("#arqConc", [{"name": "outra.json", "mimeType": "application/json", "buffer": arq.encode()}]); await pg.wait_for_timeout(300)
        r = await pg.evaluate("() => { const x = S.conc.res; return {pares: x.pares, k: x.principais[0].k, div: x.divergencias.length} }")
        check("arquivo idêntico: kappa 1 e nenhuma divergência", r["pares"] == 20 and abs(r["k"] - 1) < 1e-9 and r["div"] == 0, str(r))
        errado = json.loads(arq); errado["parecer"]["codigo_parecer"] = "P99"
        await pg.set_input_files("#arqConc", [{"name": "p99.json", "mimeType": "application/json", "buffer": json.dumps(errado, ensure_ascii=False).encode()}]); await pg.wait_for_timeout(300)
        check("arquivo de outro parecer recusado", "P99" in await pg.inner_text(".al.e"))

        print("== 10. painel e método")
        await pg.click('.vistas a[href="#painel"]'); await pg.wait_for_timeout(150)
        d = await pg.evaluate("() => dadosDoPainel()")
        check("painel usa só finalizados reais", d["N"] == 1 and d["exemplo"] is False and d["E"] == 3 and d["niv"] == {"Ausencia": 1, "Traco": 0, "Lastro": 2}, str({k: d[k] for k in ["N", "E", "niv"]}))
        check("painel: imigrantes e sinais", d["nImig"] == 1 and d["emImig"]["BLG"]["n2"] == 1 and d["em"]["ESP"]["n2"] == 1)
        check("painel: presença por parecer", d["pres"]["DML"] == 1 and d["pres"]["DMF"] == 0 and d["pres"]["DPar"] == 1 and d["occ"]["DPar"] == 1)
        check("painel desenhado", await pg.locator("figure.fig").count() == 6)
        await pg.click('.vistas a[href="#metodo"]'); await pg.wait_for_timeout(100)
        check("método desenhado", await pg.locator("details.livro").count() == 6 and "19 dos 20" in await pg.inner_text(".leitura"))

        print("== 11. kappa conferido fora do navegador")
        await pg.click('.vistas a[href="#concordancia"]'); await pg.wait_for_timeout(100); await pg.select_option("#concP", label="EX07 (exemplo)"); await pg.click('[data-act="conc-exemplo"]'); await pg.wait_for_timeout(150)
        d = await pg.evaluate("() => { const p = S.P[S.conc.chave], B = segundaDeExemplo(p); const A = ordenados(p).map(paraComparar), X = B.excertos.map(paraComparar); const { pares } = parear(A, X); return {dims: pares.map(([a, b]) => [a.dim, b.dim]), niv: pares.map(([a, b]) => [nivelCmp(a), nivelCmp(b)]), kd: S.conc.res.principais[0].k, kn: S.conc.res.principais[1].k} }")
        def kap(pairs):
            n = len(pairs); po = sum(1 for a, c in pairs if a == c) / n; cats = set(x for pr in pairs for x in pr)
            pe = sum((sum(1 for a, _ in pairs if a == k) / n) * (sum(1 for _, c in pairs if c == k) / n) for k in cats); return (po - pe) / (1 - pe)
        check("kappa da dimensão igual ao cálculo em Python", abs(kap(d["dims"]) - d["kd"]) < 1e-9, f'{kap(d["dims"])} vs {d["kd"]}')
        check("kappa do nível igual ao cálculo em Python", abs(kap(d["niv"]) - d["kn"]) < 1e-9, f'{kap(d["niv"])} vs {d["kn"]}')

        print("== 12. trocar o texto de um parecer com excertos")
        await pg.click('.vistas a[href="#pareceres"]'); await pg.wait_for_timeout(100)
        await novo_parecer(pg, "P14"); await pg.press("#ncod", "Enter"); await pg.wait_for_timeout(150)
        await pg.fill("#txt", "Gosta de pintar. No pátio, corre com os colegas. Gosta de pintar."); await pg.click('button.passo[data-v="cod"]'); await pg.wait_for_timeout(100)
        await selecionar(pg, "No pátio, corre com os colegas."); await pg.click("#b-novo"); await pg.wait_for_timeout(100)
        await pg.evaluate("""() => { const box = document.querySelector('#texto'), t = box.textContent, i = t.lastIndexOf('Gosta de pintar.'); const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT); let pos = 0, n;
            while ((n = w.nextNode())) { if (i < pos + n.data.length) break; pos += n.data.length; } const r = document.createRange(); r.setStart(n, i - pos); r.setEnd(n, i - pos + 16); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }""")
        await pg.wait_for_timeout(120); await pg.click("#b-novo"); await pg.wait_for_timeout(100)
        r = await pg.evaluate("() => ordenados(atual()).map(e => [e.inicio, e.excerto_literal])")
        check("segunda ocorrência do mesmo trecho codificada", r == [[17, "No pátio, corre com os colegas."], [49, "Gosta de pintar."]], str(r))
        await pg.click('button.passo[data-v="doc"]'); await pg.click('[data-act="editar-texto"]')
        await pg.fill("#txt", "Texto novo no começo. Gosta de pintar. No pátio, corre com os colegas. Gosta de pintar."); await pg.click('[data-act="usar-texto"]'); await pg.wait_for_timeout(100)
        r = await pg.evaluate("() => { const p = atual(); return ordenados(p).map(e => [e.inicio, e.ancora_ok, p.texto_parecer.slice(e.inicio, e.fim) === e.excerto_literal]) }")
        check("excertos relocalizados após texto novo", r == [[39, True, True], [71, True, True]], str(r))
        await pg.click('[data-act="editar-texto"]'); await pg.fill("#txt", "Texto novo no começo. Gosta de pintar. Brinca no pátio."); await pg.click('[data-act="usar-texto"]'); await pg.wait_for_timeout(100)
        r = await pg.evaluate("() => { const p = atual(); return {ok: p.excertos.map(e => e.ancora_ok).sort(), pend: pendenciasDe(p)} }")
        check("trecho que sumiu vira pendência", r["ok"] == [False, True] and r["pend"] >= 1, str(r))

        print("== 13. rota, teclado e foco")
        await pg.click('button.passo[data-v="cod"]'); await pg.wait_for_timeout(80)
        await pg.click('#tira .exb >> nth=0'); await pg.wait_for_timeout(60)
        await pg.focus('#editor .anc[data-v="M2"]'); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(80)
        r = await pg.evaluate("() => ({foco: document.activeElement && document.activeElement.dataset.v, press: document.activeElement && document.activeElement.getAttribute('aria-pressed')})")
        check("foco permanece no controle após marcar pelo teclado", r["foco"] == "M2" and r["press"] == "true", str(r))
        await pg.click('aside .btn.pri[data-act="novo"]'); await pg.keyboard.press("Escape"); await pg.wait_for_timeout(60)
        check("Esc fecha a janela", await pg.evaluate("() => document.querySelector('#modalRaiz').innerHTML === ''"))
        pg4 = await ctx.new_page(); await pg4.goto(URL + "#painel"); await pg4.wait_for_timeout(800)
        check("rota #painel abre o painel", await pg4.evaluate("() => S.vista === 'painel' && !!document.querySelector('figure.fig')"))
        await pg4.evaluate("() => { location.hash = '#metodo' }"); await pg4.wait_for_timeout(200)
        check("mudança de rota troca a vista", await pg4.evaluate("() => S.vista === 'metodo' && document.querySelector('.vistas a[aria-current=page]').dataset.vista === 'metodo'"))

        print("== 14. dúvidas e duas abas")
        await pg.click('.vistas a[href="#pareceres"]'); await pg.wait_for_timeout(100)
        await pg.click('.item:has-text("P14")'); await pg.wait_for_timeout(100); await pg.click('#tira .exb >> nth=0'); await pg.wait_for_timeout(60)
        await pg.check("#duv"); await pg.fill("#obs", "Brincar ou explorar?"); await pg.wait_for_timeout(900)
        await pg.click('.vistas a[href="#painel"]'); await pg.wait_for_timeout(150)
        r = await pg.evaluate("() => ({n: duvidasMarcadas().length, txt: textoDasDuvidas()})")
        check("dúvidas reunidas no painel", r["n"] == 1 and "P14, excerto" in r["txt"] and "Brincar ou explorar?" in r["txt"] and await pg.locator('figure.fig .dv').count() == 1, str(r))
        aba2 = await ctx.new_page(); aba2.on("pageerror", lambda e: errs.append("aba2 " + str(e))); await aba2.goto(URL); await aba2.wait_for_timeout(900)
        antes = await aba2.evaluate("async () => await store.proximoNumero()")
        # a primeira aba cria e finaliza um parecer; a segunda precisa enxergar o número novo
        await pg.evaluate("""async () => { const p = novoParecer('P40'); Object.assign(p.identificacao, {tipo_instituicao:'EMEB', semestre:'2026/2', idade:'5', imigracao:'Nao', anonimizado:true});
          p.texto_parecer = 'Corre no parque.'; const a = novoExcerto(0, 16, 'Corre no parque.'); a.dimensao_dominante = 'DMF'; p.excertos.push(a); p.fechamento.excerto_representativo = a.k; p.fechamento.sintese_uma_frase = 'x';
          S.P[p.key] = p; await store.gravarJa(p); await finalizar(p); }""")
        await aba2.wait_for_timeout(700)
        r = await aba2.evaluate("async () => ({prox: await store.proximoNumero(), tem: todos().some(p => p.identificacao.codigo_parecer === 'P40' && p.status === 'finalizado'), dup: !!codigoEmUso('P40')})")
        check("outra aba: número de registro não se repete", antes == 3 and r["prox"] == 4, f"{antes} -> {r}")
        check("outra aba: parecer novo aparece e o código fica reservado", r["tem"] and r["dup"], str(r))

        check("nenhum erro de página", not errs, str(errs[:3]))
        await b.close()
    print(f"\n{len(OK)} ok, {len(FAIL)} falhas");
    if FAIL: print("FALHAS:", FAIL); sys.exit(1)
asyncio.run(main())
