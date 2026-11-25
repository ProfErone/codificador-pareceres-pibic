# Codificador de Pareceres — piloto 1.0 (13/11/2026)

**Artefato:** https://claude.ai/artifact/JThPdHfZdnjGacREiBcg56
Uma página HTML única, sem bibliotecas. O código-fonte é o próprio artefato: está comentado, em português, e dividido em seções.

## 1. O que é
Substitui a planilha na coleta. A bolsista preenche uma ficha por parecer. Ao finalizar, o parecer recebe um número de registro, fica travado e gera um JSON. No fim, um ZIP reúne tudo.

## 2. As quatro páginas
| Página | Para quê |
|---|---|
| Pareceres | Lista à esquerda; à direita, a folha do parecer em três etapas: Parecer, Codificação, Fechamento |
| Painel | Resultados parciais dos pareceres finalizados, organizados pelas quatro perguntas; visão parecer por parecer; dúvidas reunidas |
| Concordância | Compara duas codificações do mesmo parecer: acordo e kappa de Cohen por decisão; lista de divergências |
| Método | O instrumento em quatro perguntas, a lei do lastro, o que o instrumento garante e o livro de códigos |

## 3. O que o instrumento garante
| Garantia | Como |
|---|---|
| Fidelidade | O excerto é selecionado no texto, nunca digitado. A seleção completa as palavras cortadas |
| Exclusividade | Seleção sobreposta é recusada. Uma dimensão dominante por excerto |
| Homogeneidade | Cada pergunta tem a sua contagem; nada soma conjuntos diferentes |
| Exaustividade | Ausências calculadas; indicador de quanto do texto foi codificado |
| Objetividade | Nível do registro calculado pelas âncoras; concordância medida |
| Pertinência | Cada código responde a uma hipótese ou objetivo |
| Rastreabilidade | Um código, um parecer ativo. Um número, um registro. Registro travado e selado (SHA-256). Corrigir cria nova versão. Nada é gravado por cima, também ao reunir dados |

## 4. Onde os dados ficam
| Situação de quem abre | Onde salva | Aviso no topo |
|---|---|---|
| Dono do artefato, ou pessoa da mesma organização com permissão de contribuir | Na conta Claude da pessoa, em área privada por usuário; cópia no navegador | Salvo na sua conta |
| Pessoa de fora da organização, pessoa que só pode ver ou comentar, ou sem login | Só no navegador | Salvo só neste navegador |
| Navegador que não guarda dados | Em nenhum lugar | Sem armazenamento: baixe cada JSON |

As regras de compartilhamento são da plataforma. O aviso no alto da página diz sempre onde os dados estão sendo salvos.

- Em qualquer situação, o JSON de cada parecer finalizado e o Backup são cópias seguras.
- **Importar** aceita backup, pacote ou registros avulsos, confere a integridade e segue as três leis de `03_Formato_dos_Dados.md`, seção 7: nada é gravado por cima; um código, uma linhagem; um número, um registro. O relato da importação diz o que entrou, o que já estava, o que mudou de número e o que ficou de fora.
- Na conta, antes de numerar, o Codificador relê a conta e o navegador. Duas abas ou dois aparelhos são acompanhados. Se dois aparelhos ficarem sem se ver e repetirem um número ou um código, a reunião corrige e avisa: o registro finalizado depois recebe outro número; do código finalizado duas vezes, vale o mais recente, e o outro vai para o histórico.
- O carimbo de alteração de um parecer é sempre maior que o anterior. Uma alteração feita aqui não perde para a cópia que ela alterou, mesmo com o relógio de outro aparelho adiantado.
- Se a conta não responder na abertura (rede lenta), a página abre com os dados do navegador e tenta alcançar a conta depois: em 20 segundos, ao voltar para a aba e quando a rede volta.
- Parecer finalizado é guardado de forma compacta (só o registro selado).

## 5. Segunda leitura por IA (opcional)
Na página Concordância, quando a visualização permite, há o botão **Pedir uma segunda leitura por IA**. O texto anonimizado e os trechos vão ao Claude, na conta de quem pede, que devolve uma codificação independente. A codificação humana não muda. Serve para calibrar, e o uso deve constar na descrição do método. Depende de aprovação da orientadora.

## 6. Para quem for manter o artefato
### Capacidades declaradas
```json
{"db": {"rules": [{"path": "", "read": "view", "write": "owner"}, {"path": "data/users/{self}", "write": "interact"}]},
 "user": {}, "downloads": {}, "sample": {}}
```
Dados na conta: `data/users/<id>/meta` (contador) e `data/users/<id>/meta/pareceres/<chave>` (um documento por parecer).

### Seções do código (comentários no próprio arquivo)
`01` configuração e livro de códigos; `02` utilidades; `03` modelo, lei do lastro, registro; `04` armazenamento e migração; `05` arquivos (ZIP, CSV, fichas, backup, importação); `06` concordância e segunda leitura; `07` a `10` desenho das páginas; `11` ações e eventos; `12` exemplo e início.

### Regras para alterar
- Não quebrar as sete leis listadas em `00_Instrucoes_do_Projeto.md`.
- O livro de códigos do artefato fica na seção `01`. Mudou um código ou uma definição: atualize também `02_Livro_de_Codigos.md`.
- Mudou regra de cálculo ou formato: suba `APP.modelo` e `APP.schema`, escreva a migração na seção `04` e registre em `05_Decisoes_de_Metodo.md`.
- A página não pode usar `alert`, `confirm`, `print` nem download direto: arquivos saem pela capacidade `downloads`, com alternativa de copiar.
- Republicar sempre no mesmo link.

### Roteiro de testes (o que conferir depois de qualquer mudança)
| Teste | Resultado esperado |
|---|---|
| Exemplo EX07 | 20 excertos; 10 sem lastro, 2 traço, 8 lastro; equilíbrio; direitos ausentes DBri, DExp, DConh; a lei reproduz o MC/MS da planilha em 19 de 20 |
| Código repetido ou fora do formato | Recusado |
| Seleção sobreposta | Recusada, com aviso |
| Seleção que corta palavras | Completa as palavras |
| Finalizar | REG sequencial; campos travados; chaves dos excertos viram `P12-E01`… |
| Integridade | SHA-256 confere em Python; registro alterado é recusado na importação |
| Corrigir | Versão 2 em rascunho; ao finalizar, novo REG; a anterior vira substituída |
| Recarregar | Tudo volta; o contador não regride |
| ZIP | Abre; traz LEIA-ME, manifesto, pareceres, consolidado, fichas |
| Backup e importação | Restaura em outro navegador; reimportar não muda nada |
| Reunir dois navegadores com numerações próprias | Número repetido é trocado pelo próximo livre, com o bloco `origem`; referências entre versões são refeitas; os resumos conferem em Python; código que já existe não entra e aparece no relato |
| Dois aparelhos na mesma conta que não se viram | Número repetido: o finalizado depois é renumerado. Código finalizado duas vezes: vale o mais recente. Sincronizar de novo não muda mais nada |
| Dois rascunhos com o mesmo código | Não finaliza; avisa |
| Conta lenta na abertura | Abre no navegador; alcança a conta depois e envia os dados |
| Kappa | Exemplo clássico (20, 5, 10, 15) dá 0,40; a segunda codificação simulada do EX07 dá 19 pares, dimensão 18 de 19, nível 16 de 19 |
| Sem a plataforma | Abre em modo navegador; download vira "copiar" |
| 60 pareceres com cerca de 22 excertos | Abre e desenha sem demora; ZIP em menos de um segundo |

Esses testes rodam em navegador automatizado, com a plataforma simulada: fluxo completo, conta, migração, reunião de dados e carga de 60 pareceres. O código-fonte em módulos e os testes estão no arquivo `Codificador_fonte_e_testes.zip`, entregue com o piloto em 13/11/2026.

**No próprio claude.ai, em 13/11/2026:** a página publicada abriu na conta do dono e gravou na conta. O banco de dados do artefato registra gravações feitas pela página segundos depois de cada publicação (03:52 e 07:27, horário de Brasília): o contador e o parecer de exemplo. **O download de arquivos e a segunda leitura por IA só foram testados com a plataforma simulada:** confira os dois uma vez no próprio artefato.

## 7. Limites conhecidos
- A seleção de trechos é feita com mouse ou toque. Pelo teclado, navega-se pelos excertos já criados.
- O texto do exemplo foi montado com os 20 excertos do P07 e frases de ligação; não é o parecer original.
- As fontes vêm do Google Fonts. Sem acesso a elas, a página usa as fontes do sistema.
- Fora da conta, cada navegador tem a sua numeração. Os dados se reúnem pelo Backup e pelo Importar, que troca o número repetido e guarda o de origem.
- Dois aparelhos sem rede ao mesmo tempo podem finalizar o mesmo código. A reunião mantém o mais recente e leva o outro ao histórico; a decisão sobre qual codificação vale é da bolsista com a orientação.
