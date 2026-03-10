# Sistema Contábil - Backend com Clean Architecture

## Visão Geral
Sistema de processamento de lotes contábeis que recebe arquivos Excel, valida dados, aplica regras de negócio e gera arquivos TXT no formato padrão contábil.

## Data de Criação
2026-03-08

## Arquitetura

### Clean Architecture / Hexagonal
```
/app/backend/src/
├── domain/          # Núcleo de negócio (Entidades, Value Objects, Exceções)
├── application/     # Casos de Uso e Portas (interfaces)
├── adapters/        # Implementações (REST, Repositórios, Parsers)
└── config/          # Configuração, Database, DI e Logging
```

### Frontend — Feature-Sliced Design (FSD) em migração
```
/app/frontend/src/
├── app/             # Configuração global (futuro)
├── pages/           # Páginas (futuro)
├── features/        # Features isoladas (futuro: import-wizard, etc.)
├── entities/        # Modelos compartilhados (futuro)
├── shared/          # UI genérica, hooks, utils, API (futuro)
├── components/      # Componentes atuais (migrar para FSD nas fases 2-3)
├── services/        # API service (migrar para shared/api)
└── lib/             # Utils (migrar para shared/lib)
```

### Stack Tecnológico
- **Backend**: FastAPI + Python 3.11
- **Database**: SQLite (SQLAlchemy async)
- **Frontend**: React 18 + TailwindCSS + Shadcn/UI
- **Design System**: SWISS_HIGH_CONTRAST (Manrope, IBM Plex Sans, JetBrains Mono)
- **Email**: Resend (MOCK)

## Core Requirements (Implementado)
- [x] Upload de lote Excel (base64)
- [x] Processamento assíncrono (BackgroundTasks)
- [x] Validação de período contábil
- [x] Geração de arquivo TXT
- [x] Dashboard com estatísticas
- [x] CRUD de Mapeamento de Contas
- [x] Layouts de Importação Excel com Regras de Processamento
- [x] Upload com Preview Excel e Layout Inline
- [x] Múltiplos Perfis de Saída (TXT Domínio Sistemas)
- [x] **Transformação Avançada de Dados** (2026-03-09)
- [x] **Regras de Definição de Contas** (2026-03-10)
- [x] **FASE 1 — Estabilização e Fundação Arquitetural** (2026-03-10)
  - DI centralizado com FastAPI Depends() (B-05)
  - CNPJ.formatar() no Value Object, removido duplicado dos controllers (B-03)
  - Logging estruturado JSON em todo o backend (B-07)
  - Índice ix_lotes_layout_id no banco (B-06)
  - Rota /home redireciona para / (F-09)
  - Página 404 funcional (F-11)
  - Estrutura FSD criada no frontend (F-02 início)
- [x] **FASE 2 — Migração Estrutural + Performance** (2026-03-10)
  - N+1 Query resolvida: contar_por_layouts batch no RegraRepository (B-01)
  - api.js segmentado em módulos por domínio (F-06)
  - Custom hooks: useAsync, useDownload, useNotification (F-03/F-04/F-05/F-07)
  - Hooks integrados em LotesList e LoteDetail

## Backlog (P0/P1/P2)

### P0 - Em Progresso (Refatoração v2)
- [x] Fase 1 — Estabilização e Fundação Arquitetural
- [x] Fase 2 — Migração Estrutural + Correções de Performance
- [x] Fase 3 — FSD Completo + Robustez Backend
  - except Exception: pass eliminado, substituído por logging (B-08)
  - TxtGenerator externalizado em TxtConfig dataclass (B-09)
  - Lazy loading com React.lazy + Suspense para 9 rotas (F-10)
  - FSD barrel exports: 7 features + 3 shared (F-02 final)
- [x] Fase 4 — Feature v2: Auto-Detecção + Preview (2026-03-10)
  - **DetectarLayoutUseCase**: auto-detecção de estrutura, tipos de coluna, mapeamento e ConfigValor
  - **PreviewParseUseCase**: simulação de parsing sem gravar
  - **Endpoints**: POST /detect e POST /test-parse
  - **Frontend Import Wizard**: 4 steps (Upload → Revisão → Contas/Regras → Preview)
  - Templates contextuais de regras baseados nos dados reais
  - Bug fix: tipo_dado mapping normalizado entre detect e layout entities
- [ ] Fase 5 — Refinamento, OFX prep, Validação Final
  - DetectarLayoutUseCase (auto-detecção de estrutura, tipos, mapeamento)
  - PreviewParseUseCase (simulação sem gravar)
  - Endpoints /detect e /test-parse
  - Wizard frontend 4 steps (Upload → Revisão → Contas/Regras → Preview)
  - Templates contextuais de regras
- [ ] Fase 5 — Refinamento, OFX prep, Validação Final
  - Port OFXParserPort (contrato)
  - Integrar perfil de saída no processamento
  - Polir UX do Wizard
  - Validação end-to-end dos 7 cenários

### P1 - Importante
- [ ] Integração real de envio de e-mails (Resend)

### P2 - Melhorias
- [ ] Geradores de saída XML e JSON
- [ ] Migração para Celery/Redis
- [ ] Histórico de processamentos / relatórios PDF
- [ ] Testes unitários para domínio

## Endpoints da API

### Lotes (/api/v1/lotes)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /api/v1/lotes | Criar novo lote |
| GET | /api/v1/lotes | Listar lotes |
| GET | /api/v1/lotes/estatisticas | Estatísticas |
| GET | /api/v1/lotes/{id} | Detalhes do lote |
| POST | /api/v1/lotes/{id}/resolver-pendencias | Resolver pendências |
| POST | /api/v1/lotes/{id}/reprocessar | Reprocessar lote |
| GET | /api/v1/lotes/{id}/download | Download TXT |
| DELETE | /api/v1/lotes/{id} | Excluir lote |

### Account Mappings (/api/v1/account-mappings)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/v1/account-mappings | Listar mapeamentos |
| POST | /api/v1/account-mappings | Criar mapeamento |
| PUT | /api/v1/account-mappings/{id} | Atualizar mapeamento |
| DELETE | /api/v1/account-mappings/{id} | Excluir mapeamento |

### Import Layouts (/api/v1/import-layouts)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/v1/import-layouts | Listar layouts |
| GET | /api/v1/import-layouts/campos-disponiveis | Campos disponíveis |
| GET | /api/v1/import-layouts/{id} | Obter layout |
| POST | /api/v1/import-layouts | Criar layout |
| PUT | /api/v1/import-layouts/{id} | Atualizar layout |
| POST | /api/v1/import-layouts/{id}/clone | Clonar layout |
| DELETE | /api/v1/import-layouts/{id} | Excluir layout |
| POST | /api/v1/import-layouts/preview-excel | Preview do Excel |

### Processing Rules (/api/v1/import-layouts/{layout_id}/rules)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | .../rules | Listar regras |
| POST | .../rules | Criar regra |
| PUT | .../rules/{id} | Atualizar regra |
| DELETE | .../rules/{id} | Excluir regra |

### Output Profiles (/api/v1/output-profiles)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/v1/output-profiles | Listar perfis |
| POST | /api/v1/output-profiles | Criar perfil |
| PUT | /api/v1/output-profiles/{id} | Atualizar perfil |
| DELETE | /api/v1/output-profiles/{id} | Excluir perfil |

## Documentos de Referência
- `/app/prompt_refatoracao_v2.md` — Requisitos de refatoração (5 fases)
- `/app/Ideia_Layout_de_Importacaov2.md` — Visão do Layout v2 (7 cenários)
- `/app/Ideia_Layout_de_Importacao.md` — Análise v1
- `/app/design_guidelines.json` — Design System SWISS_HIGH_CONTRAST
