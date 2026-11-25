# Decisões de Método — o que foi resolvido e onde está garantido

Cada questão encontrada na leitura do Livro de Códigos e da planilha original tem aqui a solução adotada. Nenhuma depende mais de atenção manual: todas estão construídas no Codificador.

**Como ler a coluna Validação:** "Adriano, 12/11" é decisão de Adriano para o piloto. "Orientadora" é solução incorporada ao piloto em 13/11/2026. As duas mudam o livro original e precisam da validação da Profa. Erone antes de a codificação começar. "Resolvido" é correção operacional, que não muda o método.

## Decisões
| Nº | Questão | Solução adotada | Onde está garantida | Validação |
|---|---|---|---|---|
| D1 | Nove marcas, com sobreposição entre si e com as categorias emergentes | Cinco marcas. M1 a M4 são as âncoras de observação. M5 é o alerta de rótulo. M6 fica expressa pela dimensão com âncoras; M7, pelos Direitos e Campos marcados; ESP cobre o tema de M8; BLG e ACU cobrem o de M9. Deixa de ser registrada à parte a menção explícita ao vocabulário curricular, indicador de M7 | O Codificador só oferece M1 a M5 | Adriano, 12/11 |
| D2 | Trecho com exatamente uma marca entre M1 e M4 não tinha nível definido | Lei do lastro: 0 âncoras = sem lastro; 1 = traço; 2 ou mais = lastro. Muda o sentido de dois nomes: o que o livro chamava de traço (nenhuma das marcas M1 a M4) passa a ser sem lastro | O nível é calculado; não há campo para escolher | Adriano, 12/11 |
| D3 | MC/MS e traço/lastro eram duas escalas para quase a mesma coisa, e podiam divergir | Uma só medida. MC = pelo menos uma âncora; MS = nenhuma. No P07 da planilha, a regra reproduz o MC/MS anotado à mão em 19 de 20 excertos | MC/MS é calculado | Orientadora |
| D4 | "Ausência" tinha dois sentidos | No instrumento e nos textos: "sem lastro" para o excerto sem âncoras; "dimensão não registrada" para a dimensão que não aparece no parecer. O valor gravado continua `Ausencia` | Rótulos do Codificador; bloco `ausencias` separado no JSON | Adriano, 12/11 |
| D5 | "Nível" nomeava três escalas | Os níveis das emergentes aparecem sempre pelo nome (indício parcial, registro sensível…); MC/MS e o nível do registro viraram uma medida só | Rótulos do Codificador | Orientadora |
| D6 | "Predominante" não tinha critério | Predominante é o nível presente em mais da metade dos excertos. Se nenhum passa da metade, equilíbrio | Calculado no fechamento | Orientadora |
| D7 | Um trecho podia ser contado duas vezes | Excertos não se sobrepõem. Uma dimensão dominante por excerto; a secundária é opcional e fica fora das contagens | Seleção sobreposta é recusada; a dimensão é escolha única | Orientadora |
| D8 | As emergentes eram contadas por excerto, e "não mencionado" inflava com o tamanho do corpus | Marcam-se só quando aparecem. O nível do parecer é calculado: ESP fica com o mais alto; BLG e ACU com os dois níveis no mesmo parecer ficam como registro misto. A unidade de análise é o parecer. BLG e ACU também se leem só entre crianças imigrantes | Fechamento e Painel | Orientadora |
| D9 | Trecho de contexto familiar (excerto 17 do P07) | Sem tipo novo. Fica na dimensão mais próxima e, por não ter âncoras, sem lastro. BLG e ACU seguem a codificação da planilha (registro sensível): a aba DICIONARIO da planilha original usa essa mesma frase como exemplo de ACU | Exemplo do Codificador | Orientadora |
| D10 | Ausências digitadas à mão | Calculadas: dimensões, direitos, campos e categorias matriz que nenhum excerto registrou | Fechamento; bloco `ausencias` | Orientadora |
| D11 | Exaustividade: trechos fora da grade não tinham registro | O Codificador mostra quanto do texto foi codificado. O que ficou de fora continua visível, sem marca, no texto do parecer | Indicador de cobertura | Orientadora |
| D12 | Listas de códigos digitadas (vírgula, espaço, maiúsculas) faziam o código sumir da contagem | Nenhum código é digitado. Os CSV trazem uma coluna 0/1 por código | Botões; `excertos.csv` | Resolvido |
| D13 | Fórmulas de "pareceres em que aparece" da planilha apontavam para a coluna errada | A contagem por parecer é feita pelo Codificador | Painel; `pareceres.csv` | Resolvido |
| D14 | Regra da objetividade sem medida | Concordância entre duas codificações do mesmo parecer: proporção de acordo e kappa de Cohen por decisão, com a lista de divergências | Página Concordância | Orientadora |
| D15 | Um parecer podia ser gravado por cima de outro | Código único por parecer. Finalizado recebe número sequencial, fica travado e leva resumo SHA-256. Corrigir cria nova versão | Finalização; importação confere a integridade | Resolvido |
| D16 | Remissões imprecisas no livro: a seção 3.9 cita uma distinção (a)/(b)/(c) que não está no item 2.2, e o quadro-síntese manda ver as marcas na seção 3.10 | Corrigidas na revisão do livro | `02_Livro_de_Codigos.md` | Resolvido |
| D17 | Dados reunidos de dois navegadores ou aparelhos podiam repetir número de registro ou código de parecer | Um código, um parecer ativo; um número, um registro. O que chega com número já usado recebe o próximo número livre e guarda o de origem. Código que já existe não entra: o Codificador não escolhe entre duas codificações | Importação e sincronização; bloco `origem` no JSON | Resolvido |

## Diferenças entre o exemplo do Codificador e a planilha original
O exemplo usa os 20 excertos do P07. Dimensões, direitos, campos, sinais e marcas M1 a M5 são os da planilha. Quatro pontos mudam, todos por decisão acima:

| Ponto | Planilha | Codificador | Motivo |
|---|---|---|---|
| Nível dos excertos só com adjetivo (1, 2, 3, 6, 9, 11, 16, 19, 20) | Traço | Sem lastro | D2 |
| Nível dos excertos 8 e 13 | Lastro | Traço | D2: têm uma âncora (M4) |
| Excerto 17 | MC e lastro | MS e sem lastro | D3 e D9: não tem âncoras |
| Categorias matriz ausentes no parecer | PDia | PDoc e PDia | D10: PDoc não está marcado em nenhum excerto |

## Pontos de calibração para a primeira dupla codificação
São divergências de leitura, não de regra. A página Concordância existe para resolvê-las com dados.
- Excerto 15 do P07 ("Já reconhece todas as letras…"): a planilha marca M1, mas o trecho não nomeia uma situação.
- Excerto 18 do P07: o campo marcado é CG; EF também é uma leitura possível.

## Registro de decisões
| Data | Decisão | Quem |
|---|---|---|
| 12/11/2026 | Lei do lastro: 0, 1, 2 ou mais âncoras (D2) | Adriano |
| 12/11/2026 | Distinguir "registro sem lastro" de "dimensão não registrada" (D4) | Adriano |
| 12/11/2026 | Manter só M1 a M5 (D1) | Adriano |
| 12/11/2026 | Trecho de contexto sem tipo novo (D9, primeira parte) | Adriano |
| 13/11/2026 | D3, D5 a D8, D10, D11, D14 incorporadas ao piloto | Aguardam a orientadora |
| 13/11/2026 | D12, D13, D16 e D17: correções operacionais | Resolvido no piloto |
