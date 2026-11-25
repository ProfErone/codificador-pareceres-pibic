# Protocolo de Codificação — passo a passo no Codificador

## A. Rotina por parecer
1. **Novo parecer.** Digite o código da Secretaria (P e dois dígitos, como P07). O Codificador recusa código repetido.
2. **Etapa 1, Parecer.** Escolha tipo de instituição, semestre, idade e imigração. Cole o texto inteiro, já anonimizado, e confirme a anonimização.
3. **Etapa 2, Codificação.** Leia o parecer inteiro uma vez. Depois, selecione cada trecho com o mouse e escolha **Codificar trecho**. Para cada excerto, responda às quatro perguntas (seção B).
4. **Etapa 3, Fechamento.** Confira o que o Codificador calculou. Escolha o excerto representativo e escreva a síntese em uma frase.
5. **Finalizar parecer.** O parecer recebe o número de registro e fica travado. Baixe o JSON.
6. **Errou depois de finalizar?** Abra o parecer e escolha **Corrigir em nova versão**. A versão antiga fica no histórico.
7. **No fim,** escolha **Gerar ZIP final** e envie o arquivo.

## B. As quatro perguntas de cada excerto
```
1. De que fala?
   Escolha a dimensão que o trecho afirma com mais força: DMF, DMS, DMC ou DML.
   Tocou outra? Registre como secundária (não entra nas contagens).

2. Com que apoio?
   Marque só o que o trecho diz:
     M1 Em que situação?        "no parque", "na roda", "ao montar…"
     M2 Quando, desde quando?   "neste semestre", "desde o início", "passou a"
     M3 Diz que foi observado?  "observamos que", "registramos que"
     M4 Como a criança faz?     "tem procurado", "vem construindo", ação com objeto
     M5 Usa adjetivo que julga? "agitado", "difícil", "inteligente"  (alerta)
   O nível aparece sozinho: nenhuma âncora = sem lastro; 1 = traço; 2 ou mais = lastro.

3. Em diálogo com quê?
   Marque todos os Direitos, Campos e categorias matriz que o trecho mostra.

4. Que sinais traz?
   ESP, BLG, ACU: marque só se aparecerem.
```
- As palavras sublinhadas no excerto são indicadores do Livro de Códigos. As marcas tracejadas são sugestões. Quem decide é você.
- Em dúvida, marque **Levar este excerto como dúvida para a orientação** e escreva a dúvida nas notas. Todas as dúvidas aparecem reunidas no Painel.
- Um pedaço do texto pertence a um só excerto. Para mudar o recorte, abra o excerto, selecione o novo trecho e escolha **Ajustar o excerto aberto**.

## C. O que o Codificador confere
| Situação | O que acontece |
|---|---|
| Excerto sem dimensão | Pendência: impede finalizar |
| Texto alterado e trecho não encontrado | Pendência: selecione de novo e ajuste, ou exclua |
| "Não fala nada" sem DML e sem BLG deficitário | Alerta |
| Dúvida marcada sem nota | Alerta |
| DExp e DExpr juntos | Nota: confira se são os dois |
| Excerto com mais de 60 palavras | Nota: veja se dá para recortar |

## D. Exemplo calibrado: o parecer P07 pela lei do lastro
| Nº | Trecho (início) | Dimensão | Âncoras | Rótulo | Nível | MC/MS |
|---|---|---|---|---|---|---|
| 1 | É uma criança alegre, comunicativa… | DMS | nenhuma | sim | Sem lastro | MS |
| 2 | Tem uma boa relação com os colegas… | DMS | nenhuma | sim | Sem lastro | MS |
| 3 | é uma criança ativa e bastante coordenada. | DMF | nenhuma | sim | Sem lastro | MS |
| 4 | No parque, tem subido no trepa-trepa… | DMF | M1, M2, M4 | | Lastro | MC |
| 5 | Nas atividades de recorte, segura a tesoura… | DMF | M1, M4 | | Lastro | MC |
| 6 | fala muito bem. | DML | nenhuma | sim | Sem lastro | MS |
| 7 | Ao recontar a história da roda de leitura… | DML | M1, M4 | | Lastro | MC |
| 8 | Costuma perguntar sobre o significado… | DML | M4 | | Traço | MC |
| 9 | É muito inteligente. Compreende bem… | DMC | nenhuma | sim | Sem lastro | MS |
| 10 | Ao montar a torre com blocos… | DMC | M1, M4 | | Lastro | MC |
| 11 | tem bom comportamento. | DMS | nenhuma | sim | Sem lastro | MS |
| 12 | Nas atividades em pequenos grupos… | DMS | M1, M4 | | Lastro | MC |
| 13 | Demonstra carinho pelos amigos… | DMS | M4 | | Traço | MC |
| 14 | Observamos que, nos últimos meses… | DML | M2, M3, M4 | | Lastro | MC |
| 15 | Já reconhece todas as letras do próprio nome… | DML | M1, M4 | | Lastro | MC |
| 16 | Já está pronta para o primeiro ano… | DMS | nenhuma | sim | Sem lastro | MS |
| 17 | A criança é filha de família venezuelana… | DML | nenhuma | | Sem lastro | MS |
| 18 | Ela costuma usar algumas palavras em espanhol… | DML | M1, M4 | | Lastro | MC |
| 19 | a criança precisará continuar desenvolvendo… | DMC | nenhuma | sim | Sem lastro | MS |
| 20 | No geral, consideramos que teve um semestre… | DMS | nenhuma | sim | Sem lastro | MS |

Resultado do parecer: 10 sem lastro, 2 traço, 8 lastro. Nenhum nível passa da metade: equilíbrio.

O que o P07 ensina:
- A qualidade do registro e a escolarização precoce são independentes. O excerto 15 tem lastro e, ao mesmo tempo, antecipa a alfabetização (ESP presente e central).
- O excerto 17 informa o contexto da família. Não descreve uma situação observada, por isso fica sem lastro. BLG e ACU seguem como registro sensível, como na planilha original.
- Brincar, Explorar e Conhecer-se não aparecem. A ausência do Brincar, eixo estruturante da Educação Infantil, é um achado.
- As dimensões, as marcas M1 a M5, os direitos, os campos e os sinais são os da planilha original. O nível e o MC/MS são calculados.

## E. Dupla codificação (concordância)
1. A segunda pessoa abre o Codificador na conta dela, cria o mesmo parecer (mesmo código e mesmo texto) e codifica sem ver a primeira codificação.
2. Ela finaliza e baixa o JSON.
3. Na página **Concordância**, escolha o parecer e carregue o JSON dela.
4. O Codificador mostra, para cada decisão, a concordância e o kappa de Cohen, e lista as divergências.
5. Leve a lista à orientação. Cada divergência resolvida vira ajuste no Livro de Códigos.

Sugestão de escala: cerca de 6 pareceres (10% do corpus) no início, antes de codificar os demais.

## F. Se você usar dois navegadores ou dois computadores
O aviso no alto da página diz onde os dados estão: **Salvo na sua conta** (aparecem em qualquer aparelho com o seu login) ou **Salvo só neste navegador**.

No segundo caso, cada navegador guarda os seus pareceres. Para reunir:
1. No navegador de onde os dados saem, escolha **Fazer backup**.
2. No navegador de destino, escolha **Importar** e selecione o arquivo.
3. Leia o relato da importação. Ele diz quantos pareceres entraram, quais já estavam, quais receberam novo número de registro e quais ficaram de fora porque o código já existia.

Nada é gravado por cima. Se um código ficou de fora, decida com a orientação qual codificação vale; para trocar a de um parecer finalizado, use **Corrigir em nova versão**.

## G. Como pedir ajuda ao Claude neste Projeto
- "Codifique este trecho do P12: «…»": devolve as quatro respostas, com as palavras do trecho que sustentam cada código.
- "Confira esta codificação": compara com o Livro de Códigos e aponta o que rever.
- "Analise o ZIP": lê os CSV ou os JSON e monta as tabelas, sempre dizendo a unidade de contagem.
- "Prepare a pauta da orientação": reúne dúvidas e divergências.
- Cole sempre texto anonimizado.
