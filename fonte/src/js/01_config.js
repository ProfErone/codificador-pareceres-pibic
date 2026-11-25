"use strict";
/* =====================================================================
   Codificador de Pareceres — PIBIC/UNOESC
   Instrumento de análise de conteúdo (Bardin) para pareceres descritivos.
   Página única, sem dependências. Os dados ficam na conta de quem codifica.
   ===================================================================== */

const APP = {
  nome: "Codificador de Pareceres",
  versao: "1.0.1-piloto",
  schema: "pibic-pareceres/2.0",
  modelo: 4,                       // versão das regras e do formato dos dados
  total: 60,                       // pareceres previstos no corpus
  projeto: "Dimensões do desenvolvimento infantil nos pareceres descritivos: análise documental na pré-escola",
  livro: "Livro de Códigos, revisão de 13/11/2026"
};
const PREFIXO_LS = "pibic:";       // armazenamento local, uma chave por parecer
const CHAVE_LS_ANTIGA = "pibic_pareceres_v1";
const LIMITE_PALAVRAS_EXCERTO = 60; // acima disso, o instrumento sugere recortar

/* ---------- Identificação do parecer (valores da planilha original) ---------- */
const IDENT = [
  { f: "tipo_instituicao", rot: "Tipo de instituição", op: [["EMEB", "EMEB"], ["CMEI", "CMEI"]] },
  { f: "semestre", rot: "Semestre", op: [["2026/2", "2026/2"], ["2027/1", "2027/1"]] },
  { f: "idade", rot: "Idade da criança", op: [["4", "4 anos"], ["5", "5 anos"]] },
  { f: "imigracao", rot: "Imigração", op: [["Sim", "Sim"], ["Nao", "Não"], ["Nao informado", "Não informado"]] }
];
const rotIdent = (f, v) => { const g = IDENT.find(x => x.f === f); const o = g && g.op.find(x => x[0] === String(v)); return o ? o[1] : String(v || ""); };

/* ---------- Livro de códigos ---------- */
const DIMS = [
  { c: "DMF", n: "Física/motora", d: "Corpo, movimento, controle motor, coordenação, equilíbrio, autonomia em ações corporais.", ex: "No parque, tem subido no trepa-trepa com mais segurança do que no início do semestre." },
  { c: "DMS", n: "Socioafetiva", d: "Relações da criança com os outros e com ela mesma: amizade, cooperação, conflito, autonomia, expressão de sentimentos, regras de convivência.", ex: "Nas atividades em pequenos grupos, tem procurado os colegas para dividir os materiais e espera a sua vez de falar." },
  { c: "DMC", n: "Cognitiva", d: "Como a criança pensa, resolve problemas, compreende o mundo, faz hipóteses, memoriza, classifica, conta, estabelece relações.", ex: "Ao montar a torre com blocos, testou várias formas de encaixe até conseguir que ficasse em pé, e explicou aos colegas como fez." },
  { c: "DML", n: "Linguística", d: "Fala, escuta, narrativa, vocabulário, argumentação, compreensão da língua, escrita, leitura, expressão por linguagens.", ex: "Ao recontar a história da roda, lembrou a ordem dos acontecimentos e incluiu falas dos personagens." }
];
const DIREITOS = [
  { c: "DCon", n: "Conviver", d: "Relação com colegas e adultos, regras de convivência, cuidado com o outro.", ex: "Nas brincadeiras de faz de conta, dividiu o papel de mãe com a colega." },
  { c: "DBri", n: "Brincar", d: "Brincadeira, jogo, faz de conta, imaginação.", ex: "Na casinha, criou uma história em que a boneca ia ao médico." },
  { c: "DPar", n: "Participar", d: "Envolvimento nas atividades coletivas, roda, projetos, decisões do grupo.", ex: "Na roda de conversa, pediu a palavra para contar o que viu no caminho para a escola." },
  { c: "DExp", n: "Explorar", d: "Curiosidade, investigação, manuseio de materiais, descoberta. Não confundir com DExpr.", ex: "No pátio, recolheu folhas diferentes e comparou tamanhos." },
  { c: "DExpr", n: "Expressar", d: "Expressão por linguagens: fala, desenho, música, corpo, dramatização. Não confundir com DExp.", ex: "Desenhou a família e explicou cada personagem ao mostrar aos colegas." },
  { c: "DConh", n: "Conhecer-se", d: "Identidade, reconhecimento de si, do próprio corpo, das preferências, autonomia. Não confundir com DCon.", ex: "Ao se olhar no espelho, disse que agora consegue pentear o próprio cabelo." }
];
const CAMPOS = [
  { c: "EO", n: "O eu, o outro e o nós", d: "Convivência, identidade, relações, pertencimento.", ex: "Falou sobre a família que chegou de outro país e comparou com a dos colegas." },
  { c: "CG", n: "Corpo, gestos e movimentos", d: "Movimento, corpo, dança, expressão corporal.", ex: "Na atividade de música, acompanhou o ritmo com o corpo." },
  { c: "TS", n: "Traços, sons, cores e formas", d: "Arte, desenho, pintura, música, materiais expressivos.", ex: "Experimentou misturar tintas e nomeou as cores que apareceram." },
  { c: "EF", n: "Escuta, fala, pensamento e imaginação", d: "Linguagem oral, narrativa, escuta, imaginação.", ex: "Ouviu a história e comentou o que achou do final." },
  { c: "ET", n: "Espaços, tempos, quantidades, relações e transformações", d: "Noções matemáticas, tempo, espaço, comparações, natureza.", ex: "Organizou os brinquedos por tamanho ao arrumar a sala." }
];
const MATRIZ = [
  { c: "PMon", n: "Monitoramento", d: "Acompanhamento ao longo do tempo, progressão, retomada de observações anteriores.", ex: "Comparando com o bimestre anterior, tem avançado na espera pela vez." },
  { c: "PDoc", n: "Documentação", d: "Registro pedagógico organizado, com descrição de situações e evidências.", ex: "Registramos que, na atividade de culinária, mediu os ingredientes com apoio da professora." },
  { c: "PCom", n: "Comunicação", d: "Comunicação à família sobre o percurso da criança, com linguagem acessível.", ex: "Conversamos com a família sobre esse avanço na fala." },
  { c: "PDia", n: "Diálogo", d: "Escuta da criança, participação dela nas decisões ou na avaliação.", ex: "A criança escolheu o que queria mostrar no portfólio." }
];
/* Âncoras de observação: as quatro marcas que definem o nível do registro */
const ANCORAS = [
  { c: "M1", n: "Situação", nome: "Ancoragem situacional", p: "Em que situação?", d: "O trecho remete a uma situação, atividade, rotina ou momento identificável.", ind: "durante, na roda, no parque, na atividade de, quando, ao, no momento em que" },
  { c: "M2", n: "Tempo", nome: "Ancoragem temporal", p: "Quando, ou desde quando?", d: "O trecho indica período ou progressão.", ind: "neste semestre, desde o início do ano, nas últimas semanas, passou a, tem avançado em, inicialmente… atualmente" },
  { c: "M3", n: "Observação declarada", nome: "Base em observação declarada", p: "Diz que foi observado?", d: "O texto assume a origem observacional do que afirma.", ind: "observamos que, tem sido possível perceber, nas situações observadas, registramos que, chama a atenção que" },
  { c: "M4", n: "Processo", nome: "Descrição de processo", p: "Como a criança faz?", d: "O trecho descreve como a criança faz, e não apenas o que ela é.", ind: "vem construindo, tem experimentado, vem demonstrando; verbo de ação com objeto ou finalidade" }
];
const ROTULO = { c: "M5", n: "Rótulo", nome: "Vocabulário rotulador", d: "Adjetivo fixo que nomeia um suposto atributo interno, em vez de descrever comportamento observável. Não altera o nível do registro.", ind: "imaturo, carente, agressivo, desatento, preguiçoso, esperto, acanhada, agitado, sem limites, difícil, atrasado" };
const ANC = ANCORAS.map(a => a.c);
const MARCAS_VALIDAS = [...ANC, ROTULO.c];

/* Categorias emergentes. Os valores gravados são os da planilha original. */
const NM = "NAO_MENCIONADO";
const EMERG = [
  { f: "esp_nivel", c: "ESP", n: "Escolarização precoce", d: "O trecho trata a criança de 4 ou 5 anos com a lógica do Ensino Fundamental, antecipando alfabetização e cobrando prontidão.",
    niveis: [
      { v: "Nivel 2 - Indicio parcial", n: "Indício parcial", d: "Aparece um elemento isolado, que não é o foco do trecho.", ex: "Reconhece algumas letras do próprio nome." },
      { v: "Nivel 3 - Presente e central", n: "Presente e central", d: "A expectativa de prontidão organiza o registro.", ex: "Já está pronta para o primeiro ano, pois conhece todas as letras e conta até 20." }
    ], misto: null },
  { f: "blg_nivel", c: "BLG", n: "Barreira linguística", d: "O trecho trata da língua da criança imigrante.",
    niveis: [
      { v: "Nivel 2 - Registro deficitario", n: "Registro deficitário", d: "A barreira aparece como falta, limite ou atraso, sem contexto de aprendizagem.", ex: "Não fala nada." },
      { v: "Nivel 3 - Registro sensivel", n: "Registro sensível", d: "A barreira aparece situada, com estratégias de comunicação, repertório ou avanços.", ex: "Aponta e pede ajuda às professoras quando não sabe uma palavra." }
    ], misto: "Niveis 2 e 3 - Registro misto" },
  { f: "acu_nivel", c: "ACU", n: "Acolhimento cultural", d: "O trecho reconhece a bagagem cultural da criança e da família.",
    niveis: [
      { v: "Nivel 2 - Registro estereotipado", n: "Registro estereotipado", d: "A cultura aparece como curiosidade, exotismo ou generalização.", ex: "" },
      { v: "Nivel 3 - Registro sensivel", n: "Registro sensível", d: "A cultura aparece como repertório da criança, com valor pedagógico.", ex: "Em casa, a família fala espanhol." }
    ], misto: "Niveis 2 e 3 - Registro misto" }
];
const rotEmerg = (g, v) => v === NM || !v ? "Não mencionado" : v === g.misto ? "Registro misto" : (g.niveis.find(x => x.v === v) || { n: v }).n;

/* Nível do registro: valores gravados (planilha) e nomes exibidos */
const NIVEIS = ["Ausencia", "Traco", "Lastro"];
const ROT_NIVEL = { Ausencia: "Sem lastro", Traco: "Traço", Lastro: "Lastro" };
const ROT_PRED = { "Ausencia predominante": "Sem lastro predominante", "Traco predominante": "Traço predominante", "Lastro predominante": "Lastro predominante", "Equilibrio": "Equilíbrio", "": "Sem excertos" };

/* ---------- Sugestões por palavras indicadoras (do próprio Livro de Códigos) ----------
   São apenas sugestões: quem decide é a codificadora. */
const reInd = lista => new RegExp("(^|[^\\p{L}\\p{N}])(" + lista.join("|") + ")(?![\\p{L}\\p{N}])", "giu");
const INDICADORES = {
  M1: reInd(["durante", "na roda", "nas rodas", "no parque", "no p[aá]tio", "na casinha", "na sala", "na atividade", "nas atividades", "em atividades", "na brincadeira", "nas brincadeiras",
    "no momento em que", "na hora d[oae]", "quando", "ao\\s+(?:se\\s+)?\\p{L}+(?:ar|er|ir|or)"]),
  M2: reInd(["neste semestre", "neste bimestre", "desde o in[ií]cio(?: do ano| do semestre)?", "nas [uú]ltimas semanas", "nos [uú]ltimos meses", "passou a", "tem avan[cç]ado", "vem avan[cç]ando",
    "inicialmente", "atualmente", "no in[ií]cio do (?:semestre|ano)", "bimestre anterior", "semestre anterior", "ao longo do (?:semestre|ano)"]),
  M3: reInd(["observamos(?: que)?", "tem sido poss[ií]vel perceber", "nas situa[cç][oõ]es observadas", "registramos(?: que)?", "chama a aten[cç][aã]o(?: que)?", "percebemos(?: que)?", "notamos(?: que)?"]),
  M4: reInd(["(?:vem|v[eê]m|tem|t[eê]m)\\s+(?:se\\s+)?\\p{L}+(?:ado|ido|ando|endo|indo)"]),
  M5: reInd(["imatur[oa]s?(?: para a idade)?", "carentes?", "agressiv[oa]s?", "desatent[oa]s?", "pregui[cç]os[oa]s?", "espert[oa]s?", "acanhad[oa]s?", "agitad[oa]s?", "sem limites", "dif[ií]cil", "dif[ií]ceis",
    "problemas? de comportamento", "atrasad[oa]s?", "t[ií]mid[oa]s?", "caprichos[oa]s?", "lent[oa]s?", "inteligentes?", "querid[oa]s?", "carinhos[oa]s?", "ativ[oa]s?", "coordenad[oa]s?", "atent[oa]s?",
    "alegres?", "comunicativ[oa]s?", "esfor[cç]ad[oa]s?", "bom comportamento", "boa rela[cç][aã]o", "bom desenvolvimento", "fala muito bem", "boa fala", "comunica-se bem", "compreende bem"])
};

/* ---------- Referências citadas no instrumento ---------- */
const REFERENCIAS = [
  "Bardin, L. Análise de conteúdo. (Edição adotada no projeto.)",
  "Brasil. Ministério da Educação. Base Nacional Comum Curricular: Educação Infantil (direitos de aprendizagem e campos de experiências).",
  "Cohen, J. (1960). A coefficient of agreement for nominal scales. Educational and Psychological Measurement, 20(1), 37–46.",
  "Landis, J. R.; Koch, G. G. (1977). The measurement of observer agreement for categorical data. Biometrics, 33(1), 159–174."
];
