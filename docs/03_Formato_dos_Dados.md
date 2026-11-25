# Formato dos Dados — o que o Codificador entrega

Formato `pibic-pareceres/2.0`. O JSON de cada parecer é o **registro oficial**. Os CSV e as fichas são cópias para análise e leitura, geradas dos JSON.

## 1. O ZIP final
```
LEIA-ME.txt
manifesto.json                      lista dos registros: número, versão, arquivo, resumo de integridade e, se houver, número de origem
pareceres/REG-0001_P07_v1.json      um por parecer finalizado
historico/REG-0003_P12_v1.json      versões substituídas por correção (fora das contagens)
consolidado/excertos.csv            uma linha por excerto
consolidado/pareceres.csv           uma linha por parecer
consolidado/ausencias.csv           o que cada parecer não registrou
fichas/P07.md                       ficha de leitura de cada parecer
```
Nome do arquivo: `PIBIC_pareceres_AAAAMMDD_NNde60.zip`. Rascunhos não entram; o manifesto lista os códigos que ficaram de fora.

## 2. O JSON de um parecer
| Bloco | Campos | Observação |
|---|---|---|
| Topo | `schema`, `instrumento{nome, versao, livro_de_codigos, regra_…}`, `id_registro`, `versao`, `substitui`, `status`, `exemplo`, `criado_em`, `finalizado_em` | As regras em vigor vão escritas dentro do próprio registro |
| `parecer` | `codigo_parecer`, `tipo_instituicao`, `semestre`, `idade`, `imigracao`, `extensao_palavras`, `texto_anonimizado_confirmado`, `n_excertos`, `cobertura_do_texto`, `nivel_registro_predominante`, `excerto_representativo`, `excerto_representativo_id`, `sintese_uma_frase`, `observacoes_gerais` | Extensão, cobertura e predominante são calculados |
| `excertos[]` | `id_excerto`, `codigo_parecer`, `localizacao`, `posicao{inicio, fim}`, `excerto_literal`, `dimensao_dominante`, `dimensao_nivel`, `dimensao_secundaria`, `marcas_presentes[]`, `n_ancoras`, `nivel_registro`, `direitos[]`, `campos[]`, `categorias_matriz[]`, `esp_nivel`, `blg_nivel`, `acu_nivel`, `duvida`, `observacoes` | `dimensao_nivel`, `n_ancoras` e `nivel_registro` são calculados das marcas |
| `ausencias` | `dimensao_ausente[]`, `direito_ausente[]`, `campo_ausente[]`, `categoria_matriz_ausente[]`, `esp_nivel`, `blg_nivel`, `acu_nivel`, `observacoes_ausencia` | Tudo calculado, menos a observação |
| `contagens` | `nivel_registro{Ausencia, Traco, Lastro}`, `por_dimensao{…}`, `ancoras{M1…M4}`, `rotulo_M5`, `emergentes{ESP, BLG, ACU}`, `duvidas` | Totais do parecer |
| `texto_parecer` | O texto anonimizado completo | Permite conferir cada excerto pela posição |
| `origem` | `id_registro`, `substitui`, `integridade` | Só aparece em registro reunido de outro navegador ou aparelho, quando o número que ele trazia já estava em uso. Guarda o número, a referência e o resumo que o registro tinha na origem |
| `integridade` | `resumo` | SHA-256 do registro |

### Valores
| Campo | Valores |
|---|---|
| `id_registro` | `REG-0001`, `REG-0002`… Sequencial. Um número, um registro (pode haver números pulados) |
| `id_excerto` | `P07-E01`… pela ordem no texto |
| `dimensao_dominante` | `DMF`, `DMS`, `DMC`, `DML` |
| `dimensao_nivel` | `MC`, `MS` |
| `marcas_presentes` | `M1` a `M5` |
| `nivel_registro` | `Ausencia` (sem lastro), `Traco`, `Lastro` |
| `nivel_registro_predominante` | `Ausencia predominante`, `Traco predominante`, `Lastro predominante`, `Equilibrio` |
| `direitos` | `DCon`, `DBri`, `DPar`, `DExp`, `DExpr`, `DConh` |
| `campos` | `EO`, `CG`, `TS`, `EF`, `ET` |
| `categorias_matriz` | `PMon`, `PDoc`, `PCom`, `PDia` |
| `esp_nivel` | `NAO_MENCIONADO`, `Nivel 2 - Indicio parcial`, `Nivel 3 - Presente e central` |
| `blg_nivel` | `NAO_MENCIONADO`, `Nivel 2 - Registro deficitario`, `Nivel 3 - Registro sensivel`; no parecer, também `Niveis 2 e 3 - Registro misto` |
| `acu_nivel` | `NAO_MENCIONADO`, `Nivel 2 - Registro estereotipado`, `Nivel 3 - Registro sensivel`; no parecer, também `Niveis 2 e 3 - Registro misto` |
| `imigracao` | `Sim`, `Nao`, `Nao informado` |

Os valores são os das listas da planilha original, sem acento, para manter a compatibilidade.

### Integridade
`integridade.resumo` é o SHA-256 do texto JSON compacto do registro sem o campo `integridade`. Para conferir fora do Codificador, em Python:
```python
import json, hashlib
o = json.load(open("REG-0001_P07_v1.json", encoding="utf-8"))
resto = {k: v for k, v in o.items() if k != "integridade"}
texto = json.dumps(resto, ensure_ascii=False, separators=(",", ":"))
assert "sha256:" + hashlib.sha256(texto.encode("utf-8")).hexdigest() == o["integridade"]["resumo"]
```
O Codificador faz essa conferência ao importar e recusa arquivo alterado depois de gerado.

## 3. Os CSV
Separador ponto e vírgula, UTF-8 com BOM: abrem direto no Excel em português. Listas vêm como texto (`DExpr, DPar`) e também como colunas 0/1, uma por código, para somar sem fórmula de texto.

- **excertos.csv:** `ID_Excerto`, `Codigo_Parecer`, `ID_Registro`, `Localizacao`, `Excerto_Literal`, `Dimensao_Dominante`, `Dimensao_Nivel`, `Dimensao_Secundaria`, `Marcas_Presentes`, `N_Ancoras`, `Nivel_Registro`, `Direitos`, `Campos`, `Categorias_Matriz`, `ESP_Nivel`, `BLG_Nivel`, `ACU_Nivel`, `Duvida`, `Observacoes`; colunas 0/1 `M1`…`M5`, `DCon`…`DConh`, `EO`…`ET`, `PMon`…`PDia`; e `Tipo_Instituicao`, `Semestre`, `Idade`, `Imigracao` repetidos em cada linha, para tabela dinâmica.
- **pareceres.csv:** identificação, `Extensao_Palavras`, `N_Excertos`, `Cobertura_Pct`, `Nivel_Registro_Predominante`, `N_Sem_Lastro`, `N_Traco`, `N_Lastro`, `N_Rotulo_M5`, `ESP_Nivel`, `BLG_Nivel`, `ACU_Nivel`; colunas 0/1 de presença no parecer para cada dimensão, direito, campo e categoria matriz; excerto representativo, síntese, observações, data.
- **ausencias.csv:** o mesmo conteúdo da antiga aba CONTAGEM_AUSENCIAS.

## 4. Correspondência com a planilha original
| Planilha original | Onde está agora |
|---|---|
| Aba PARECERES | bloco `parecer` do JSON; `pareceres.csv` |
| Aba EXCERTOS | `excertos[]` do JSON; `excertos.csv` |
| Aba CONTAGEM_AUSENCIAS | bloco `ausencias`; `ausencias.csv` |
| Abas RESUMO_* | Painel do Codificador; qualquer tabela dinâmica sobre os CSV |
| Aba DICIONARIO | Página Método do Codificador; `02_Livro_de_Codigos.md` |
| Coluna Nivel_Registro, digitada | `nivel_registro`, calculado |
| Coluna Dimensao_Nivel (MC/MS), digitada | `dimensao_nivel`, calculado |

## 5. Unidades de contagem
- **Excerto:** dimensões, nível do registro, âncoras, rótulo.
- **Parecer:** presença de cada dimensão, direito, campo e categoria matriz; sinais (ESP, BLG, ACU).
- BLG e ACU também se leem só entre os pareceres de crianças imigrantes (`Imigracao = Sim`).
- Nunca somar códigos de conjuntos diferentes.

## 6. Outros arquivos
- **Backup** (`BACKUP_pibic_…json`): todos os pareceres, inclusive rascunhos, para restaurar em outro navegador. O Codificador importa sem gravar por cima do que já existe.
- **Pacote** (`…json`): aparece no lugar do ZIP quando a visualização não permite baixar arquivos. Traz os mesmos registros e pode ser importado.

## 7. Reunir dados de dois lugares
**Importar** aceita backup, pacote ou registros avulsos, e segue três leis:
1. **Nada é gravado por cima.** A identidade de um registro é o seu resumo de integridade. O que já está aqui fica como está.
2. **Um código, uma linhagem.** Se o código já tem parecer aqui, o que chega fica de fora e é listado no relato da importação. A exceção é a correção (versão seguinte) do parecer que está aqui.
3. **Um número, um registro.** O registro que chega com número já usado por outro parecer recebe o próximo número livre. O bloco `origem` guarda o número anterior, e o resumo é refeito.

As mesmas leis valem entre dois aparelhos na mesma conta. Se os dois finalizarem o mesmo código sem se ver, vale o finalizado por último, e o outro vai para o histórico.
