# Prompt Estruturado — Refatoração Arquitetural + Implementação do Layout de Importação v2

> **Regra absoluta**: Este prompt é "No-Code". Nenhum trecho, snippet ou exemplo de código deve ser incluído nas entregas. Todas as orientações são descritivas e estratégicas.

---

## 1. Contexto do Projeto

Você está trabalhando em um **sistema contábil** (ECS Extrato-to-TXT) cujo objetivo é processar importações em lote de arquivos Excel, aplicar regras de negócios contábeis (mapeamento de contas, transformações D/C, campos compostos), resolver pendências e gerar arquivos TXT de saída para integração com softwares contábeis (ex.: Domínio Sistemas).

**Stack tecnológica:**
- **Backend:** Python 3.11, FastAPI, SQLAlchemy async, SQLite, Uvicorn
- **Frontend:** React 18, TailwindCSS, Shadcn/UI (customizado), Axios, React Router v6, Sonner (toasts)
- **Design System:** SWISS_HIGH_CONTRAST — fontes Manrope (headings), IBM Plex Sans (body), JetBrains Mono (dados tabulares). Paleta monocromática com cores funcionais. Referência completa em `design_guidelines.json` na raiz do projeto.

**Arquiteturas-alvo:**
- Backend: **Clean Architecture** (Domain → Application/Ports → Adapters Inbound/Outbound → Config)
- Frontend: **Feature-Sliced Design (FSD)** (layers: app → pages → features → entities → shared)

**Estrutura atual do backend:**
- `backend/src/domain/` — entities, value_objects (CNPJ, PeriodoContabil, Email, ContaContabil), exceptions
- `backend/src/application/` — usecases, ports (repositories, services)
- `backend/src/adapters/inbound/rest/controllers/` — lote, layout, regra, account_mapping, output_profile
- `backend/src/adapters/outbound/` — repositories SQLAlchemy, excel_parser, dynamic_parser, txt_generator, email_sender, output_generators
- `backend/src/config/` — database, models

**Estrutura atual do frontend:**
- `frontend/src/components/` — dashboard, upload, lotes, layouts, mapeamentos, pendencias, perfis-saida, layout (shell), ui (Button, Card, Input, Badge, Loading)
- `frontend/src/services/api.js` — cliente API monolítico (228 linhas)
- `frontend/src/App.js` — rotas sem lazy loading, sem rota 404
- `frontend/src/lib/` — diretório potencialmente inexistente, porém 13+ componentes importam funções dele (`cn`, `formatDate`, `formatCurrency`, `formatCNPJ`, `getStatusConfig`)

**Documento de referência da feature principal:** `Ideia_Layout_de_Importacaov2.md` na raiz do projeto — contém os 7 cenários reais, fluxo proposto em 6 fases (Upload → Detecção Automática → Confirmação → Contas/Regras → Preview → Processamento), novas entidades, novos use cases e novos endpoints.

---

## 2. Objetivo Estratégico

Executar uma evolução do sistema em duas frentes simultâneas:

**Frente 1 — Correção e Conformidade Arquitetural:** Eliminar inconformidades, redundâncias, código morto e gargalos de performance identificados no backend e frontend, alinhando o código às arquiteturas-alvo (Clean Architecture e FSD).

**Frente 2 — Implementação do Layout de Importação v2:** Implementar as capacidades descritas no documento `Ideia_Layout_de_Importacaov2.md`, incluindo auto-detecção de layout, preview obrigatório antes do processamento, templates contextuais de regras de conta, e preparação arquitetural para suporte futuro a OFX.

**Princípio fundamental:** Cada fase entrega um checkpoint funcional — o sistema deve compilar e executar sem erros ao final de cada fase. Zero regressão nas funcionalidades existentes.

---

## 3. Diagnóstico — Inconformidades, Redundâncias e Gargalos

### 3.1 Backend

| ID | Severidade | Localização | Descrição |
|----|-----------|-------------|-----------|
| B-01 | CRÍTICA | `layout_controller.py` linhas 82-84 | **N+1 Query:** loop iterando layouts e executando consulta individual ao banco para contar regras de cada layout. Resolver com consulta agregada única no repositório. |
| B-02 | CRÍTICA | `lote_controller.py` linhas 150-172 | **Controller cria infraestrutura:** função `_processar_lote_background` instancia manualmente repositórios, parsers, geradores e email sender. Viola inversão de dependência. |
| B-03 | CRÍTICA | `lote_controller.py` linhas 36-41 e `account_mapping_controller.py` linhas 33-38 | **Função `_formatar_cnpj` duplicada** em dois controllers. O Value Object `CNPJ` no domínio já possui propriedade `formatado` que faz exatamente isso. |
| B-04 | ALTA | `usecases.py` linha 154 e `dynamic_parser.py` linha 237 | **Codificação Base64 de arquivos grandes** armazenados em campos JSON. Overhead de ~33% em memória e armazenamento. Migrar para armazenamento em disco com referência por caminho. |
| B-05 | ALTA | Todos os controllers | **Injeção de dependência fraca:** cada endpoint instancia manualmente repositórios e use cases. Criar módulo de providers/factories com `Depends()` do FastAPI. |
| B-06 | ALTA | Models/Database | **Índices ausentes** nas colunas frequentemente consultadas: `protocolo`, `cnpj`, `layout_id` (tabelas lotes e regras). |
| B-07 | ALTA | `excel_parser.py` linha 70, `dynamic_parser.py` linha 263 | **Uso de `print()` em vez de logging estruturado.** Sem rastreabilidade, sem níveis de severidade, sem correlação com lotes. |
| B-08 | MÉDIA | `usecases.py` linhas 175-176 | **Exceção engolida silenciosamente** com `except Exception: pass`. Erros críticos de processamento descartados sem registro. |
| B-09 | MÉDIA | `txt_generator.py` linhas 11-15 | **Constantes hardcoded** (CODIGO_REGISTRO, NOME_USUARIO etc.) sem externalização para configuração ou domínio. Devem ser configuráveis por perfil de saída. |
| B-10 | MÉDIA | Múltiplos adapters | **Catches genéricos de Exception** sem tratamento diferenciado por tipo de erro. |
| B-11 | MÉDIA | Background processing | **Sem gerenciamento de transações** — falhas parciais podem deixar dados inconsistentes. |
| B-12 | MÉDIA | Parsers e generators | **Números mágicos** espalhados sem constantes nomeadas ou enum. |

### 3.2 Frontend

| ID | Severidade | Localização | Descrição |
|----|-----------|-------------|-----------|
| F-01 | CRÍTICA | `frontend/src/lib/utils` | **Arquivo potencialmente ausente:** 13+ componentes importam funções (`cn`, `formatDate`, `formatCurrency`, `formatCNPJ`, `getStatusConfig`) de `../../lib/utils`. Garantir existência e completude do módulo. |
| F-02 | CRÍTICA | Estrutura geral | **Zero conformidade FSD:** todos os componentes residem em `components/` sem separação por layers (shared, entities, features, pages). |
| F-03 | ALTA | `LotesList.jsx` linhas 77-88 e `LoteDetail.jsx` linhas 68-80 | **Lógica de download duplicada** — mesma implementação de download de arquivo blob em dois componentes. |
| F-04 | ALTA | 8+ componentes | **Padrão de alerta erro/sucesso duplicado** — toast/alerta repetido manualmente em cada componente. |
| F-05 | ALTA | 10+ componentes | **Padrão fetch+loading+error repetido** — cada componente reimplementa estado de carregamento. Extrair para custom hook. |
| F-06 | ALTA | `api.js` (228 linhas) | **Cliente API monolítico** sem interceptors, sem retry, sem padronização de erros. |
| F-07 | ALTA | Nenhum hook customizado existe | **Ausência total de custom hooks** — toda lógica de estado e efeitos colaterais vive dentro dos componentes. |
| F-08 | MÉDIA | `Dashboard.jsx` | **Falta de memoização:** componente `StatCard` definido inline, constantes recriadas a cada render. |
| F-09 | MÉDIA | `App.js` rotas `/` e `/home` | **Rota duplicada** — ambas renderizam Dashboard. Uma deve redirecionar para a outra. |
| F-10 | MÉDIA | `App.js` | **Sem lazy loading** — todos os componentes importados de forma síncrona. |
| F-11 | MÉDIA | `App.js` | **Sem rota 404** — URLs inválidas não têm tratamento. |
| F-12 | MÉDIA | Múltiplos componentes | **Prop drilling** sem Context ou store para estado compartilhado. |
| F-13 | MÉDIA | Múltiplos componentes | **Ausência de `useCallback`/`useMemo`** em handlers de eventos, causando re-renders desnecessários. |
| F-14 | MÉDIA | Mapeamentos e PerfisSaida | **Padrões de modal/formulário inline duplicados** — mesma estrutura de diálogo repetida. |

---

## 4. Avaliação de Impacto e Priorização

### Critérios de Priorização

1. **Bloqueante funcional** (sistema quebra em runtime) → resolver primeiro
2. **Degradação de performance** (N+1, Base64, índices) → resolver na sequência
3. **Dívida arquitetural** (violação de camadas, DI ausente) → resolver como fundação
4. **Habilitador de feature** (estrutura necessária para v2) → resolver junto com fundação
5. **Qualidade de código** (duplicações, magic numbers, logging) → resolver junto com refatorações adjacentes

### Matriz de Risco vs. Esforço

| Prioridade | IDs | Justificativa |
|-----------|-----|---------------|
| P0 — Imediata | F-01 | Potencialmente bloqueante: imports quebrados em 13+ arquivos |
| P1 — Fundação | B-05, F-02 | Estabelecer DI no backend e estrutura FSD no frontend como base para todas as demais correções e para a feature v2 |
| P2 — Performance | B-01, B-04, B-06 | N+1, Base64 e índices impactam diretamente a experiência do usuário em produção |
| P3 — Correções Críticas | B-02, B-03, F-03 a F-07 | Violações arquiteturais e duplicações que aumentam custo de manutenção |
| P4 — Qualidade | B-07 a B-12, F-08 a F-14 | Melhorias de robustez, observabilidade e performance de renderização |

---

## 5. Roadmap de Implementação

---

### FASE 1 — Estabilização e Fundação Arquitetural (Checkpoint 1)

**Objetivo:** Garantir que o sistema compila e executa sem erros. Estabelecer as bases arquiteturais que habilitam todas as fases seguintes, incluindo a feature v2.

**Backend:**
- Criar módulo centralizado de injeção de dependências usando `Depends()` do FastAPI. Definir providers para cada repositório, use case e serviço. Todos os controllers devem receber dependências via parâmetros injetados, nunca instanciando manualmente. **(Resolve B-05)**
- Remover as funções `_formatar_cnpj` duplicadas dos controllers. Substituir pelo uso do Value Object `CNPJ` existente no domínio (propriedade `formatado`). **(Resolve B-03)**
- Adicionar logging estruturado (módulo `logging` do Python com formatação JSON). Substituir todos os `print()` por chamadas ao logger com níveis apropriados. Incluir correlação por `lote_id` onde aplicável. **(Resolve B-07)**
- Adicionar índices no banco de dados para as colunas: `protocolo` e `cnpj` (tabela lotes), `layout_id` (tabelas lotes e regras). **(Resolve B-06)**

**Frontend:**
- Garantir existência e completude do arquivo `frontend/src/lib/utils.js` com todas as funções importadas pelos 13+ componentes: `cn` (merge de classes CSS), `formatDate`, `formatCurrency`, `formatCNPJ`, `getStatusConfig`. Validar que todas as importações existentes resolvem corretamente. **(Resolve F-01)**
- Definir a estrutura de diretórios FSD criando os diretórios: `src/app/`, `src/pages/`, `src/features/`, `src/entities/`, `src/shared/` (com subdiretórios `ui/`, `lib/`, `api/`, `hooks/`, `config/`). **(Inicia F-02)**
- Corrigir a rota duplicada em `App.js`: manter apenas `/` como rota principal do Dashboard e fazer `/home` redirecionar. **(Resolve F-09)**

**Critério de aceite:** Sistema inicia sem erros. Todos os endpoints respondem. Frontend renderiza sem erros de import no console. DI funcional em todos os controllers.

---

### FASE 2 — Migração Estrutural + Correções de Performance (Checkpoint 2)

**Objetivo:** Migrar componentes para a estrutura-alvo, corrigir gargalos de performance e preparar a base de hooks/API para a feature v2.

**Backend:**
- Refatorar `_processar_lote_background` para receber dependências via factory dedicada no módulo de DI. A função background deve chamar um factory method que encapsula a criação de sessão e injeção de repositórios/serviços. **(Resolve B-02)**
- Resolver o N+1 em `layout_controller.py`: criar método no repositório de layouts que retorne layouts já com contagem de regras em uma única consulta agregada. **(Resolve B-01)**
- Substituir armazenamento Base64 de arquivos por armazenamento em disco. Definir diretório configurável. Armazenar apenas o caminho relativo no banco. Criar serviço de file storage como Port na camada Application com Adapter na camada Outbound. **(Resolve B-04)**

**Frontend:**
- Migrar componentes UI (Button, Card, Input, Badge, Loading) para `src/shared/ui/`. Mover `lib/utils.js` para `src/shared/lib/utils.js`. Atualizar todos os imports. **(Avança F-02)**
- Segmentar `api.js` em módulos por domínio dentro de `src/shared/api/`: `lotes.js`, `layouts.js`, `mapeamentos.js`, `perfis-saida.js`. Criar instância base Axios com interceptors de erro (captura padronizada, toast automático para 500, retry para falhas de rede). **(Resolve F-06)**
- Criar custom hooks em `src/shared/hooks/`: `useAsync` (gerencia loading/error/data), `useDownload` (lógica de download extraída de LotesList e LoteDetail), `useNotification` (wrapper padronizado sobre sonner toast). **(Resolve F-03, F-04, F-05, F-07)**

**Critério de aceite:** Todas as funcionalidades existentes funcionam identicamente. Nenhuma regressão visual ou funcional. Estrutura de pastas parcialmente FSD. Performance de listagem de layouts mensurável melhor (sem N+1).

---

### FASE 3 — FSD Completo no Frontend + Robustez Backend (Checkpoint 3)

**Objetivo:** Completar a migração FSD, resolver todos os problemas de qualidade no backend, e preparar o terreno para as novas telas da feature v2.

**Backend:**
- Eliminar `except Exception: pass`. Toda exceção deve ser logada com nível error e, quando aplicável, atualizar o status do lote para `erro` com mensagem descritiva. **(Resolve B-08)**
- Externalizar constantes hardcoded de `txt_generator.py` para configuração por perfil de saída. **(Resolve B-09)**
- Implementar gerenciamento de transações no processamento background: operações atômicas com rollback completo em caso de falha. **(Resolve B-11)**
- Substituir catches genéricos por tratamento específico: `DomainError`, `RepositoryError`, `IntegrationError`, com respostas HTTP apropriadas. **(Resolve B-10)**
- Substituir números mágicos nos parsers e generators por constantes nomeadas ou enums no domínio. **(Resolve B-12)**

**Frontend:**
- Criar `src/pages/` com componentes de página para cada rota: `DashboardPage`, `UploadPage`, `LotesPage`, `LoteDetailPage`, `PendenciasPage`, `MapeamentosPage`, `LayoutsPage`, `LayoutFormPage`, `LayoutDetailPage`, `PerfisSaidaPage`, `NotFoundPage`. **(Avança F-02, Resolve F-11)**
- Criar `src/features/` agrupando lógica por domínio: `lotes/`, `layouts/`, `mapeamentos/`, `pendencias/`, `upload/`, `perfis-saida/`, `dashboard/`. Cada feature contém seus próprios componentes, hooks e modelo de dados local. **(Completa F-02)**
- Criar `src/entities/` para modelos de dados compartilhados: `lote/`, `layout/`, `mapeamento/`.
- Refatorar `App.js`: usar `React.lazy` + `Suspense` para lazy loading. Rota catch-all `*` para `NotFoundPage`. Mover configuração do Router e Toaster para `src/app/`. **(Resolve F-10, F-11)**
- Extrair componente reutilizável de modal/formulário para `src/shared/ui/`. Refatorar componentes que duplicam esse padrão. **(Resolve F-14)**
- Aplicar `useCallback`, `useMemo` e `React.memo` onde necessário. Extrair `StatCard` do Dashboard. **(Resolve F-08, F-12, F-13)**

**Critério de aceite:** Estrutura 100% FSD. Zero `print()` no backend. Zero `except Exception: pass`. Transações atômicas. Lazy loading funcional. Rota 404 funcional.

---

### FASE 4 — Feature v2: Auto-Detecção de Layout + Preview (Checkpoint 4)

**Objetivo:** Implementar as duas capacidades de maior impacto do documento `Ideia_Layout_de_Importacaov2.md`: a auto-detecção inteligente de layout (Fase 2 do fluxo v2) e o preview obrigatório antes do processamento (Fase 5 do fluxo v2).

**Backend — Novas entidades no domínio:**
- Criar entidade `DeteccaoLayout` contendo: `config_planilha_sugerida`, `colunas_sugeridas` (lista com campo_destino, coluna_excel, tipo_dado, formato, transformação e nível de confiança como float 0-1), `config_valor_sugerida` e `templates_regras_sugeridos`.
- Criar enum `TipoArquivoImportacao` com valores: EXCEL_XLS, EXCEL_XLSX (e placeholder OFX para futuro).

**Backend — Novos use cases:**
- Criar `DetectarLayoutUseCase` na camada Application. Recebe arquivo em bytes, analisa estrutura da planilha e retorna `DeteccaoLayout` com sugestão completa. Deve implementar:
  - Detecção de estrutura: score de cabeçalho por linha (% texto puro vs. numérico), identificação automática de linha_cabecalho e linha_inicio_dados, pulo de linhas vazias/separadoras.
  - Detecção de tipos de coluna: analisar amostra das primeiras N linhas de dados, testar padrões (data DD/MM/AAAA, decimal BR/US, campo composto CNPJ+Nome com 14 dígitos + separador + texto, D/C embutido como sufixo/prefixo).
  - Sugestão de mapeamento: combinar nome do cabeçalho (heurísticas: DATA→data, VALOR→valor, HIST/DESC→historico, DOC→documento, CNPJ→cnpj_cpf_terceiro, EMPRESA/FORNECEDOR→razao_social, D/C→tipo_dc) + tipo detectado para sugerir campo destino, com indicador de confiança.
  - Sugestão de ConfigValor: detectar automaticamente se usa sinal (+/-), coluna tipo D/C, sufixo/prefixo D/C, colunas separadas débito/crédito, ou valores mutuamente exclusivos.
- Criar `PreviewParseUseCase` na camada Application. Recebe arquivo + layout (por ID ou configuração inline) + período. Retorna lista de lançamentos simulados + resumo (total, OK, fora_período, sem_conta, erros) + lista de erros detalhados por linha/campo. Não grava nada no banco — apenas simula o pipeline existente.

**Backend — Novos endpoints:**
- `POST /api/v1/import-layouts/detect` — recebe arquivo_base64 e nome_aba opcional, retorna DeteccaoLayoutResponse com config_planilha sugerida, colunas mapeadas com confiança e valores de amostra, config_valor inferida, e templates de regras sugeridos baseados nos dados reais.
- `POST /api/v1/import-layouts/test-parse` — recebe arquivo_base64 + layout_id ou layout_config inline + periodo_mes/ano, retorna preview completo com lançamentos, resumo estatístico e lista de erros.

**Backend — Templates contextuais de regras:**
- O `DetectarLayoutUseCase` deve analisar os dados reais do arquivo e gerar templates de regras relevantes. Exemplos: se detectar valores positivos e negativos → template "Por sinal do valor". Se encontrar valores únicos em coluna texto → template "Por descrição" listando os valores encontrados. Se existir coluna com CNPJs distintos → template "Por empresa/fornecedor".

**Frontend — Tela de Detecção e Confirmação (Fase 2+3 do fluxo v2):**
- Criar feature `src/features/import-wizard/` com fluxo em steps visuais.
- **Step 1 (Upload):** Formulário existente de upload (CNPJ + período + arquivo). Ao submeter, chamar endpoint `/detect`.
- **Step 2 (Revisão do Mapeamento):** Tela em formato de tabela mostrando: coluna Excel | cabeçalho detectado | campo destino sugerido (dropdown editável) | tipo inferido | nível de confiança (verde >90%, amarelo 50-90%, vermelho <50%). Abaixo, exibir valores de amostra por coluna. Seção de ConfigValor com tipo de D/C detectado (editável). Botões "Confirmar e Avançar" e "Editar Detalhes" (abre opções avançadas).
- **Step 3 (Contas/Regras):** Se o arquivo não tem colunas de conta, mostrar templates contextuais sugeridos pelo backend. Cada template como card expandível com campos para o usuário preencher apenas os números das contas. Opção de criar regra personalizada ou usar builder avançado.
- **Step 4 (Preview — obrigatório):** Chamar endpoint `/test-parse`. Exibir tabela paginada dos lançamentos simulados com status por linha (OK, fora do período, sem conta). Resumo visual (contadores + valor total). Botões "Voltar e Ajustar" e "Processar N Lançamentos". Se houver pendências, permitir resolver ANTES de processar.

**Frontend — Integração com fluxo existente:**
- O atalho "Se layout existente → Upload → Preview → Processar" deve continuar funcionando. O wizard é o caminho para novos layouts; layouts salvos podem pular direto para o preview.
- Respeitar integralmente o design system SWISS_HIGH_CONTRAST conforme `design_guidelines.json`.

**Critério de aceite:** Endpoint `/detect` retorna sugestões corretas para os 6 cenários Excel do documento v2 (extrato simples, metadados no topo, D/C sufixo, colunas separadas, campo composto, regras condicionais). Endpoint `/test-parse` simula sem gravar. Wizard frontend funcional com 4 steps. Preview mostra resumo correto.

---

### FASE 5 — Refinamento, Preparação OFX e Validação Final (Checkpoint Final)

**Objetivo:** Polir a experiência, preparar a arquitetura para OFX, e validar o sistema completo.

**Backend — Preparação OFX (arquitetural, sem implementação do parser):**
- Criar Port `OFXParserPort` na camada Application com assinatura para receber bytes e retornar lista de lançamentos tipados. Não implementar o adapter ainda — apenas definir o contrato.
- Ajustar `ProcessarLoteUseCase` para detectar tipo de arquivo pela extensão e rotear para o parser correto (Excel → DynamicExcelParser, OFX → OFXParser quando disponível). Manter fallback gracioso se parser OFX não estiver implementado.
- Registrar enum `TipoArquivoImportacao.OFX` e ajustar modelos se necessário.

**Backend — Integração perfil de saída:**
- Garantir que o processamento de lote utiliza efetivamente o `perfil_saida_id` para configurar o gerador de saída. As constantes externalizadas na Fase 3 devem ser resolvidas pelo perfil de saída selecionado.

**Frontend — Refinamento UX do Wizard:**
- Adicionar indicador visual de steps (stepper/breadcrumb) no topo do wizard.
- Garantir que o botão "Editar Detalhes" no Step 2 abre as opções avançadas existentes (transformações, regex, concat) sem perder o contexto da sugestão automática.
- Implementar feedback visual de confiança com cores do design system (verde/amarelo/vermelho) e tooltips explicativos.

**Validação completa:**
- Executar todos os testes existentes em `backend/tests/` e garantir que passam (atualizar testes para refletir novas interfaces de DI se necessário).
- Testar fluxo completo end-to-end: upload → detecção → confirmação → regras → preview → processamento → download do TXT.
- Validar os 6 cenários Excel do documento v2 contra o endpoint `/detect`.
- Verificar que o fluxo existente (layout já cadastrado → upload → processar) continua funcional sem regressão.
- Validar no frontend que todas as páginas renderizam sem erros, navegação funciona, toasts aparecem corretamente, lazy loading não introduz telas em branco.

**Critério de aceite:** Todos os testes passam. Fluxo end-to-end funcional para novos layouts (wizard) e para layouts existentes (atalho). Port OFX definida. Perfil de saída integrado ao processamento. 6 cenários v2 validados.

---

## 6. Diretrizes Obrigatórias

### Backend — Clean Architecture
- **Regra de Dependência:** dependências apontam sempre para dentro (Adapters → Application → Domain). Domain NUNCA importa de Application ou Adapters.
- **Value Objects primeiro:** toda lógica de formatação e validação de CNPJ, Email, PeriodoContabil e ContaContabil deve residir exclusivamente nos VOs do domínio. Nunca duplicar em controllers ou adapters.
- **Ports e Adapters:** todo acesso externo (banco, email, file system, parser) deve ser definido como Port (interface abstrata em Application) e implementado como Adapter (em Adapters/Outbound).
- **Use Cases orquestram:** lógica de negócio vive nos Use Cases. Controllers apenas traduzem HTTP para chamadas de Use Case e vice-versa.
- **Novos use cases (DetectarLayout, PreviewParse):** devem seguir o mesmo padrão dos existentes — recebem ports via construtor, executam lógica de domínio, retornam entidades.

### Frontend — Feature-Sliced Design
- **Hierarquia de layers:** `app > pages > features > entities > shared`. Camadas superiores podem importar de inferiores, NUNCA o contrário.
- **Features isoladas:** uma feature NÃO importa de outra feature diretamente. Comunicação entre features ocorre via shared ou via composição na page.
- **Shared é genérico:** componentes em shared não devem conter lógica de negócio. Apenas utilitários, UI genérica e configuração.
- **Public API por slice:** cada feature/entity expõe apenas o necessário via arquivo `index.js` na raiz do slice.
- **Import-wizard como feature:** o wizard de importação v2 deve ser uma feature isolada em `src/features/import-wizard/` com seus próprios componentes, hooks e modelo.

### Design System
- Todas as alterações visuais devem respeitar o `design_guidelines.json` (paleta SWISS_HIGH_CONTRAST, fontes, espaçamentos, componentes Shadcn customizados).
- Indicadores de confiança (verde/amarelo/vermelho) devem usar as cores funcionais definidas no design system.
- Tabelas de dados (preview, mapeamento) devem usar a fonte JetBrains Mono.

### Gerais
- **Sem regressão:** cada fase deve manter 100% da funcionalidade existente.
- **Sem dependências novas** a menos que explicitamente justificado.
- **Exports nomeados** para componentes, **exports default** para páginas.

---

## 7. Formato de Feedback Estruturado (Obrigatório por Checkpoint)

Ao concluir **CADA FASE**, apresente obrigatoriamente o seguinte relatório:

---

### Relatório de Checkpoint — Fase [N]: [Nome da Fase]

**1. Resumo de Alterações:**
- Lista de todos os arquivos criados, modificados ou removidos, agrupados por camada/layer (Domain, Application, Adapters, Config | app, pages, features, entities, shared).

**2. Inconformidades Resolvidas:**

| ID | Status | Ação Tomada |
|----|--------|-------------|
| B-XX / F-XX | Resolvida / Parcial / Adiada | Descrição da ação |

**3. Features v2 Implementadas (quando aplicável):**

| Capacidade | Status | Observações |
|------------|--------|-------------|
| Auto-detecção de layout | Implementada / Parcial / Pendente | Detalhes |
| Preview de parsing | Implementada / Parcial / Pendente | Detalhes |
| Templates contextuais | Implementada / Parcial / Pendente | Detalhes |
| Wizard frontend | Implementada / Parcial / Pendente | Detalhes |

**4. Testes e Validação:**
- Resultado da execução de testes (se aplicável).
- Verificações manuais realizadas (endpoints testados, páginas navegadas, cenários v2 validados).

**5. Riscos e Dependências Remanescentes:**
- Qualquer risco identificado durante a implementação.
- Dependências que impactam fases futuras.

**6. Métricas (quando mensurável):**
- Número de linhas de código duplicado removidas.
- Número de arquivos migrados para nova estrutura.
- Redução de imports circulares ou quebrados.
- Número de cenários v2 que passam no endpoint `/detect`.

**7. Próximos Passos:**
- O que será abordado na próxima fase.
- Qualquer reordenação de prioridade baseada em descobertas durante a implementação.
