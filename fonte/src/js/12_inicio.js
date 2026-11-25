/* ---------- parecer de exemplo ----------
   Os 20 excertos do parecer P07 da planilha original, com as observações da planilha.
   Cada linha: [excerto, dimensão, MC/MS anotado na planilha, direitos, campos, matriz, ESP, BLG, ACU, marcas da planilha, observação].
   As marcas M6 a M9 da planilha são descartadas; o nível é calculado pela lei do lastro. */
const EXEMPLO = [
  ["É uma criança alegre, comunicativa e muito querida por todos na escola.", "DMS", "MS", ["DCon"], [], [], 0, 0, 0, ["M5"], "Adjetivos de valor sem situação observável."],
  ["Tem uma boa relação com os colegas e com as professoras.", "DMS", "MS", ["DCon"], [], [], 0, 0, 0, ["M5"], "Afirmação genérica sobre convivência."],
  ["é uma criança ativa e bastante coordenada.", "DMF", "MS", [], [], [], 0, 0, 0, ["M5"], "Exemplo clássico de menção sem situação."],
  ["No parque, tem subido no trepa-trepa com mais segurança do que no início do semestre, e já consegue se equilibrar na trave baixa sem apoio.", "DMF", "MC", [], ["CG"], [], 0, 0, 0, ["M1", "M2", "M4", "M6"], "Excerto-modelo: situação, progressão temporal, verbo de processo."],
  ["Nas atividades de recorte, segura a tesoura com firmeza e acompanha a linha desenhada com atenção.", "DMF", "MC", [], ["TS"], [], 0, 0, 0, ["M1", "M4", "M6"], "Situação nomeada. Sem associação com escrita."],
  ["fala muito bem.", "DML", "MS", [], [], [], 0, 0, 0, ["M5"], "Trecho curto e avaliativo."],
  ["Ao recontar a história da roda de leitura, lembrou a ordem dos acontecimentos e incluiu as falas dos personagens com entonação.", "DML", "MC", ["DExpr"], ["EF"], [], 0, 0, 0, ["M1", "M4", "M6"], "Excelente exemplo de lastro."],
  ["Costuma perguntar sobre o significado de palavras novas e gosta de contar o que fez no fim de semana para os colegas.", "DML", "MC", ["DExpr", "DPar"], [], [], 0, 0, 0, ["M4", "M6"], "Situação genérica: sem M1 explícito."],
  ["É muito inteligente. Compreende bem as propostas e resolve as atividades com facilidade.", "DMC", "MS", [], [], [], 0, 0, 0, ["M5"], "Dois períodos avaliativos."],
  ["Ao montar a torre com blocos, testou várias formas de encaixe até conseguir que ficasse em pé, e depois explicou aos colegas como havia feito.", "DMC", "MC", ["DExpr", "DPar"], ["ET"], [], 0, 0, 0, ["M1", "M4", "M6"], "Modelo de descrição de processo cognitivo."],
  ["tem bom comportamento.", "DMS", "MS", [], [], [], 0, 0, 0, ["M5"], "Julgamento comportamental sem contexto."],
  ["Nas atividades em pequenos grupos, tem procurado os colegas para dividir os materiais e espera a sua vez de falar, embora às vezes ainda se precipite quando está muito animada.", "DMS", "MC", ["DCon"], ["EO"], [], 0, 0, 0, ["M1", "M4"], "A ressalva faz parte da descrição."],
  ["Demonstra carinho pelos amigos e já reconhece quando um colega está triste.", "DMS", "MC", ["DCon"], ["EO"], [], 0, 0, 0, ["M4", "M6"], "Comportamento observável."],
  ["Observamos que, nos últimos meses, a criança tem demonstrado interesse pelo desenho e pela escrita.", "DML", "MC", ["DExpr"], ["TS"], ["PMon"], 0, 0, 0, ["M2", "M3", "M4"], "Progressão e observação declarada."],
  ["Já reconhece todas as letras do próprio nome, escreve o nome sem apoio e conta até 20.", "DML", "MC", [], [], [], 3, 0, 0, ["M1", "M4", "M8"], "Atenção: boa qualidade de registro e antecipação de alfabetização."],
  ["Já está pronta para o primeiro ano, pois tem mostrado maturidade e interesse pelas letras.", "DMS", "MS", [], [], [], 3, 0, 0, ["M5", "M8"], "Escolarização precoce com linguagem explícita de prontidão."],
  ["A criança é filha de família venezuelana, chegou ao Brasil há dois anos. Em casa, a família fala espanhol.", "DML", "MC", [], ["EO"], [], 0, 3, 3, ["M9"], "Registro sensível da diversidade."],
  ["Ela costuma usar algumas palavras em espanhol quando brinca com a irmã e, na sala, tem aprendido português com facilidade. Quando não sabe uma palavra em português, aponta e pede ajuda às professoras, que a auxiliam. Tem se mostrado muito esforçada.", "DML", "MC", ["DExpr"], ["CG"], [], 0, 3, 3, ["M1", "M4", "M9"], "Trecho mais rico em diversidade."],
  ["a criança precisará continuar desenvolvendo a atenção e a concentração, pois ainda se dispersa com facilidade em atividades longas.", "DMC", "MS", [], [], [], 0, 0, 0, ["M5"], "Necessidade futura a partir de atributo."],
  ["No geral, consideramos que teve um semestre produtivo e que está no caminho certo.", "DMS", "MS", [], [], ["PCom"], 0, 0, 0, ["M5"], "Fechamento avaliativo genérico."]
];
/* Em quantos excertos do exemplo a lei do lastro reproduz o MC/MS anotado à mão na planilha */
const leiNoExemplo = () => EXEMPLO.filter(r => (r[9].some(m => ANC.includes(m)) ? "MC" : "MS") === r[2]).length;

function criarExemplo() {
  const p = novoParecer("EX07", true), X = i => EXEMPLO[i][0], nv = (g, n) => n === 2 ? g.niveis[0].v : n === 3 ? g.niveis[1].v : NM;
  Object.assign(p.identificacao, { tipo_instituicao: "EMEB", semestre: "2026/2", idade: "5", imigracao: "Sim", anonimizado: true });
  p.texto_parecer = [X(0), " ", X(1), " Nas brincadeiras, ", X(2), "\n\n", X(3), " ", X(4), "\n\n", "Na linguagem, ", X(5), " ", X(6), " ", X(7), "\n\n", X(8), " ", X(9), "\n\n",
    "Em geral, ", X(10), " ", X(11), " ", X(12), "\n\n", X(13), " ", X(14), " ", X(15), "\n\n", X(16), " ", X(17), "\n\n", "Para o próximo semestre, ", X(18), " ", X(19)].join("");
  let de = 0;
  EXEMPLO.forEach(r => {
    const i = p.texto_parecer.indexOf(r[0], de); de = i + r[0].length;
    const e = novoExcerto(i, de, r[0]);
    Object.assign(e, { dimensao_dominante: r[1], direitos: [...r[3]], campos: [...r[4]], categorias_matriz: [...r[5]], esp_nivel: nv(EMERG[0], r[6]), blg_nivel: nv(EMERG[1], r[7]), acu_nivel: nv(EMERG[2], r[8]),
      marcas: r[9].filter(m => MARCAS_VALIDAS.includes(m)), observacoes: r[10] });
    p.excertos.push(e);
  });
  p.fechamento = {
    excerto_representativo: p.excertos[6].k,
    sintese_uma_frase: "O parecer cobre as quatro dimensões alternando descrições ancoradas e afirmações genéricas, não trata do brincar nem do direito de explorar, e revela antecipação da escolarização associada a um tratamento sensível da diversidade linguística.",
    observacoes_gerais: "Parecer corrido, sem títulos internos. Uso frequente de adjetivos de valor.",
    observacoes_ausencia: "O Brincar é eixo estruturante da Educação Infantil e não foi tratado: achado relevante."
  };
  S.P[p.key] = p; store.guardar(p);
  return p;
}
function carregarExemplo() {
  const p = todos().find(x => x.demo) || criarExemplo();
  abrirParecer(p.key, "cod");
  if (p.excertos.length > 3) { S.ex = ordenados(p)[3].k; pintarCod(); }
}

/* ---------- início ---------- */
async function iniciar(memoria) {
  lerRota(); desenhar();
  try { await store.iniciar(); }
  catch (e) { console.error(e); store.modo = store.lsOk ? "local" : "memoria"; }
  capacidade("sample").then(v => { S.temIA = !!v; if (S.pronto && S.vista === "conc") desenhar(); });
  capacidade("downloads");
  if (S.refazerExemplo || !todos().length) criarExemplo();
  S.pronto = true;
  const m = memoria && memoria.sel && S.P[memoria.sel] && !S.P[memoria.sel].excluido ? memoria : null;
  if (m) { S.sel = m.sel; S.passo = m.passo || "cod"; S.ex = m.ex || null; if (m.vista && !location.hash) S.vista = m.vista; }
  else {
    const p = reais().find(x => x.status === "rascunho") || todos().find(x => x.demo) || todos()[0];
    if (p) { S.sel = p.key; S.passo = p.texto_parecer ? "cod" : "doc"; const ex = ordenados(p); S.ex = ex.length ? ex[p.demo ? Math.min(3, ex.length - 1) : 0].k : null; }
  }
  desenhar();
}
/* Mantém o lugar de quem está com a página aberta quando uma nova versão é publicada */
try { if (window.claude && window.claude.hot && typeof window.claude.hot.snapshot === "function") window.claude.hot.snapshot(() => ({ vista: S.vista, sel: S.sel, passo: S.passo, ex: S.ex })); } catch (e) { /* fora do visualizador */ }
let partiu = false;
const partida = d => {
  if (partiu) return; partiu = true;
  iniciar(d || {}).catch(e => {
    console.error(e);
    const c = $("#corpo"); if (c) c.innerHTML = `<div class="carregando" role="alert">Não foi possível abrir os pareceres. Recarregue a página.</div>`;
  });
};
if (window.claude && window.claude.hot && typeof window.claude.hot.ready === "function") {
  try { window.claude.hot.ready(partida); } catch (e) { /* segue pelo relógio abaixo */ }
  setTimeout(partida, 2500);                              // se o visualizador não chamar de volta, a página abre assim mesmo
} else partida(window.claude && window.claude.hot ? window.claude.hot.data : {});
