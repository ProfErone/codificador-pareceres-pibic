/* ---------- desenho: concordância ---------- */
function htmlConcordancia() {
  const cand = todos().filter(p => p.status !== "substituido" && p.excertos.length)
    .sort((a, b) => (a.demo - b.demo) || ordenaCodigo(a.identificacao.codigo_parecer, b.identificacao.codigo_parecer));
  if (!cand.some(p => p.key === S.conc.chave)) { S.conc = { chave: cand.length ? cand[0].key : null, B: null, res: null, erro: "" }; }
  const p = S.P[S.conc.chave] || null, res = S.conc.res;
  const lendo = S.ia.estado === "lendo";
  const temIA = !!(p && p.segunda_leitura);
  const esq = `<div class="ficha pilha">
    <div class="campo"><label for="concP">Parecer</label>
      ${cand.length ? `<select id="concP" class="inp">${cand.map(x => `<option value="${x.key}"${x.key === S.conc.chave ? " selected" : ""}>${esc(x.identificacao.codigo_parecer)}${x.demo ? " (exemplo)" : x.status === "finalizado" ? ` (${esc(x.id_registro)})` : " (rascunho)"}</option>`).join("")}</select>` : `<p class="muted">Ainda não há parecer com excertos.</p>`}</div>
    ${p ? `<div class="campo"><span class="rot">Segunda codificação</span>
      <button class="btn" data-act="conc-arquivo">Carregar o JSON da segunda codificadora</button>
      <input type="file" id="arqConc" accept=".json,application/json" hidden>
      ${p.demo ? `<button class="btn" data-act="conc-exemplo">Usar a segunda codificação simulada</button>` : ""}
      <span id="iaBox" class="pilha" style="gap:6px"${S.temIA ? "" : " hidden"}>
        ${lendo ? `<span class="al i"><b>Lendo</b><span>O Claude está codificando os trechos. Pode levar até um minuto.</span></span><button class="btn" data-act="ia-parar">Parar</button>`
          : `<button class="btn" data-act="ia-pedir">${temIA ? "Refazer a segunda leitura por IA" : "Pedir uma segunda leitura por IA"}</button>${temIA ? `<button class="btn" data-act="ia-ver">Comparar com a leitura por IA de ${dataHora(p.segunda_leitura.feita_em)}</button>` : ""}`}
      </span>
      ${S.conc.erro ? `<div class="al e"><b>Arquivo recusado</b><span>${esc(S.conc.erro)}</span></div>` : ""}</div>` : ""}
    <p class="dica">A segunda pessoa codifica o mesmo parecer na conta dela, a partir do mesmo texto, e baixa o JSON. Carregue esse arquivo aqui: a sua codificação não é alterada.</p>
  </div>`;
  let dir;
  if (!res) dir = `<div class="ficha pilha"><h2>O que esta página mede</h2>
      <p>Duas pessoas codificando o mesmo trecho devem chegar ao mesmo resultado. Aqui essa regra vira número: para cada decisão, a proporção de trechos em que as duas codificações coincidem e o kappa de Cohen, que desconta a coincidência esperada por acaso.</p>
      <p>As divergências saem em lista, prontas para a reunião de orientação. Cada divergência resolvida melhora o Livro de Códigos.</p>
      <p class="dica">Escolha um parecer e carregue a segunda codificação.</p></div>`;
  else {
    const kTxt = k => k === null ? "—" : k.toFixed(2).replace(".", ",");
    const linhas = lista => lista.map(l => `<tr><td>${l.cod ? `<span class="cod">${l.cod}</span> ` : ""}${esc(l.rot)}</td><td class="num">${l.iguais} de ${l.n}</td><td class="num">${l.po === null ? "—" : Math.round(100 * l.po) + "%"}</td>
      <td class="num"><span class="kap"><span class="tr" aria-hidden="true"><i style="width:${l.k === null ? 0 : Math.max(0, Math.min(1, l.k)) * 100}%"></i></span>${kTxt(l.k)}</span></td><td>${faixaKappa(l.k)}</td></tr>`).join("");
    const cab = `<thead><tr><th>Decisão</th><th class="num">Iguais</th><th class="num">Concordância</th><th class="num">Kappa</th><th>Leitura</th></tr></thead>`;
    const desc = x => { const nv = nivelCmp(x); return { dim: x.dim || "sem dimensão", nv: ROT_NIVEL[nv], marcas: x.marcas.length ? x.marcas.join(", ") : "nenhuma marca" }; };
    const sinaisDe = (x, o) => EMERG.filter(g => { const k = g.c.toLowerCase(); return x[k] !== o[k]; }).map(g => `${g.c}: ${rotEmerg(g, x[g.c.toLowerCase()]).toLowerCase()}`).join("; ");
    const lado = (tit, x, o, motivo) => { const a = desc(x), b = desc(o), sn = sinaisDe(x, o); const d = (k) => a[k] !== b[k] ? `<span class="dif">${esc(a[k])}</span>` : esc(a[k]);
      return `<div><b>${tit}</b>${d("dim")}, ${d("nv")} (${d("marcas")})${sn ? `; <span class="dif">${esc(sn)}</span>` : ""}${motivo ? `<br><span class="muted">${esc(motivo)}</span>` : ""}</div>`; };
    const [kDim, kNiv] = res.principais;
    dir = `<div class="ficha pilha">
      <h2>${esc(p.identificacao.codigo_parecer)} comparado com a segunda codificação</h2><p class="dica">${esc(res.origem)}</p>
      <div class="kpis">
        <div class="kpi"><b>${res.pares}</b><span>${res.pares === 1 ? "trecho recortado" : "trechos recortados"} pelas duas</span><small>${res.soA.length} só na sua, ${res.soB.length} só na segunda</small></div>
        <div class="kpi"><b>${kTxt(kDim.k)}</b><span>kappa da dimensão</span><small>${kDim.po === null ? "" : Math.round(100 * kDim.po) + "% de concordância, " + faixaKappa(kDim.k)}</small></div>
        <div class="kpi"><b>${kTxt(kNiv.k)}</b><span>kappa do nível do registro</span><small>${kNiv.po === null ? "" : Math.round(100 * kNiv.po) + "% de concordância, " + faixaKappa(kNiv.k)}</small></div>
      </div>
      <div class="rol"><table class="t">${cab}<tbody>${linhas(res.principais)}</tbody></table></div>
      <details class="nums" data-id="conc-ref"${ABERTOS.has("conc-ref") ? " open" : ""}><summary>Direitos, Campos e categorias matriz</summary><div class="rol"><table class="t">${cab}<tbody>${linhas(res.referenciais)}</tbody></table></div></details>
      <details class="nums" data-id="conc-sin"${ABERTOS.has("conc-sin") ? " open" : ""}><summary>Sinais (ESP, BLG, ACU)</summary><div class="rol"><table class="t">${cab}<tbody>${linhas(res.sinais)}</tbody></table></div></details>
      <p class="dica">Kappa de Cohen (1960). Leitura das faixas segundo Landis e Koch (1977): até 0,20 leve; até 0,40 razoável; até 0,60 moderada; até 0,80 substancial; acima, quase perfeita. Com poucos trechos, o kappa oscila muito: leia junto com a concordância. O traço indica que não houve variação para medir.</p>
      <h2>Divergências para a orientação</h2>
      ${res.divergencias.length || res.soA.length || res.soB.length ? `<div class="div">
        ${res.divergencias.map(([a, b]) => `<div class="dv"><q>${esc(a.texto)}</q><div class="par">${lado("Sua codificação", a, b)}${lado("Segunda codificação", b, a, b.motivo)}</div></div>`).join("")}
        ${res.soA.map(a => `<div class="dv"><q>${esc(a.texto)}</q><div class="par"><div><b>Sua codificação</b>${esc(a.dim || "sem dimensão")}, ${ROT_NIVEL[nivelCmp(a)]}</div><div><b>Segunda codificação</b><span class="dif">trecho não recortado</span></div></div></div>`).join("")}
        ${res.soB.map(b => `<div class="dv"><q>${esc(b.texto)}</q><div class="par"><div><b>Sua codificação</b><span class="dif">trecho não recortado</span></div><div><b>Segunda codificação</b>${esc(b.dim || "sem dimensão")}, ${ROT_NIVEL[nivelCmp(b)]}</div></div></div>`).join("")}
        </div><div class="linha"><button class="btn" data-act="conc-copiar">Copiar a lista de divergências</button></div>`
        : `<p>Nenhuma divergência em dimensão, âncoras ou rótulo nos trechos comparados.</p>`}
    </div>`;
  }
  return `<div class="coluna"><div class="titulo-vista"><h1>Concordância entre codificações</h1>
    <p>A regra da objetividade, medida: o mesmo parecer codificado por duas pessoas, comparado trecho a trecho.</p></div>
    <div class="conc">${esq}${dir}</div></div>`;
}
function pautaDeDivergencias(p, res) {
  const d = x => `${x.dim || "sem dimensão"}, ${ROT_NIVEL[nivelCmp(x)]} (${x.marcas.length ? x.marcas.join(", ") : "nenhuma marca"})` + EMERG.filter(g => x[g.c.toLowerCase()] !== NM).map(g => `; ${g.c}: ${rotEmerg(g, x[g.c.toLowerCase()]).toLowerCase()}`).join("");
  const L = [`Divergências de codificação: parecer ${p.identificacao.codigo_parecer}`, res.origem, ""];
  res.divergencias.forEach(([a, b], i) => { L.push(`${i + 1}. «${a.texto}»`, `   Primeira codificação: ${d(a)}`, `   Segunda codificação: ${d(b)}${b.motivo ? ". Motivo: " + b.motivo : ""}`, ""); });
  res.soA.forEach(a => L.push(`Só na primeira codificação: «${a.texto}» (${d(a)})`, ""));
  res.soB.forEach(b => L.push(`Só na segunda codificação: «${b.texto}» (${d(b)})`, ""));
  return L.join("\n");
}

/* ---------- desenho: método ---------- */
function htmlMetodo() {
  const tabela = (itens, comNivel) => `<div class="rol"><table class="t"><thead><tr><th>Código</th><th>Categoria</th><th>O que observar</th><th>Exemplo</th></tr></thead><tbody>${itens.map(x =>
    `<tr><td class="cod">${x.c}</td><td>${esc(x.nome || x.n)}</td><td>${esc(x.d)}${x.ind ? ` <span class="muted">Indicadores: ${esc(x.ind)}.</span>` : ""}</td><td>${x.ex ? `<i>“${esc(x.ex)}”</i>` : ""}</td></tr>`).join("")}</tbody></table></div>`;
  const livro = (titulo, regra, itens) => `<details class="livro"><summary>${titulo} <span class="muted" style="font-weight:400">${regra}</span></summary>${tabela(itens)}</details>`;
  return `<div class="coluna leitura">
    <div class="titulo-vista"><h1>O instrumento em quatro perguntas</h1>
      <p>Cada trecho do parecer responde a quatro perguntas. Cada pergunta alimenta uma parte dos resultados da pesquisa e nunca se soma às outras.</p>
      <div><button class="btn" data-act="exemplo">Abrir o parecer de exemplo</button></div></div>

    <div class="perg">
      <div><span>Pergunta</span><span>O que se marca no trecho</span><span>O que responde na pesquisa</span></div>
      <div><h3>De que fala?</h3><span>Uma dimensão dominante: física/motora, socioafetiva, cognitiva ou linguística.</span><span>Quais dimensões do desenvolvimento os pareceres registram, e quais deixam de registrar.</span></div>
      <div><h3>Com que apoio?</h3><span>As âncoras de observação presentes (M1 a M4) e o alerta de rótulo (M5).</span><span>Hipótese 1: a documentação registra atributos da criança ou observações?</span></div>
      <div><h3>Em diálogo com quê?</h3><span>Direitos de Aprendizagem, Campos de Experiência e categorias do projeto matriz.</span><span>Objetivo específico 2: a presença do referencial da BNCC nos registros.</span></div>
      <div><h3>Que sinais traz?</h3><span>Escolarização precoce, barreira linguística e acolhimento cultural, quando aparecem.</span><span>Hipótese 2: escolarização precoce; e o tratamento da diversidade linguística e cultural.</span></div>
    </div>

    <section><h2>A lei do lastro</h2>
      <p>Um registro tem lastro na medida em que diz em que situação, quando, que foi observado e como a criança faz. Essas são as quatro âncoras de observação. O nível do registro é o número de âncoras presentes no trecho, e por isso não é escolhido: é calculado.</p>
      <div class="regua" role="img" aria-label="Sem lastro: nenhuma âncora. Traço: uma âncora. Lastro: duas ou mais.">
        <div class="Ausencia on"><b>Sem lastro</b><span>nenhuma âncora, menção sem situação (MS)</span></div>
        <div class="Traco on"><b>Traço</b><span>1 âncora, menção com situação (MC)</span></div>
        <div class="Lastro on"><b>Lastro</b><span>2 ou mais, menção com situação (MC)</span></div></div>
      <p>O rótulo (M5) não altera o nível: é contado à parte e cruzado com ele. No parecer P07 da planilha original, esta lei reproduz a marcação MC ou MS feita à mão em ${leiNoExemplo()} dos ${EXEMPLO.length} excertos; o único diferente é um trecho de contexto familiar, que não descreve uma situação observada.</p></section>

    <section><h2>O que o instrumento garante</h2>
      <p>As cinco regras de Bardin para as categorias (exclusividade, homogeneidade, exaustividade, objetividade e pertinência) deixam de depender da atenção de quem codifica: estão na construção do instrumento. Duas garantias se somam a elas: a fidelidade ao texto e a rastreabilidade do registro.</p>
      <ol class="leis">
        <li><b>Fidelidade</b><span>O excerto é selecionado no texto do parecer, nunca digitado. A cópia é sempre literal.</span></li>
        <li><b>Exclusividade</b><span>Os excertos não se sobrepõem, e cada um tem uma só dimensão dominante. Nada é contado duas vezes.</span></li>
        <li><b>Homogeneidade</b><span>Cada pergunta tem a sua contagem. Dimensões, direitos, campos, matriz, sinais e marcas nunca se somam.</span></li>
        <li><b>Exaustividade</b><span>O que não aparece é calculado e registrado: dimensões, direitos, campos e categorias ausentes, e quanto do texto foi codificado.</span></li>
        <li><b>Objetividade</b><span>O nível do registro é calculado pelas âncoras, e a concordância entre duas codificações é medida pelo kappa de Cohen.</span></li>
        <li><b>Pertinência</b><span>Cada código responde a uma hipótese ou a um objetivo do projeto, como mostra o quadro das quatro perguntas.</span></li>
        <li><b>Rastreabilidade</b><span>O parecer finalizado recebe um número, fica travado e leva um resumo de integridade. Corrigir gera nova versão, sem apagar a anterior. Cada código tem um só parecer ativo e cada número, um só registro, também ao reunir dados de dois navegadores.</span></li>
      </ol></section>

    <section><h2>O que é calculado, e nunca digitado</h2>
      <div class="rol"><table class="t calc"><tbody>
        <tr><td>Extensão do parecer</td><td>Palavras do texto colado.</td></tr>
        <tr><td>MC ou MS</td><td>MC quando há pelo menos uma âncora; MS quando não há nenhuma.</td></tr>
        <tr><td>Nível do registro de cada excerto</td><td>Sem lastro, traço ou lastro, pelo número de âncoras.</td></tr>
        <tr><td>Nível predominante do parecer</td><td>O nível presente em mais da metade dos excertos. Se nenhum passa da metade, equilíbrio.</td></tr>
        <tr><td>Ausências</td><td>Dimensões, direitos, campos e categorias matriz que nenhum excerto registrou.</td></tr>
        <tr><td>Sinais no parecer</td><td>O que foi marcado nos excertos. Escolarização precoce fica com o nível mais alto; barreira linguística e acolhimento cultural com os dois níveis no mesmo parecer ficam como registro misto.</td></tr>
        <tr><td>Número de registro</td><td>Sequencial, dado na finalização. Nunca se repete nem volta atrás.</td></tr>
      </tbody></table></div></section>

    <section><h2>Livro de códigos</h2>
      ${livro("Dimensões do desenvolvimento", "uma dominante por excerto", DIMS)}
      ${livro("Âncoras de observação e rótulo", "todas as presentes", [...ANCORAS, ROTULO])}
      ${livro("Direitos de Aprendizagem", "todos os presentes", DIREITOS)}
      ${livro("Campos de Experiência", "todos os presentes", CAMPOS)}
      ${livro("Categorias matriz", "todas as presentes", MATRIZ)}
      ${livro("Categorias emergentes", "só quando aparecem", EMERG.flatMap(g => [{ c: g.c, n: g.n, d: g.d, ex: "" }, ...g.niveis.map(x => ({ c: "", n: x.n, d: x.d, ex: x.ex }))]))}
      <p class="dica">${esc(APP.livro)}. O livro original trazia nove marcas; ficaram cinco: M1 a M4 definem o nível e M5 é o alerta de rótulo.</p></section>

    <section><h2>Cuidados com os dados</h2>
      <p>Os pareceres tratam de crianças. O instrumento pede a confirmação de que o texto está anonimizado antes de finalizar. Os dados ficam na conta de quem codifica, ou no navegador dela quando a conta não permite, e saem apenas nos arquivos que a própria pessoa baixa. A segunda leitura por IA só acontece a pedido, e não altera a codificação.</p></section>

    <section><h2>Referências</h2><ul class="refs">${REFERENCIAS.map(r => `<li>${esc(r)}</li>`).join("")}</ul>
      <p class="dica">${esc(APP.nome)}, versão ${esc(APP.versao)}. Formato dos dados: ${esc(APP.schema)}.</p></section>
  </div>`;
}
