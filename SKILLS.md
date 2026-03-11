---
description: Monorepo contabil Python(FastAPI)/JS(React). Regras para economia de tokens e consistencia.
globs:
  - "**/*.py"
  - "**/*.jsx"
  - "**/*.js"
  - "**/*.css"
---

# Projeto Contabil - Monorepo FastAPI + React

## Arquitetura

- **Backend**: FastAPI + SQLAlchemy + SQLite (Clean Architecture: domain > application > adapters)
- **Frontend**: React 18 + Tailwind CSS + React Router v6 (FSD: pages > components > services)
- **DB file**: `backend/contabil.db`

## Arquivos Essenciais (Leia Primeiro)

Ao trabalhar neste projeto, consulte **apenas** os arquivos relevantes para a camada:

### Backend - Nucleo
- `backend/src/domain/entities/entities.py` — Lote, Lancamento, MapeamentoConta, PendenciaMapeamento
- `backend/src/domain/entities/layout_entities.py` — LayoutExcel, RegraContaLayout, CondicaoContaLayout, ColunaLayout
- `backend/src/domain/entities/output_entities.py` — PerfilSaida
- `backend/src/application/usecases/usecases.py` — CriarProtocolo, ProcessarLote, ResolverPendencia
- `backend/src/config/models.py` — ORM models (SQLAlchemy)

### Backend - API (so se mexer em endpoints)
- `backend/src/adapters/inbound/rest/dto/dtos.py` — Todos os DTOs
- `backend/src/adapters/inbound/rest/controllers/` — Um controller por recurso

### Backend - Parsers (so se mexer em parsing)
- `backend/src/adapters/outbound/excel_parser/dynamic_parser.py` — Parser com layout dinamico
- `backend/src/adapters/outbound/excel_parser/excel_parser.py` — Parser padrao

### Frontend - Nucleo
- `frontend/src/App.js` — Rotas
- `frontend/src/components/layout/Layout.jsx` — Sidebar/nav
- `frontend/src/components/import-wizard/ImportWizard.jsx` — Wizard principal (state machine)
- `frontend/src/components/import-wizard/WizardStepper.jsx` — Steps do wizard

### Frontend - API
- `frontend/src/services/api/client.js` — Axios config
- `frontend/src/services/api/*.api.js` — Um arquivo por recurso

## Regras de Desenvolvimento

### Entidades e DTOs
- Entidades de dominio usam `dataclass` com `to_dict()` e `from_dict()`
- Sempre manter `from_dict()` retrocompativel (usar `.get()` com defaults)
- DTOs ficam em `dtos.py` unico — nao criar arquivos separados
- Campos novos em entidades: sempre `Optional` com default

### Backend
- Use cases retornam entidades de dominio, nunca dicts
- Controllers convertem entidade -> DTO no response
- Ports (interfaces) em `application/ports/` — implementacoes em `adapters/outbound/`
- Nao importe adapters no domain ou application
- SQLAlchemy models em `config/models.py` — nao criar models em outro lugar
- Testes em `backend/tests/`

### Frontend
- Componentes em `components/{feature}/` com `index.js` re-export
- Pages sao thin wrappers em `pages/` que importam componentes
- API services em `services/api/{recurso}.api.js`
- Tailwind utility classes direto no JSX, sem CSS modules
- `cn()` de `lib/utils` para classes condicionais
- Icones: usar `lucide-react` exclusivamente
- Notificacoes: usar `sonner` (`toast.success`, `toast.error`)
- Formularios: componentes `Input`, `Button`, `Select` de `components/ui`

### Convencoes de Nomes
- Backend: snake_case (Python)
- Frontend: camelCase para variaveis/funcoes, PascalCase para componentes
- Entidades: portugues (Lote, Lancamento, MapeamentoConta)
- API paths: kebab-case (`/api/v1/import-layouts`, `/api/v1/account-mappings`)
- Arquivos frontend: PascalCase para componentes, kebab-case para services

## Esquemas Reutilizaveis Entre Camadas

Para evitar duplicacao e tokens, estas sao as correspondencias:

| Conceito | Backend Entity | Backend DTO | Frontend State | API Endpoint |
|:---|:---|:---|:---|:---|
| Lote | `Lote` | `CriarLoteDTO` | `lote` | `/api/v1/lotes` |
| Lancamento | `Lancamento` | inline em Lote | `lancamentos[]` | inline |
| Layout Importacao | `LayoutExcel` | `CriarLayoutDTO` | `detection` | `/api/v1/import-layouts` |
| Regra Conta | `RegraContaLayout` | inline em Layout | `regrasContas[]` | inline |
| Mapeamento | `MapeamentoConta` | `MapeamentoDTO` | `mapeamentos[]` | `/api/v1/account-mappings` |
| Perfil/Layout Saida | `PerfilSaida` | `PerfilSaidaDTO` | `perfisSaida[]` | `/api/v1/output-profiles` |

**Regra**: O shape do DTO segue o `to_dict()` da entidade. O frontend envia/recebe no mesmo shape. Nao inventar shapes diferentes.

## Economia de Tokens - Estrategia

### 1. Reducao de Contexto
- **NAO leia** `test_reports/`, `memory/`, `.emergent/`, `node_modules/`, `__pycache__/`
- **NAO leia** todos os controllers de uma vez — leia apenas o do recurso que vai editar
- Para entender o fluxo do wizard: leia `ImportWizard.jsx` primeiro, depois o step especifico
- Para entender processamento: leia `usecases.py` > `dynamic_parser.py` nessa ordem
- Para entender o modelo: leia `entities.py` + `layout_entities.py` (cobrem 90% do dominio)

### 2. Reutilizacao de Schemas
- `to_dict()` / `from_dict()` sao a API contract — nao criar serializers separados
- DTOs espelham a estrutura de `to_dict()` — ao mudar entidade, atualizar DTO no mesmo PR
- Frontend API services usam o mesmo shape do DTO — ao mudar DTO, atualizar `.api.js`

### 3. Padroes para Ferramentas de IA
- Ao criar nova feature: comece pela entidade (domain), depois use case, depois DTO, depois controller, depois frontend
- Ao editar feature existente: leia a entidade + o arquivo especifico que vai mudar
- Para bug fix: leia o arquivo com o bug + a entidade relacionada
- Nao leia o projeto inteiro antes de comecar — use a tabela de esquemas acima para navegar
- Prefira `Edit` em arquivos existentes ao inves de `Write` com conteudo completo
- Componentes wizard: cada step e autocontido — leia apenas o step que vai editar
