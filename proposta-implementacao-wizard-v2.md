# Proposta de Implementacao - Wizard de Importacao v2

> Analise tecnica baseada no estado atual do projeto
> Data: 2026-03-11
> Status: Proposta (No-code)

---

## 1. Resumo Executivo

Evoluir o wizard de importacao de **4 etapas** para **6 etapas**, com regras de conta mais expressivas (condicoes `AND`/`OR`, campo `Conta Debito`/`Conta Credito` como criterio, multiplas acoes), resolucao de pendencias inline no wizard, e selecao de layout de saida integrado ao fluxo.

---

## 2. Fluxo Atual vs. Proposto

### Fluxo Atual (4 etapas)

```
(1) Upload       -> (2) Revisao      -> (3) Contas       -> (4) Preview
    Arquivo+dados    Layout detectado    Regras de conta     Validar resultado
                                        (somente AND)       + Processar
```

- Download acontece **fora do wizard**, na tela `LoteDetail`
- Pendencias sao resolvidas **fora do wizard**, em `/lotes/:id/pendencias`
- Perfil de saida e selecionado no Step 1 (Upload), misturado com dados do arquivo

### Fluxo Proposto (6 etapas)

```
(1) Upload       -> (2) Revisao      -> (3) Contas       -> (4) Pendente     -> (5) Preview      -> (6) Download
    Arquivo+dados    Layout detectado    Regras de conta     Mapeamentos         Validar resultado    Layout de saida
                                        (AND/OR + acoes)    de conta (Grid)
```

---

## 3. Detalhamento por Etapa

### Etapa 1 - Upload (Arquivo e Dados)

**Estado atual:** Funcional e adequado.

**Mudancas propostas:**
- Remover o campo `Perfil de Saida` deste step (mover para step 6)
- Manter: CNPJ, Periodo (mes/ano), Email de notificacao, Dropzone do arquivo

**Impacto tecnico:** Baixo
- `StepUpload.jsx`: Remover select de `perfil_saida_id`
- `ImportWizard.jsx`: Remover `perfil_saida_id` do `formData` inicial (adiar para step 6)

---

### Etapa 2 - Revisao (Layout Detectado)

**Estado atual:** Funcional e adequado.

**Mudancas propostas:** Nenhuma significativa. Manter a auto-deteccao e ajuste manual de colunas.

**Impacto tecnico:** Nenhum

---

### Etapa 3 - Contas (Regras de Conta) - **MUDANCA SIGNIFICATIVA**

**Estado atual:**
- Condicoes: somente `AND` (todas devem bater)
- Campos de condicao: `historico`, `documento`, `valor`, `razao_social_terceiro`
- Acao unica por regra: definir `conta_debito` e `conta_credito`

**Mudancas propostas:**

#### 3a. Novos campos de condicao

Acrescentar `Conta Debito` e `Conta Credito` como campos disponiveis nas condicoes.

```
Campos atuais:     historico, documento, valor, razao_social_terceiro
Campos propostos:  historico, documento, valor, razao_social_terceiro,
                   + conta_debito, conta_credito
```

**Impacto tecnico:** Baixo
- Frontend (`StepAccounts.jsx`): Adicionar 2 `<option>` no `<select>` de campo
- Backend (`layout_entities.py` > `CondicaoContaLayout`): O campo `campo` ja e string livre, aceita qualquer valor
- Backend (parser dinamico): Validar que `conta_debito` e `conta_credito` estejam populados antes de avaliar regras que usam esses campos como criterio
- **Atencao**: A ordem de avaliacao importa - regras que usam `conta_debito`/`conta_credito` como condicao so funcionam se esses campos ja tiverem sido preenchidos por uma regra anterior ou pelo layout

#### 3b. Logica `AND` / `OR` entre condicoes

**Estado atual:** Todas as condicoes de uma regra usam `AND` implicito.

**Proposta:** Permitir `AND` e `OR` entre condicoes da mesma regra.

```
Exemplo:
  conta_debito = "12345"           <-- condicao 1
  AND conta_credito = "12341"      <-- condicao 2 (AND com a anterior)
```

**Impacto tecnico:** Medio

**Modelo de dados proposto para condicoes:**

```python
# Opcao A - Operador logico na condicao (RECOMENDADA)
@dataclass
class CondicaoContaLayout:
    campo: str = ""
    operador: str = "igual"
    valor: str = ""
    coluna_excel: str = ""
    operador_logico: str = "e"  # NOVO: "e" (AND) ou "ou" (OR)
```

```python
# Opcao B - Grupos de condicoes (mais complexa, mais flexivel)
@dataclass
class RegraContaLayout:
    # ... campos existentes ...
    grupos_condicoes: List[List[CondicaoContaLayout]]  # OR entre grupos, AND dentro
```

**Recomendacao:** Opcao A pela simplicidade. O `operador_logico` define a relacao com a condicao **anterior**. A primeira condicao ignora este campo.

**Algoritmo de avaliacao:**

```
Para cada regra:
  1. Agrupar condicoes em blocos AND separados por OR
     Ex: [C1 AND C2 OR C3 AND C4] -> [[C1,C2], [C3,C4]]
  2. Avaliar cada grupo AND (todas devem ser verdadeiras)
  3. Se qualquer grupo AND for verdadeiro -> regra ativa (OR)
```

**Mudancas necessarias:**
- Frontend: Adicionar toggle/select `E`/`OU` entre condicoes no UI
- Backend (`CondicaoContaLayout`): Adicionar campo `operador_logico`
- Backend (`DynamicExcelParser._aplicar_regras_conta`): Reescrever logica de avaliacao para suportar agrupamento AND/OR

#### 3c. Multiplas acoes por regra

**Estado atual:** Cada regra define fixamente `conta_debito` e `conta_credito`.

**Proposta:** Permitir multiplas acoes, incluindo definir `historico`.

```
Acoes possiveis:
  - Conta Debito  = "25"
  - Conta Credito = "45"
  - Historico     = "Conteudo do historico"
```

**Impacto tecnico:** Medio

**Modelo de dados proposto:**

```python
@dataclass
class AcaoRegra:
    campo_destino: str = ""     # "conta_debito", "conta_credito", "historico"
    valor: str = ""             # Valor a definir

@dataclass
class RegraContaLayout:
    # ... campos existentes ...
    acoes: List[AcaoRegra] = field(default_factory=list)  # NOVO
    # Manter conta_debito/conta_credito para retrocompatibilidade
```

**Retrocompatibilidade:** Regras existentes que usam `conta_debito`/`conta_credito` diretamente continuam funcionando. O sistema converte internamente para `acoes` ao carregar.

**Mudancas necessarias:**
- Frontend: UI para adicionar/remover acoes com select de campo + input de valor
- Backend: Nova entidade `AcaoRegra`, atualizacao de `RegraContaLayout`
- Backend (parser): Aplicar acoes em sequencia sobre o lancamento

---

### Etapa 4 - Pendente (Mapeamentos de Conta) - **ETAPA NOVA**

**Estado atual:** Pendencias sao detectadas **apos** o processamento do lote e resolvidas em tela separada (`/lotes/:id/pendencias`).

**Proposta:** Mover a resolucao de pendencias para **dentro do wizard**, entre Regras e Preview. Isso permite resolver tudo antes de processar.

**Funcionamento:**

1. Apos definir regras (step 3), o sistema executa um **test-parse parcial** para identificar contas nao mapeadas
2. Exibe grid de contas pendentes para mapeamento manual
3. Para layouts com `colunas_separadas` (coluna debito / coluna credito separadas), o grid mostra o tipo (debito/credito) no label

**UI - Grid de Mapeamento:**

```
+---------------------------+---------------------------+---------------------------+
| Conta Debito: 12345       | Conta Credito: 67890      | Conta Debito: 11111       |
| [input mapeamento]        | [input mapeamento]        | [input mapeamento]        |
+---------------------------+---------------------------+---------------------------+
| Conta Credito: 22222      | Conta Debito: 33333       | ...                       |
| [input mapeamento]        | [input mapeamento]        |                           |
+---------------------------+---------------------------+---------------------------+
```

- Cada celula mostra: label com conta original + tipo (debito/credito) + input para conta mapeada
- Layout em grid 4 colunas (responsivo: 2 em mobile, 3 em tablet)
- Contas ja mapeadas (do banco `MapeamentoConta`) vem pre-preenchidas
- Contas resolvidas pelas regras do step 3 sao omitidas do grid

**Impacto tecnico:** Alto

**Mudancas necessarias:**
- Frontend: Novo componente `StepPending.jsx`
- Frontend: Chamada API para test-parse parcial que retorna lista de contas nao mapeadas
- Backend: Novo endpoint ou extensao do `test-parse` para retornar `contas_pendentes` separadamente
- Backend: Consultar `MapeamentoContaRepository` para pre-preencher mapeamentos existentes

**Logica de skip:** Se nao houver pendencias (todas as contas ja estao mapeadas ou cobertas por regras), esta etapa e automaticamente pulada.

---

### Etapa 5 - Preview (Validar Resultado)

**Estado atual:** Funcional como step 4.

**Mudancas propostas:**
- Incorporar os mapeamentos definidos no step 4 ao test-parse final
- Garantir que o preview reflita todos os mapeamentos + regras aplicados

**Impacto tecnico:** Baixo
- Ajustar chamada `test-parse` para incluir mapeamentos manuais do step 4

---

### Etapa 6 - Download (Selecionar Layout de Saida) - **ETAPA NOVA**

**Estado atual:**
- Perfil de saida e selecionado no Step 1 (antes de ver os dados)
- Download acontece na tela `LoteDetail` apos processamento

**Proposta:**
- Mover selecao de layout de saida para o final do wizard
- Renomear "Perfis de Saida" para "Layout de Saida" em todo o sistema
- Disponivel somente quando nao houver pendencias (step 4 limpo)
- Opcao de criar novo layout de saida inline

**Funcionamento:**

1. Listar layouts de saida disponiveis (ativos)
2. Permitir selecionar um existente
3. Botao "Criar novo" abre formulario inline (simplificado)
4. O layout de saida **deve usar as contas da contabilidade** (contas mapeadas, nao as originais do cliente)
5. Botao "Processar e Baixar" finaliza o fluxo

**Impacto tecnico:** Medio

**Mudancas necessarias:**
- Frontend: Novo componente `StepDownload.jsx`
- Frontend: Renomear "Perfis de Saida" -> "Layout de Saida" no menu sidebar, paginas, componentes
- Frontend: Formulario simplificado para criacao rapida de layout de saida
- Backend: Nenhuma mudanca na API (ja suporta criacao/selecao de perfis)
- **Validacao:** Bloquear step 6 se existirem pendencias nao resolvidas no step 4

---

## 4. Layout de Importacao (Reutilizacao)

**Estado atual:** O sistema ja salva `LayoutExcel` com colunas, regras e config. Os layouts podem ser listados, clonados e reutilizados em `/layouts`.

**Proposta:** Fortalecer o conceito de "Layout de Importacao" para que ele encapsule:

| Componente | Ja existe | Proposta |
|:---|:---:|:---|
| Mapeamento de colunas | Sim | Manter |
| Config de planilha (aba, header, inicio dados) | Sim | Manter |
| Config de valor (sinal, D/C) | Sim | Manter |
| Regras de conta | Sim | Evoluir com AND/OR e acoes |
| Mapeamentos de conta | **Nao** | **Vincular ao layout** |
| Historico padrao | Sim | Manter |

**Mudanca principal:** Vincular `MapeamentoConta` ao `LayoutExcel` (alem do CNPJ), para que ao reutilizar um layout, os mapeamentos de conta ja venham pre-carregados.

**Impacto tecnico:** Medio
- Backend: Adicionar campo opcional `layout_id` em `MapeamentoConta` / `MapeamentoContaModel`
- Backend: Ao criar lote com layout existente, carregar mapeamentos vinculados
- Frontend: Na selecao de layout (step 2), indicar quantos mapeamentos ja existem

---

## 5. Layout de Saida (Renomeacao)

**Mudanca:** Renomear "Perfis de Saida" para "Layout de Saida" em todo o sistema.

**Arquivos impactados:**

| Camada | Arquivo | Mudanca |
|:---|:---|:---|
| Frontend | `Sidebar.jsx` | Menu item label |
| Frontend | `PerfisSaidaList.jsx` | Titulo da pagina, textos |
| Frontend | `PerfilSaidaForm.jsx` | Labels do formulario |
| Frontend | Rotas em `App.js` | Path `/perfis-saida` -> `/layouts-saida` |
| Frontend | `StepUpload.jsx` | Remover select (mover para step 6) |
| Backend | `output_profile_controller.py` | Comentarios/logs (endpoints mantem por retrocompatibilidade) |

**Regra de negocio adicional:** O layout de saida deve usar as contas mapeadas (conta padrao da contabilidade), nao as contas originais do cliente. Isso ja acontece implicitamente pois `Lancamento.conta_debito_mapeada` / `conta_credito_mapeada` sao usados na geracao de saida.

---

## 6. Analise de Viabilidade

### O que ja existe e facilita

1. **Arquitetura Clean Architecture** - Separacao clara entre domain, application e adapters facilita extensoes
2. **Regras de conta** - Estrutura `RegraContaLayout` + `CondicaoContaLayout` ja existe, so precisa evoluir
3. **Mapeamentos de conta** - CRUD completo ja existe, precisa integrar ao wizard
4. **Test-parse** - Endpoint ja simula o parsing sem persistir, base para os steps 4 e 5
5. **Perfis de saida** - CRUD completo, so renomear e mover no fluxo
6. **WizardStepper** - Componente generico que aceita N steps, facil de estender

### Desafios identificados

| # | Desafio | Complexidade | Mitigacao |
|:---:|:---|:---:|:---|
| 1 | Logica AND/OR nas condicoes | Media | Usar abordagem de agrupamento simples (Opcao A) |
| 2 | Ordem de avaliacao de regras (regra usa conta que outra regra define) | Alta | Documentar que regras sao avaliadas em ordem; regras que dependem de `conta_debito`/`conta_credito` preenchidos devem vir depois |
| 3 | Step 4 (Pendentes) dentro do wizard exige test-parse intermediario | Media | Reutilizar endpoint `test-parse` existente, adicionar retorno de `contas_pendentes` |
| 4 | Retrocompatibilidade de `RegraContaLayout` (acoes vs conta_debito/conta_credito) | Media | Manter campos antigos, converter internamente |
| 5 | Vincular mapeamentos ao layout | Media | Campo opcional `layout_id`, migracao simples |
| 6 | UX do grid de pendencias em telas pequenas | Baixa | Grid responsivo com Tailwind (grid-cols-1/2/3/4) |

---

## 7. Plano de Implementacao Sugerido

### Fase 1 - Fundacao (Backend)

1. Adicionar `operador_logico` em `CondicaoContaLayout`
2. Criar entidade `AcaoRegra`
3. Atualizar `RegraContaLayout` com `acoes` e retrocompatibilidade
4. Atualizar logica de avaliacao no parser dinamico (AND/OR)
5. Atualizar logica de aplicacao de acoes
6. Adicionar `layout_id` opcional em `MapeamentoConta`
7. Estender `test-parse` para retornar `contas_pendentes`

### Fase 2 - Wizard Frontend

1. Estender `WizardStepper` de 4 para 6 steps
2. Atualizar `StepUpload` (remover perfil de saida)
3. Evoluir `StepAccounts` (campos conta_debito/credito, AND/OR, acoes multiplas)
4. Criar `StepPending` (grid de mapeamentos)
5. Ajustar `StepPreview` (incorporar mapeamentos do step 4)
6. Criar `StepDownload` (selecao/criacao de layout de saida)
7. Atualizar `ImportWizard` (novo fluxo de estados, skip condicional do step 4)

### Fase 3 - Renomeacao e Polimento

1. Renomear "Perfis de Saida" -> "Layout de Saida" (frontend)
2. Atualizar sidebar, rotas, titulos
3. Testes de integracao do fluxo completo

---

## 8. Modelo de Dados - Visao Consolidada

```
LayoutExcel (Layout de Importacao)
  |-- ConfigPlanilha
  |-- ColunaLayout[]
  |-- ConfigValor
  |-- ConfigHistoricoPadrao
  |-- RegraContaLayout[]                    <-- EVOLUIDA
  |     |-- CondicaoContaLayout[]           <-- + operador_logico (e/ou)
  |     |     |-- campo: conta_debito       <-- NOVO campo disponivel
  |     |     |-- campo: conta_credito      <-- NOVO campo disponivel
  |     |-- AcaoRegra[]                     <-- NOVO (multiplas acoes)
  |     |     |-- campo_destino: conta_debito | conta_credito | historico
  |     |     |-- valor: string
  |     |-- conta_debito (retrocompat)
  |     |-- conta_credito (retrocompat)
  |-- MapeamentoConta[] (via layout_id)     <-- NOVO vinculo

PerfilSaida -> LayoutSaida (renomeacao)
  |-- ConfigPerfilSaida
  |-- Usa contas mapeadas (conta_padrao)
```

---

## 9. Fluxo Detalhado - Simulacao Mental

### Cenario: Importacao de extrato bancario com regras

```
1. UPLOAD
   Usuario seleciona arquivo Excel do banco, informa CNPJ e periodo.

2. REVISAO
   Sistema detecta colunas: Data(A), Historico(B), Valor(C), Conta(D), Tipo(E:D/C)
   Usuario confirma mapeamento.

3. CONTAS - Regras
   REGRA 01:
     SE Conta Debito = "12345" E Conta Credito = "12341"
     ENTAO:
       Conta Debito = "25"
       Conta Credito = "45"
       Historico = "Transferencia entre contas"

   REGRA 02:
     SE Conta Debito = "99999"
     ENTAO:
       Conta Debito = "100"

   REGRA 03:
     SE Historico contem "PAGAMENTO" OU Historico contem "PIX"
     ENTAO:
       Conta Credito = "50"

4. PENDENTE - Grid de Mapeamentos
   Sistema executa test-parse e identifica contas nao cobertas por regras:

   +---------------------+---------------------+---------------------+---------------------+
   | Debito: 44321       | Credito: 55678      | Debito: 77890       | Credito: 88123      |
   | [_______________]   | [_______________]   | [_______________]   | [_______________]   |
   +---------------------+---------------------+---------------------+---------------------+
   | Debito: 11234       | Credito: 22567      |                     |                     |
   | [_______________]   | [_______________]   |                     |                     |
   +---------------------+---------------------+---------------------+---------------------+

   Usuario preenche os mapeamentos (ou pula para resolver depois).

5. PREVIEW
   Tabela com todos os lancamentos processados, aplicando:
   - Regras do step 3
   - Mapeamentos do step 4
   - Mapeamentos pre-existentes do banco
   Taxa de sucesso: 95% (3 contas sem mapeamento)

6. DOWNLOAD
   Se sem pendencias:
     - Selecionar "Layout de Saida: Sistema Dominio (TXT)"
     - Botao "Processar e Baixar"
   Se com pendencias:
     - Etapa bloqueada, aviso para voltar ao step 4
```

---

## 10. Consideracoes Finais

### Pontos fortes da proposta
- Fluxo mais linear e completo (tudo dentro do wizard)
- Regras mais expressivas (AND/OR + acoes) cobrem cenarios reais mais complexos
- Grid de pendencias resolve o problema de fluxo quebrado (sair do wizard para mapear contas)
- Reutilizacao via Layout de Importacao reduz trabalho repetitivo

### Riscos a monitorar
- **Complexidade do step 3**: UI de AND/OR + multiplas acoes pode ficar confusa. Manter interface limpa com progressive disclosure
- **Performance do test-parse intermediario** (step 4): Executar parsing completo duas vezes (step 4 e step 5) pode ser lento para arquivos grandes. Considerar cache do resultado
- **Retrocompatibilidade**: Regras e layouts existentes devem continuar funcionando sem migracao manual

### Estimativa de complexidade por componente

| Componente | Complexidade |
|:---|:---:|
| AND/OR nas condicoes (backend) | Media |
| AND/OR nas condicoes (frontend) | Media |
| Multiplas acoes por regra (backend) | Media |
| Multiplas acoes por regra (frontend) | Media |
| Step 4 - Pendentes (novo) | Alta |
| Step 6 - Download (novo) | Baixa |
| Vinculo mapeamentos ao layout | Media |
| Renomeacao Perfis -> Layout Saida | Baixa |
| **Total estimado** | **Media-Alta** |
