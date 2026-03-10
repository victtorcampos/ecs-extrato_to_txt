# Layout de Importacao v2 — Documento de Ideia (Revisado)

> Documento para discussao. Nenhuma implementacao sera feita sem aprovacao.
> Evolucao do documento v1, com simulacao mental de cenarios reais e foco em simplicidade para o usuario.

---

## 1. Motivacao

O contador recebe arquivos de dezenas de clientes, cada um com formato diferente.
Hoje ele precisa:
1. Entender o formato do arquivo
2. Configurar um layout manualmente (colunas, regras, D/C)
3. Processar e resolver pendencias

**Problema real**: O passo 2 e complexo demais para um usuario nao-tecnico. Ele precisa entender conceitos como "campo destino", "tipo de dado", "operador de condicao", "regex".

**Objetivo v2**: Manter a flexibilidade atual, mas tornar o caminho feliz simples e rapido. O sistema deve fazer o maximo de trabalho automatico possivel, e so pedir decisao do usuario quando nao conseguir inferir.

---

## 2. Simulacao Mental — 7 Cenarios Reais

### Cenario 1: Extrato bancario simples (mais comum)

```
Arquivo recebido:
     A          B           C
1    DATA       DESCRICAO   VALOR
2    01/02/2026 PGTO LUZ    -350,00
3    02/02/2026 RECEBIMENTO  1.200,00
4    05/02/2026 PGTO ALUGUEL -2.500,00
```

**Fluxo ideal do usuario:**
1. Upload do arquivo + CNPJ + Periodo
2. Sistema mostra previa → detecta automaticamente:
   - Cabecalho na linha 1, dados na linha 2
   - Coluna A = data (formato DD/MM/AAAA)
   - Coluna B = texto (historico)
   - Coluna C = numero com formato BR (valor)
3. Usuario so confirma o mapeamento sugerido e define as contas:
   - Negativo → Debito: 45, Credito: 25
   - Positivo → Debito: 25, Credito: 45
4. Processar → Gerar TXT

**Fricao atual**: O usuario precisa configurar manualmente cada coluna, selecionar tipo de dado, formato de numero, criar regras de conta do zero.

**Melhoria v2**: Auto-deteccao de tipos + templates de regras pre-prontos.

---

### Cenario 2: Planilha com linhas de metadados no topo

```
     A              B             C          D            E          F            G
1    SALDOINICIAL   15.000,00
2    DATA EMISSAO   01/02/2026
3    RAZAO SOCIAL   EMPRESA XYZ LTDA
4    DATA           VALOR         D/C        DOC FISCAL   DOC PAG    HISTORICO    FORNECEDOR
5
6    01/02/2026     356,12        DEBITO     NF-001       BOL-001    PGTO BOLETO  SERVICOS LTDA
7    02/02/2026     1.200,00      CREDITO    NF-002       TED-002    RECEBIMENTO  CLIENTE ABC
```

**Fluxo ideal:**
1. Upload
2. Previa mostra todas as linhas → usuario ve que linhas 1-3 sao metadados
3. Sistema sugere: "Cabecalho = linha 4, Dados = linha 6" (detecta que linha 5 esta vazia)
4. Sistema sugere mapeamento:
   - A → data, B → valor, C → tipo D/C, D → doc_fiscal, E → doc_pagamento, F → historico, G → razao_social
5. ConfigValor: coluna D/C (coluna C), com mapeamento DEBITO→debito, CREDITO→credito
6. Regras: baseadas no tipo D/C
7. Processar

**Fricao atual**: O usuario precisa contar manualmente qual e a linha do cabecalho e qual e a de inicio dos dados. Se errar, o parse falha silenciosamente.

**Melhoria v2**: Na previa, o usuario clica na linha do cabecalho e o sistema configura automaticamente. Deteccao automatica da primeira linha de dados apos o cabecalho.

---

### Cenario 3: Valor com D/C embutido (sufixo)

```
     A          B              C
1    DATA       DESCRICAO      VALOR
2    01/02/2026 PGTO BOLETO    356,12 D
3    02/02/2026 RECEBIMENTO    1.200,00 C
```

**Fluxo ideal:**
1. Upload → previa
2. Sistema detecta que coluna C tem padrao "numero + letra" → sugere transformacao "valor com D/C sufixo"
3. Mapeamento automatico + regras baseadas em D/C
4. Processar

**Fricao atual**: O usuario precisa saber que existe a opcao "valor_com_dc = sufixo" escondida dentro do modal de transformacao.

**Melhoria v2**: Deteccao automatica do padrao e sugestao proativa.

---

### Cenario 4: Colunas de debito e credito separadas

```
     A          B               C              D
1    DATA       HISTORICO       VLR DEBITO     VLR CREDITO
2    01/02/2026 PGTO BOLETO     350,00
3    02/02/2026 RECEBIMENTO                    1.200,00
4    05/02/2026 PGTO ALUGUEL    2.500,00
```

**Fluxo ideal:**
1. Upload → previa
2. Sistema detecta duas colunas numericas com valores mutuamente exclusivos → sugere "colunas separadas"
3. ConfigValor: coluna_debito = C, coluna_credito = D
4. Definir contas fixas ou regras simples
5. Processar

**Fricao atual**: Funciona, mas o usuario precisa entender que deve selecionar "colunas_separadas" no ConfigValor e mapear as colunas corretas.

**Melhoria v2**: Deteccao do padrao mutuamente exclusivo entre colunas numericas.

---

### Cenario 5: Campo composto (CNPJ + Nome juntos)

```
     A          B                                    C
1    DATA       EMPRESA                              VALOR
2    01/02/2026 25789456000196 - SERVICOS LTDA       350,00
3    02/02/2026 12345678000190 - COMERCIO ABC SA     1.200,00
```

**Fluxo ideal:**
1. Upload → previa
2. Sistema detecta padrao "14 digitos + separador + texto" na coluna B → sugere campo composto CNPJ+Nome
3. Mapeamento: B → cnpj_cpf_terceiro + razao_social_terceiro (com separador " - ")
4. Processar

**Fricao atual**: Funciona, mas o usuario precisa abrir o modal de transformacao, selecionar "campo_composto = cnpj_cpf_nome" e definir o separador.

**Melhoria v2**: Deteccao automatica do padrao CNPJ + separador + texto.

---

### Cenario 6: Regras condicionais complexas (por conteudo)

```
     A          B              C          D
1    DATA       DESCRICAO      VALOR      EMPRESA
2    01/02/2026 PAGAMENTO      350,00     78456123000174
3    02/02/2026 RECEBIMENTO    1.200,00   78456123000174
4    05/02/2026 PAGAMENTO      500,00     99887766000155
5    08/02/2026 TRANSFERENCIA  800,00     99887766000155
```

**Fluxo ideal:**
1. Upload → previa → mapeamento
2. Para contas: nao ha colunas de conta no Excel
3. Sistema mostra o builder de regras com templates:
   - Template "Por tipo de operacao": SE DESCRICAO contem "PAGAMENTO" → contas X/Y
   - Template "Por empresa": SE EMPRESA = "78456123000174" → contas W/Z
4. Usuario combina regras com prioridade (mais especifica primeiro)
5. Processar

**Fricao atual**: O builder de regras funciona bem, mas o usuario nao sabe por onde comecar. Os templates ajudam, mas poderiam ser mais inteligentes.

**Melhoria v2**: Templates contextuais — o sistema analisa os dados reais e sugere regras baseadas nos valores unicos encontrados nas colunas.

---

### Cenario 7: Arquivo OFX (futuro)

```xml
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260201</DTPOSTED>
            <TRNAMT>-350.00</TRNAMT>
            <MEMO>PGTO LUZ</MEMO>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>
```

**Fluxo ideal:**
1. Upload do arquivo .ofx + CNPJ + Periodo
2. Sistema reconhece formato OFX → **nao precisa de layout**
3. Campos ja padronizados:
   - DTPOSTED → data
   - TRNAMT → valor (sinal determina D/C)
   - MEMO → historico
   - TRNTYPE → tipo (DEBIT/CREDIT)
4. Usuario so define as contas (regras ou fixas)
5. Processar

**O que muda**: OFX e um formato padrao. Nao precisa de mapeamento de colunas nem de ConfigPlanilha. Precisa apenas de regras de contas.

---

## 3. Analise — Onde esta a Complexidade Desnecessaria

| Etapa | Complexidade para o usuario | Pode ser automatizada? |
|-------|----------------------------|------------------------|
| Upload do arquivo | Baixa | — |
| Definir linha cabecalho/dados | Media | Sim — auto-deteccao |
| Mapear colunas para campos | Alta | Parcial — sugestao por nome/tipo |
| Configurar tipo de dado | Media | Sim — inferencia automatica |
| Configurar formato de numero | Media | Sim — deteccao de padrao |
| Configurar D/C | Alta | Parcial — deteccao de padrao |
| Criar regras de conta | Alta | Parcial — templates contextuais |
| Resolver pendencias de mapeamento | Media | Nao — requer conhecimento contabil |

**Conclusao**: 5 das 8 etapas podem ser total ou parcialmente automatizadas.

---

## 4. Fluxo Proposto v2

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE IMPORTACAO v2                           │
│                                                                         │
│  ┌──────────┐   ┌───────────┐   ┌────────────┐   ┌──────────────────┐  │
│  │ 1.UPLOAD │──▶│ 2.DETECTAR│──▶│ 3.CONFIRMAR│──▶│ 4.CONTAS/REGRAS  │  │
│  │          │   │  (auto)   │   │  (usuario) │   │   (usuario)      │  │
│  └──────────┘   └───────────┘   └────────────┘   └────────┬─────────┘  │
│                                                            │            │
│                                               ┌────────────▼─────────┐  │
│                                               │ 5.PREVIEW + VALIDAR  │  │
│                                               │    (automatico)      │  │
│                                               └────────────┬─────────┘  │
│                                                            │            │
│                                               ┌────────────▼─────────┐  │
│                                               │ 6.PROCESSAR/PENDENC. │  │
│                                               └──────────────────────┘  │
│                                                                         │
│  Atalho: Se layout existente → 1 ──▶ 5 ──▶ 6                          │
│  Atalho: Se arquivo OFX      → 1 ──▶ 4 ──▶ 5 ──▶ 6                   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Diferenca fundamental vs v1

| v1 | v2 |
|----|-----|
| Usuario configura tudo manualmente | Sistema detecta e sugere, usuario confirma |
| 4 fases fixas | Fases adaptativas (pula o que nao precisa) |
| Layout = receita manual | Layout = receita gerada automaticamente + ajuste fino |
| Sem preview de resultado | Preview obrigatorio antes de processar |
| Suporte apenas Excel | Extensivel para OFX e outros formatos |

---

### FASE 1 — Upload

Igual ao v1, com uma adicao:

| Campo       | Obrigatorio | Descricao                                              |
|-------------|-------------|--------------------------------------------------------|
| Arquivo     | Sim         | `.xls`, `.xlsx`, `.ofx` (futuro: `.csv`, `.pdf`)      |
| CNPJ        | Sim         | CNPJ da empresa dona dos dados                         |
| Periodo     | Sim         | Mes/Ano de referencia                                  |

**Mudanca**: O sistema detecta o tipo de arquivo pela extensao e ajusta o fluxo:
- `.xls`/`.xlsx` → fluxo completo (Fase 2+)
- `.ofx` → pula direto para Fase 4 (contas/regras), pois o formato e padrao

---

### FASE 2 — Deteccao Automatica (NOVA)

O sistema analisa o arquivo e produz uma **sugestao de layout** sem intervencao do usuario.

#### 2A. Deteccao de estrutura

```
Algoritmo:
1. Ler todas as linhas do Excel
2. Para cada linha, calcular um "score de cabecalho":
   - % de celulas que sao texto puro (sem numeros, sem datas) → alto = provavel cabecalho
   - % de celulas vazias → alto = provavel separador
3. Linha com maior score de cabecalho = linha_cabecalho
4. Primeira linha apos cabecalho com dados numericos = linha_inicio_dados
5. Linhas entre cabecalho e dados = separadores (ignorar)
```

**Resultado**: `ConfigPlanilha { linha_cabecalho, linha_inicio_dados, nome_aba }`

#### 2B. Deteccao de tipos de coluna

Para cada coluna, analisar as primeiras N linhas de dados:

```
Algoritmo por coluna:
1. Coletar valores unicos (amostra)
2. Testar padroes:
   - DD/MM/AAAA ou variantes → tipo: DATA
   - Numero com virgula decimal (BR) → tipo: DECIMAL, formato: BR
   - Numero com ponto decimal (US) → tipo: DECIMAL, formato: US
   - "R$ X.XXX,XX" → tipo: DECIMAL, formato: BR_MOEDA
   - "XXX,XX D" ou "D XXX,XX" → tipo: DECIMAL + D/C embutido
   - 14 digitos + separador + texto → tipo: CAMPO_COMPOSTO (CNPJ+Nome)
   - 11 ou 14 digitos puros → tipo: CNPJ/CPF
   - Texto puro → tipo: STRING
3. Calcular confianca (% de valores que batem o padrao)
```

#### 2C. Sugestao de mapeamento

Combinar nome do cabecalho + tipo detectado para sugerir campo destino:

```
Heuristicas de nome:
- "DATA", "DT", "DATE" → data
- "VALOR", "VLR", "VALUE", "AMOUNT" → valor
- "HIST", "DESC", "DESCRICAO", "MEMO" → historico
- "DEB", "DEBITO", "DEBIT" → conta_debito OU tipo_dc
- "CRED", "CREDITO", "CREDIT" → conta_credito OU tipo_dc
- "DOC", "NF", "NOTA" → documento / doc_fiscal
- "CNPJ", "CPF" → cnpj_cpf_terceiro
- "EMPRESA", "FORNECEDOR", "RAZAO" → razao_social_terceiro
- "D/C", "TIPO", "DEBITO/CREDITO" → tipo_dc (coluna indicadora)
- Nao reconhecido → "— Ignorar —" (com confianca baixa)
```

#### 2D. Sugestao de ConfigValor

```
Algoritmo:
1. Se existe coluna mapeada como tipo_dc → COLUNA_TIPO
2. Se existe coluna valor com D/C embutido → detectar SUFIXO ou PREFIXO
3. Se existem duas colunas de valor mutuamente exclusivas → COLUNAS_SEPARADAS
4. Se valores tem sinais positivos e negativos → SINAL_VALOR
5. Se todos valores sao positivos → FIXO (perguntar ao usuario)
```

**Saida da Fase 2**: Layout sugerido completo, com indicador de confianca por campo:
- Alta confianca (>90%) → marcado em verde
- Media confianca (50-90%) → marcado em amarelo (usuario deve revisar)
- Baixa confianca (<50%) → marcado em vermelho (usuario deve definir)

---

### FASE 3 — Confirmacao pelo Usuario

Tela de revisao em formato de tabela intuitiva:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MAPEAMENTO DETECTADO                    Cabecalho: Linha 4 | Dados: Linha 6│
│                                                                             │
│ Coluna Excel │ Cabecalho  │ Campo Destino          │ Tipo    │ Confianca   │
│──────────────┼────────────┼────────────────────────┼─────────┼─────────────│
│ A            │ DATA       │ [Data            ▼]    │ Data    │ 🟢 Alta     │
│ B            │ VALOR      │ [Valor           ▼]    │ Decimal │ 🟢 Alta     │
│ C            │ DESCRICAO  │ [Historico       ▼]    │ Texto   │ 🟢 Alta     │
│ D            │ EMPRESA    │ [Razao Social    ▼]    │ Texto   │ 🟡 Media    │
│ E            │ CODIGO     │ [— Ignorar —    ▼]    │ Texto   │ 🔴 Baixa    │
│                                                                             │
│ Valores de amostra:                                                         │
│ A: 01/02/2026, 02/02/2026, 05/02/2026                                     │
│ B: -350,00 | 1.200,00 | -2.500,00                                         │
│ C: PGTO LUZ, RECEBIMENTO, PGTO ALUGUEL                                    │
│ D: SERVICOS LTDA, CLIENTE ABC, IMOBILIARIA XYZ                            │
│ E: 001, 002, 003                                                           │
│                                                                             │
│ Debito/Credito: [Sinal do valor (+/-)  ▼]  (detectado automaticamente)     │
│                                                                             │
│             [Confirmar e Avancar]    [Editar Detalhes]                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Principio**: O usuario so precisa olhar e confirmar. Se tudo esta verde, um clique e segue.
O botao "Editar Detalhes" abre as opcoes avancadas (como hoje): transformacoes, regex, concat, etc.

---

### FASE 4 — Contas e Regras

**Se o Excel ja tem colunas de conta_debito e conta_credito**: Fase automatica, pula para 5.

**Se nao tem**: O usuario precisa definir como determinar as contas.

#### Abordagem simplificada: Templates Contextuais

O sistema analisa os dados reais e sugere templates relevantes:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ DEFINICAO DE CONTAS                                                         │
│                                                                             │
│ O arquivo NAO tem colunas de conta. Como definir as contas?                │
│                                                                             │
│ Sugestoes baseadas nos seus dados:                                          │
│                                                                             │
│ ┌─ TEMPLATE SUGERIDO ──────────────────────────────────────────────────┐   │
│ │ "Por sinal do valor"                                                  │   │
│ │ Detectamos valores positivos e negativos na coluna VALOR.            │   │
│ │                                                                       │   │
│ │ Valor negativo (saida) → Debito: [____] Credito: [____]             │   │
│ │ Valor positivo (entrada) → Debito: [____] Credito: [____]           │   │
│ │                                                                       │   │
│ │                                   [Usar este template]               │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ┌─ OUTRO TEMPLATE ─────────────────────────────────────────────────────┐   │
│ │ "Por descricao"                                                       │   │
│ │ Encontramos 3 descricoes unicas: PGTO LUZ, RECEBIMENTO, PGTO ALUGUEL│   │
│ │                                                                       │   │
│ │ PGTO LUZ     → Debito: [____] Credito: [____]                       │   │
│ │ RECEBIMENTO  → Debito: [____] Credito: [____]                       │   │
│ │ PGTO ALUGUEL → Debito: [____] Credito: [____]                       │   │
│ │                                                                       │   │
│ │                                   [Usar este template]               │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ [+ Criar regra personalizada]    [+ Regra avancada (builder)]              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Diferenca vs v1**: Em vez de mostrar um builder vazio, o sistema pre-preenche com base nos dados reais. O usuario so precisa digitar os numeros das contas.

---

### FASE 5 — Preview + Validacao (NOVA — obrigatoria)

Antes de processar, o sistema mostra exatamente o que sera gerado:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PREVIEW DO RESULTADO          Mostrando 10 de 150 lancamentos              │
│                                                                             │
│  # │ Data       │ Debito │ Credito │ Valor     │ Historico        │ Status │
│ ───┼────────────┼────────┼─────────┼───────────┼──────────────────┼────────│
│  1 │ 01/02/2026 │ 45     │ 25      │ 350,00    │ PGTO LUZ         │ ✅ OK  │
│  2 │ 02/02/2026 │ 25     │ 45      │ 1.200,00  │ RECEBIMENTO      │ ✅ OK  │
│  3 │ 05/02/2026 │ 45     │ 25      │ 2.500,00  │ PGTO ALUGUEL     │ ✅ OK  │
│  4 │ 15/03/2026 │ 45     │ 25      │ 100,00    │ PGTO TELEFONE    │ ⚠ Fora │
│  5 │ 08/02/2026 │ —      │ —       │ 450,00    │ TRANSFERENCIA    │ ❌ Sem │
│                                                                    │ conta  │
│                                                                             │
│ RESUMO:                                                                     │
│ ✅ 145 lancamentos OK                                                       │
│ ⚠️  3 lancamentos fora do periodo (serao ignorados)                         │
│ ❌  2 lancamentos sem conta definida (irao para pendencias)                 │
│                                                                             │
│ Valor total: R$ 45.230,00                                                  │
│                                                                             │
│          [Voltar e Ajustar]    [Processar 145 Lancamentos]                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Endpoint**:
```
POST /api/v1/import-layouts/test-parse
Body: { arquivo_base64, layout_id OU layout_config_inline, periodo_mes, periodo_ano }
Response: {
  lancamentos: [...],
  resumo: { total, ok, fora_periodo, sem_conta, erros },
  erros: [{ linha, campo, mensagem }]
}
```

**Por que e obrigatoria**: Evita que o usuario processe um lote inteiro, descubra erros, delete, reconfigure e reprocesse. O preview e instantaneo e nao grava nada.

---

### FASE 6 — Processamento + Pendencias

Igual ao v1. O pipeline ja implementado funciona bem.

Adicao: se o preview ja mostrou pendencias, o usuario pode optar por resolver ANTES de processar (via tela de preview), em vez de processar e depois resolver.

---

## 5. Suporte a OFX (Futuro)

### O que e OFX

OFX (Open Financial Exchange) e um formato padrao usado por bancos para exportar extratos. E um XML com estrutura fixa.

### Por que facilita

| Aspecto | Excel | OFX |
|---------|-------|-----|
| Formato | Livre (cada cliente diferente) | Padrao (todos iguais) |
| Precisa de layout? | Sim | Nao |
| Mapeamento de colunas | Manual/auto-detectado | Fixo |
| Tipo de dado | Precisa inferir | Definido pelo padrao |
| D/C | Precisa configurar | TRNTYPE e sinal do TRNAMT |

### Mapeamento fixo OFX → Lancamento

| Campo OFX | Campo sistema | Transformacao |
|-----------|---------------|---------------|
| `DTPOSTED` | data | AAAAMMDD → date |
| `TRNAMT` | valor | String → float (formato US) |
| `TRNTYPE` | _tipo_dc | DEBIT/CREDIT → debito/credito |
| `MEMO` | historico | Direto |
| `FITID` | documento | Direto (ID unico da transacao) |
| `CHECKNUM` | doc_pagamento | Direto (numero do cheque) |
| `NAME` | razao_social_terceiro | Direto |
| `BANKACCTFROM/ACCTID` | conta_banco | Conta de origem |

### Fluxo OFX simplificado

```
1. Upload .ofx + CNPJ + Periodo
2. Parser OFX extrai transacoes automaticamente (sem layout)
3. Usuario define APENAS as regras de conta:
   - DEBIT → Debito: [__] Credito: [__]
   - CREDIT → Debito: [__] Credito: [__]
   - Ou regras mais granulares por MEMO/NAME
4. Preview → Processar
```

### Impacto na arquitetura

```
Nova porta: OFXParserPort
  def parse(arquivo_bytes: bytes) -> List[Lancamento]

Nova implementacao: OFXParserAdapter
  - Usa biblioteca python ofxparse ou ofxtools
  - Retorna Lancamentos ja tipados

Modificacao em ProcessarLoteUseCase:
  - Detectar tipo de arquivo (Excel vs OFX)
  - Se OFX → usar OFXParser (sem layout)
  - Se Excel → usar DynamicExcelParser (com layout)
```

O `ProcessarLoteUseCase` ja tem a logica de "se tem layout_id usa DynamicParser, senao usa parser padrao". A mesma logica se estende para OFX: se o arquivo e `.ofx`, usa OFXParser diretamente.

---

## 6. Arquitetura v2 — Mudancas em Relacao ao v1

### Novas entidades/conceitos

```
┌─────────────────────────────────────────────────────────────────┐
│ DOMAIN                                                          │
│                                                                 │
│ (existente, sem mudanca)                                        │
│ LayoutExcel, ColunaLayout, ConfigPlanilha, ConfigValor,         │
│ RegraContaLayout, CondicaoContaLayout                           │
│                                                                 │
│ (novo)                                                          │
│ DeteccaoLayout ── resultado da auto-deteccao                    │
│   ├── config_planilha_sugerida: ConfigPlanilha                  │
│   ├── colunas_sugeridas: List[ColunaSugerida]                   │
│   │     └── { campo_destino, coluna_excel, tipo_dado,           │
│   │          formato, transformacao, confianca: float }          │
│   ├── config_valor_sugerida: ConfigValor                        │
│   └── templates_regras_sugeridos: List[TemplateRegraSugerido]   │
│         └── { nome, descricao, regras: List[RegraContaLayout],  │
│              baseado_em: str }                                   │
│                                                                 │
│ TipoArquivoImportacao (enum)                                    │
│   EXCEL_XLS, EXCEL_XLSX, OFX (futuro: CSV, PDF_EXTRATO)        │
└─────────────────────────────────────────────────────────────────┘
```

### Novos use cases

```
┌─────────────────────────────────────────────────────────────────┐
│ APPLICATION                                                      │
│                                                                  │
│ (existente, sem mudanca)                                         │
│ CriarLayoutUseCase, AtualizarLayoutUseCase, ClonarLayoutUseCase │
│ ProcessarLoteUseCase, CriarProtocoloUseCase                      │
│ ResolverPendenciaUseCase, ConsultarLoteUseCase                   │
│                                                                  │
│ (novo)                                                           │
│ DetectarLayoutUseCase                                            │
│   - Recebe: arquivo_base64                                       │
│   - Retorna: DeteccaoLayout (sugestao completa)                  │
│   - Usado na Fase 2 do fluxo                                    │
│                                                                  │
│ PreviewParseUseCase                                              │
│   - Recebe: arquivo_base64, layout (id ou inline), periodo       │
│   - Retorna: { lancamentos[], resumo, erros[] }                  │
│   - Nao grava nada — apenas simula                               │
│   - Usado na Fase 5 do fluxo                                    │
│                                                                  │
│ (futuro)                                                         │
│ ImportarOFXUseCase                                               │
│   - Recebe: arquivo_bytes, cnpj, periodo                         │
│   - Retorna: List[Lancamento] (sem layout)                       │
└─────────────────────────────────────────────────────────────────┘
```

### Novos endpoints

```
# Auto-deteccao de layout
POST /api/v1/import-layouts/detect
Body: { arquivo_base64, nome_aba? }
Response: DeteccaoLayoutResponse {
  config_planilha: { linha_cabecalho, linha_inicio_dados, nome_aba },
  colunas: [{ campo_destino, coluna_excel, tipo_dado, formato,
              transformacao, confianca, valores_amostra }],
  config_valor: { tipo_sinal, ... },
  templates_regras: [{ nome, descricao, regras }]
}

# Preview de parsing (simula sem gravar)
POST /api/v1/import-layouts/test-parse
Body: { arquivo_base64, layout_id | layout_config, periodo_mes, periodo_ano }
Response: {
  lancamentos: [{ data, valor, conta_debito, conta_credito, historico, status }],
  resumo: { total, ok, fora_periodo, sem_conta, erros },
  erros: [{ linha, campo, mensagem }]
}
```

---

## 7. Resumo das Prioridades

| # | Melhoria | Impacto no usuario | Complexidade tecnica | Depende de |
|---|----------|-------------------|---------------------|------------|
| 1 | **Preview de Parsing** (Fase 5) | Alto — evita erros | Baixa — reutiliza pipeline existente | Nada |
| 2 | **Auto-deteccao de layout** (Fase 2) | Alto — reduz trabalho manual | Media — algoritmos de inferencia | Nada |
| 3 | **Templates contextuais de regras** (Fase 4) | Medio — facilita configuracao | Baixa — analise de dados + UI | #2 |
| 4 | **Integrar perfil de saida** no processamento | Medio — funcionalidade incompleta | Baixa — campo ja existe | Nada |
| 5 | **Suporte OFX** | Alto — formato bancario padrao | Media — novo parser + ajustes UI | Nada |
| 6 | **Wizard UX** (steps visuais) | Medio — melhor experiencia | Baixa — refatoracao de UI | #1, #2 |

### Ordem sugerida de implementacao

```
Fase A (fundacao):     #1 Preview + #4 Perfil de saida
Fase B (inteligencia): #2 Auto-deteccao + #3 Templates contextuais
Fase C (UX):           #6 Wizard com steps visuais
Fase D (expansao):     #5 Suporte OFX
```

**Justificativa**:
- Preview (#1) e o maior ganho imediato com menor esforco — reutiliza o ProcessarLoteUseCase sem gravar.
- Perfil de saida (#4) completa uma funcionalidade ja modelada e parcialmente implementada.
- Auto-deteccao (#2) e o diferencial que torna o sistema "inteligente" para o usuario.
- OFX (#5) por ultimo porque requer um parser novo e ajustes no fluxo, mas abre o sistema para o formato bancario mais universal.

---

## 8. Perguntas para Discussao

1. **Preview**: Deve ser obrigatorio (sempre mostrar antes de processar) ou opcional (botao "Testar")?
2. **Auto-deteccao**: Qual nivel de confianca minima para aceitar uma sugestao sem confirmacao do usuario? (sugestao: 90%)
3. **OFX**: Priorizar para antes da auto-deteccao? Bancos sao a fonte mais comum de arquivos?
4. **Formato de saida**: Alem de Dominio Sistemas, quais outros sistemas contabeis sao prioridade?
5. **CSV**: Incluir suporte a `.csv` junto com `.xls`/`.xlsx`? E trivial tecnicamente e muitos clientes exportam em CSV.
