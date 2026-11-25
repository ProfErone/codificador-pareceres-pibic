import glob, sys, subprocess, pathlib
root = pathlib.Path(__file__).parent
css = (root/"src/style.css").read_text(encoding="utf-8")
NOMES = {"01": "configuração e livro de códigos", "02": "utilidades", "03": "modelo, lei do lastro e registro", "04": "armazenamento e migração", "05": "arquivos: ZIP, CSV, fichas, backup, importação",
         "06": "concordância e segunda leitura", "07": "desenho: base", "08": "desenho: folha do parecer", "09": "desenho: painel", "10": "desenho: concordância e método", "11": "ações e eventos", "12": "exemplo e início"}
partes = []
for f in sorted(glob.glob(str(root/"src/js/*.js"))):
    n = pathlib.Path(f).name[:2]
    partes.append(f"\n/* ======================= SEÇÃO {n} · {NOMES[n]} ======================= */\n" + pathlib.Path(f).read_text(encoding="utf-8"))
js = "\n".join(partes).replace('\n/* ======================= SEÇÃO 01', '"use strict";\n/* ======================= SEÇÃO 01', 1).replace('*/\n"use strict";\n', '*/\n', 1)
assert "</script" not in js.lower(), "script fechado dentro do JS"
html = (root/"src/index.tpl.html").read_text(encoding="utf-8").replace("/*__CSS__*/", css).replace("/*__JS__*/", js)
(root/"dist").mkdir(exist_ok=True)
(root/"dist/index.html").write_text(html, encoding="utf-8")
(root/"dist/app.js").write_text(js, encoding="utf-8")
r = subprocess.run(["node", "--check", str(root/"dist/app.js")], capture_output=True, text=True)
print("bytes", len(html.encode()), "| js lines", js.count("\n"), "| syntax", "OK" if r.returncode == 0 else r.stderr)
sys.exit(r.returncode)
