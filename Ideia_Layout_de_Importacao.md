# Layout de Importação — Documento de Ideia

> Documento para discussão. Nenhuma implementação será feita sem aprovação.

---

## 1. Contexto

O sistema contábil precisa importar dados de arquivos Excel (`.xls` / `.xlsx`) de **qualquer formato** e transformá-los em lançamentos contábeis padronizados. Cada cliente/empresa pode ter um formato de Excel completamente diferente — colunas em posições diferentes, formatos de número distintos, formas variadas de indicar débito/crédito, e até informações adicionais misturadas antes dos dados reais.

O **Layout de Importação** é o componente central que resolve isso: ele é uma "receita" que ensina o sistema a ler qualquer formato de Excel.

---

## 2. Objetivo

Permitir que o usuário final (contador) configure **uma vez** como ler cada formato de Excel que ele recebe, e depois reutilize essa configuração para todos os arquivos futuros do mesmo formato — sem precisar de programação, sem depender de suporte técnico.

**Resultado final de cada importação (campos padronizados):**

| Campo              | Obrigatório | Origem                                     |
|--------------------|-------------|---------------------------------------------|
| Data               | Sim         | Coluna do Excel                             |
| Valor              | Sim         | Coluna do Excel (com transformação de formato) |
| Conta Débito       | Sim         | Coluna do Excel OU regra condicional         |
| Conta Crédito      | Sim         | Coluna do Excel OU regra condicional         |
| Histórico          | Sim         | Coluna do Excel OU concatenação de colunas   |
| Documento Fiscal   | Não         | Coluna do Excel                             |
| Documento Pagamento| Não         | Coluna do Excel                             |
| CNPJ/CPF Terceiro  | Não         | Coluna do Excel (parsing de campo composto)  |
| Razão Social/Nome  | Não         | Coluna do Excel (parsing de campo composto)  |

---

## 3. Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DE IMPORTAÇÃO                       │
│                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐ │
│  │ 1.UPLOAD │──▶│ 2.PRÉVIA │──▶│ 3.LAYOUT │──▶│4.PROCESS│ │
│  └──────────┘   └──────────┘   └──────────┘   └────┬────┘ │
│                                                      │      │
│                                           ┌──────────▼───┐  │
│                                           │ 5.PENDÊNCIAS │  │
│                                           │  (se houver) │  │
│                                           └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

### FASE 1 — Upload do Arquivo

O usuário fornece:

| Campo       | Obrigatório | Descrição                                              |
|-------------|-------------|--------------------------------------------------------|
| Arquivo     | Sim         | `.xls` ou `.xlsx`                                      |
| CNPJ        | Sim         | CNPJ da empresa dona dos dados                         |
| Período     | Sim         | Mês/Ano de referência                                  |
| Banco       | Não         | Se houver mais de um banco, será tratado como coluna   |

**O que acontece no backend:**
- Arquivo é registrado com um **protocolo** único
- Arquivo é armazenado em base64
- Status inicial: `RECEBIDO`

---

### FASE 2 — Prévia da Planilha

O sistema exibe uma tabela com as primeiras linhas do Excel, usando letras para colunas e números para linhas:

```
     A    B          C             D              E       F            G                   H
 1                                                                                        
 2                                                                                        
 3                                                                                        
 4   ID   DATA       CONTA DÉB    CONTA CRÉD     VALOR   HISTÓRICO    FORNECEDOR          CNPJ/CPF
 5                                                                                        
 6   1    01/02/2026 789           45             25,05   PGTO BOLETO  SERVIÇOS LTDA       23456789000196
 7   2    02/02/2026 789           45             35,11   PGTO BOLETO  SERVIÇOS LTDA       23456789000196
```

O usuário configura:
- **Linha do Cabeçalho**: qual linha contém os nomes das colunas (ex: 4)
- **Linha Início dos Dados**: onde começam os dados reais (ex: 6)
- **Aba**: se houver mais de uma

Essa etapa é fundamental para lidar com planilhas que têm linhas de metadados antes dos dados (como no Exemplo 2, onde as 3 primeiras linhas são SALDOINICIAL, DATA EMISSÃO, RASÃO SOCIAL).

**Decisão do usuário aqui:**
- Selecionar um **Layout existente** para este CNPJ → pula para Fase 4
- Criar um **Novo Layout** → vai para Fase 3

---

### FASE 3 — Configuração do Layout (Novo ou Edição)

O Layout é dividido em **3 camadas** que são configuradas em sequência:

#### 3A. Mapeamento de Colunas

Para cada coluna visível na prévia, o usuário define:

| Configuração    | Descrição                                            | Exemplos                           |
|-----------------|------------------------------------------------------|------------------------------------|
| Cabeçalho       | Nome detectado do Excel (automático)                  | "DATA", "VALOR", "DESCRIÇÃO"      |
| Coluna Excel    | Referência da coluna (automático)                     | A, B, C... ou 0, 1, 2...          |
| Campo Destino   | Para qual campo do sistema essa coluna vai            | `data`, `valor`, `historico`, `— Ignorar —` |
| Tipo de Dado    | Como interpretar                                      | Texto, Data, Número                |
| Obrigatório?    | Se a linha é inválida sem este campo                  | ✅ / ❌                            |

**Transformações avançadas** (configuráveis por coluna):

| Transformação          | Quando usar                                | Exemplo                                          |
|------------------------|--------------------------------------------|--------------------------------------------------|
| Formato de número      | Valor em formato BR, US, moeda             | `1.234,56` → `1234.56`                           |
| Formato de data        | Datas em diferentes formatos               | `DD/MM/AAAA`, `DD-MM-AA`, `MM/AAAA`              |
| D/C embutido no valor  | Valor contém indicador D/C                 | `356,12 D` → valor: 356.12, tipo: débito         |
| Campo composto         | Uma coluna tem CNPJ+Nome juntos            | `25789456000196 - EMPRESA LTDA` → CNPJ + Nome    |
| Regex                  | Extrair parte específica do texto          | `(\d{14})` para extrair só o CNPJ                |
| Concatenar colunas     | Juntar várias colunas em um campo          | EMPRESA + DESCRIÇÃO + DOC PAG → Histórico         |

#### 3B. Determinação de Débito/Crédito (ConfigValor)

Define **como o sistema sabe se um lançamento é débito ou crédito**:

| Método              | Descrição                                              | Uso                                  |
|---------------------|--------------------------------------------------------|--------------------------------------|
| Sinal do valor      | Negativo = um sentido, Positivo = outro                | Exemplo 1 (`-356,12`)                |
| Coluna D/C          | Uma coluna específica contém "DÉBITO" ou "CRÉDITO"     | Exemplo 2 (coluna DÉBITO/CREDITO)    |
| D/C embutido        | O próprio valor contém D ou C                          | Exemplo 3 (`356,12 D`)               |
| Colunas separadas   | Débito e Crédito em colunas diferentes                 | Duas colunas com valores separados   |
| Fixo                | Sempre débito ou sempre crédito                        | Layouts de tipo único                |

> Esta etapa responde à pergunta: "É débito ou crédito?" — mas **NÃO define qual conta usar**. Isso é feito na próxima camada.

#### 3C. Regras de Definição de Contas

Esta é a camada que define **QUAIS CONTAS** usar para débito e crédito. É necessária quando o Excel não tem colunas de conta_debito/conta_credito, ou quando as contas dependem de condições.

**Estrutura de uma regra:**
```
REGRA: [Nome]
  SE: [Condição 1] E [Condição 2] E ...
  ENTÃO: Conta Débito = [X], Conta Crédito = [Y]
```

**A primeira regra que bater (em ordem de prioridade), vence.**

**Demonstração com os 5 exemplos:**

---

**Exemplo 1 — Sinal do valor:**
```
Regra 1: "Valor Negativo"
  SE: sinal do valor = NEGATIVO
  ENTÃO: Débito = 45, Crédito = 25

Regra 2: "Valor Positivo"
  SE: sinal do valor = POSITIVO
  ENTÃO: Débito = 25, Crédito = 45
```

Mapeamento de colunas: B→data, C→valor (BR), D→doc_fiscal, E→doc_pagamento, F→historico (concat: G+F+E+D), G→cnpj_cpf_e_nome (composto)

---

**Exemplo 2 — Coluna D/C:**
```
Config Planilha: cabeçalho=3, dados=4 (pulando as 3 linhas de metadados)
Config Valor: coluna_tipo = D (coluna DÉBITO/CREDITO)

Regra 1: "Débito"
  SE: tipo D/C = DÉBITO
  ENTÃO: Débito = 45, Crédito = 25

Regra 2: "Crédito"
  SE: tipo D/C = CRÉDITO
  ENTÃO: Débito = 25, Crédito = 45
```

Mapeamento: B→data, C→valor (BR), E→doc_fiscal, F→doc_pagamento, G→historico (concat: G+F+E)

---

**Exemplo 3 — D/C embutido no valor:**
```
Mapeamento: C→valor com transformação: valor_com_dc = sufixo

Regra 1: "D (Débito)"
  SE: tipo D/C = DÉBITO
  ENTÃO: Débito = 45, Crédito = 25

Regra 2: "C (Crédito)"
  SE: tipo D/C = CRÉDITO
  ENTÃO: Débito = 25, Crédito = 45
```

---

**Exemplo 4 — Regras por conteúdo (com prioridade):**
```
⚠️ Ordem importa! Regras mais específicas PRIMEIRO.

Regra 1: "Pagamento + CNPJ 78456123"
  SE: DESCRIÇÃO contém "PAGAMENTO" E EMPRESA contém "78456123000174"
  ENTÃO: Débito = 45, Crédito = 26

Regra 2: "Recebimento + CNPJ 78456123"
  SE: DESCRIÇÃO contém "RECEBIMENTO" E EMPRESA contém "78456123000174"
  ENTÃO: Débito = 25, Crédito = 46

Regra 3: "Pagamento (genérico)"
  SE: DESCRIÇÃO contém "PAGAMENTO"
  ENTÃO: Débito = 45, Crédito = 25

Regra 4: "Recebimento (genérico)"
  SE: DESCRIÇÃO contém "RECEBIMENTO"
  ENTÃO: Débito = 25, Crédito = 45
```

---

**Exemplo 5 — Combinação de colunas do Excel:**
```
Regra 1: "Conta 3106/2004"
  SE: Coluna G = "3106" E Coluna H = "2004"
  ENTÃO: Débito = 45, Crédito = 25

Regra 2: "Conta 3188/2035"
  SE: Coluna G = "3188" E Coluna H = "2035"
  ENTÃO: Débito = 46, Crédito = 25
```

---

**Operadores disponíveis nas condições:**

| Operador       | Símbolo | Exemplo                                   |
|----------------|---------|-------------------------------------------|
| Igual          | `=`     | Coluna G = "3106"                         |
| Diferente      | `≠`     | Status ≠ "CANCELADO"                      |
| Contém         | `*X*`   | DESCRIÇÃO contém "PAGAMENTO"              |
| Não contém     | `!*X*`  | DESCRIÇÃO não contém "ESTORNO"            |
| Começa com     | `X*`    | Código começa com "31"                    |
| Termina com    | `*X`    | Código termina com "05"                   |
| Maior que      | `>`     | Valor > 0                                 |
| Menor que      | `<`     | Valor < 0                                 |
| É Débito       | `D`     | Tipo D/C é Débito (atalho)                |
| É Crédito      | `C`     | Tipo D/C é Crédito (atalho)               |
| Positivo       | `+`     | Sinal do valor é positivo                 |
| Negativo       | `-`     | Sinal do valor é negativo                 |

---

### FASE 4 — Processamento

O backend processa cada linha do Excel seguindo este pipeline:

```
Para cada linha do Excel (a partir da linha_inicio_dados):
│
├─ ETAPA 1: Extrair dados segundo mapeamento de colunas
│   └─ Aplicar transformações (formato número, data, regex, concat, campo composto)
│
├─ ETAPA 2: Determinar tipo D/C
│   └─ Usando ConfigValor (sinal, coluna_tipo, embutido, colunas separadas)
│
├─ ETAPA 3: Definir contas débito/crédito
│   ├─ Se colunas conta_debito/conta_credito foram mapeadas → usar diretamente
│   ├─ Se há regras de conta → avaliar na ordem (primeira que bater, vence)
│   └─ Se nenhum → PENDÊNCIA MANUAL
│
├─ ETAPA 4: Validar data contra o período
│   └─ Se fora do período → ERRO
│
├─ ETAPA 5: Verificar mapeamento de contas contábeis
│   ├─ Buscar se a conta do cliente já tem mapeamento para conta padrão
│   └─ Se não tem → PENDÊNCIA de mapeamento
│
└─ ETAPA 6: Gerar lançamento padronizado
    └─ { data, valor, conta_debito, conta_credito, historico, doc_fiscal, doc_pgto, cnpj_cpf, razao_social }
```

---

### FASE 5 — Pendências (se houver)

Duas situações geram pendência:

| Tipo                          | Causa                                               | Resolução                                    |
|-------------------------------|-----------------------------------------------------|----------------------------------------------|
| **Conta não definida**        | Nenhuma regra bateu e não há colunas de conta        | Usuário define manualmente as contas          |
| **Mapeamento não encontrado** | Conta do cliente não tem equivalente no plano padrão | Usuário cria o mapeamento conta_cliente → conta_padrão |

Após resolver todas as pendências, o lote é reprocessado automaticamente.

---

## 4. Arquitetura (Clean Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│ DOMAIN (Núcleo — sem dependências externas)                     │
│                                                                 │
│ Entities:                                                       │
│   LayoutExcel ──┬── ColunaLayout[]     (mapeamento de colunas)  │
│                 ├── ConfigPlanilha      (aba, linhas)            │
│                 ├── ConfigValor         (como determinar D/C)    │
│                 ├── RegraContaLayout[]  (regras de contas)       │
│                 └── ConfigHistorico     (template de histórico)  │
│                                                                 │
│   RegraContaLayout ── CondicaoContaLayout[]  (condições AND)    │
│                                                                 │
│ Value Objects:                                                  │
│   TipoDado, TipoSinal, FormatoNumero, ModoValorDC, etc.       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│ APPLICATION (Casos de Uso)                                      │
│                                                                 │
│ CriarLayoutUseCase     ← cria layout com todas as configurações │
│ AtualizarLayoutUseCase ← atualiza configurações                 │
│ ClonarLayoutUseCase    ← duplica para outro CNPJ               │
│ ProcessarLoteUseCase   ← executa o pipeline completo            │
│                                                                 │
│ Ports (interfaces):                                             │
│   LayoutRepositoryPort  ← persistência                          │
│   ExcelParserPort       ← parsing genérico                      │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│ ADAPTERS (Implementações)                                       │
│                                                                 │
│ Inbound (REST):                                                 │
│   LayoutController  ← CRUD + preview                            │
│   LoteController    ← upload + processamento                    │
│                                                                 │
│ Outbound:                                                       │
│   DynamicExcelParser   ← lê Excel usando LayoutExcel            │
│   SQLAlchemyLayoutRepo ← persiste no SQLite                     │
│   TxtGenerator         ← gera arquivo de saída                  │
└─────────────────────────────────────────────────────────────────┘
```

**Modelo de dados no banco (LayoutExcelModel):**

| Campo                    | Tipo    | Descrição                                      |
|--------------------------|---------|-------------------------------------------------|
| id                       | UUID    | Identificador único                             |
| cnpj                     | String  | CNPJ da empresa                                |
| nome                     | String  | Nome do layout                                  |
| descricao                | String  | Descrição livre                                 |
| ativo                    | Boolean | Se está ativo                                   |
| config_planilha_json     | JSON    | {nome_aba, linha_cabecalho, linha_inicio_dados} |
| colunas_json             | JSON    | [{campo_destino, coluna_excel, tipo_dado, transformacao, ...}] |
| config_valor_json        | JSON    | {tipo_sinal, coluna_tipo, mapeamento_tipo, ...} |
| config_historico_json    | JSON    | {template, campos_fallback}                     |
| regras_conta_json        | JSON    | [{nome, ordem, condicoes[], conta_debito, conta_credito}] |

---

## 5. Estado Atual vs Necessário

| Funcionalidade                              | Existe? | Observação                                         |
|---------------------------------------------|---------|-----------------------------------------------------|
| Upload com protocolo                        | ✅ Sim  | Funcional                                           |
| Prévia do Excel                             | ✅ Sim  | Funcional com config de linhas                      |
| Mapeamento de colunas                       | ✅ Sim  | Completo com todos os campos destino                |
| Transformação: formato número               | ✅ Sim  | BR, US, moeda, automático                           |
| Transformação: regex                        | ✅ Sim  | Extrai primeiro grupo                               |
| Transformação: concatenar colunas           | ✅ Sim  | Lista de colunas + separador                        |
| Transformação: campo composto CNPJ+Nome     | ✅ Sim  | Parsing com separador configurável                  |
| Transformação: D/C embutido no valor        | ✅ Sim  | Sufixo e prefixo                                    |
| ConfigValor: sinal, coluna, separadas, fixo | ✅ Sim  | 5 modos suportados                                  |
| Regras de contas com condições AND          | ✅ Sim  | Operadores: igual, contem, positivo, negativo, etc. |
| Templates de regras no frontend             | ✅ Sim  | 4 templates pré-configurados                        |
| DynamicExcelParser no processamento         | ✅ Sim  | Fallback para parser hardcoded                      |
| Pendências de mapeamento manual             | ✅ Sim  | Fluxo completo de resolução                         |
| Validação de datas contra período           | ✅ Sim  | LancamentoForaDoPeriodoError                        |
| Perfil de saída integrado no processamento  | ❌ Não  | Campo existe mas não é usado na geração             |
| Wizard step-by-step no Upload               | ⚠️ Parcial | Funciona mas fluxo pode ser mais guiado          |
| Botão "Testar Layout" (preview de parsing)  | ❌ Não  | Seria útil para validar antes de processar          |

---

## 6. Melhorias Propostas

### 6.1 Wizard de Upload (refinamento de UX)

Tornar o fluxo de upload mais intuitivo com steps visuais claros:

```
[1. Arquivo & Dados]  →  [2. Prévia & Layout]  →  [3. Mapeamento]  →  [4. Regras]  →  [5. Confirmar]
```

Cada step com validação antes de avançar.

### 6.2 Preview de Parsing ("Testar Layout")

Endpoint que recebe arquivo + layout e retorna os lançamentos que seriam gerados, sem salvar nada:

```
POST /api/v1/import-layouts/test-parse
Body: { arquivo_base64, layout_id (ou layout_config inline) }
Response: { lancamentos: [...], erros: [...], pendencias: [...] }
```

Mostra na tela:

```
| # | Data       | Valor   | D   | C   | Histórico           | Status  |
|---|------------|---------|-----|-----|---------------------|---------|
| 1 | 01/02/2026 | 25,05   | 789 | 45  | PGTO BOLETO         | ✅ OK   |
| 2 | 02/02/2026 | 35,11   | 789 | 45  | PGTO BOLETO         | ✅ OK   |
| 3 | 15/03/2026 | 45,00   | 789 | 45  | PGTO BOLETO         | ⚠️ Fora do período |
| 4 | 04/02/2026 |         | —   | —   | PGTO BOLETO         | ❌ Sem valor |
```

### 6.3 Integrar Perfil de Saída no Processamento

O `ProcessarLoteUseCase` deve usar o `perfil_saida_id` selecionado para gerar o arquivo final no formato correto (Domínio Sistemas TXT, JSON, XML).

---

## 7. Resumo

O sistema **já suporta todos os 5 cenários de exemplo**. A base técnica está completa. As melhorias são de **experiência do usuário** (wizard, preview) e **integração** (perfil de saída).

**Para discutir:**
1. Prioridade: Wizard UX vs Preview de Parsing vs Integração de Saída?
2. O wizard deve ser na mesma página (steps colapsáveis) ou páginas separadas?
3. O preview de parsing deve ser acessível também da tela de edição de layout (sem upload)?
