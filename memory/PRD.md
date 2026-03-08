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
└── config/          # Configuração e Database
```

### Stack Tecnológico
- **Backend**: FastAPI + Python 3.11
- **Database**: SQLite (SQLAlchemy async)
- **Frontend**: React 18 + TailwindCSS
- **Email**: Resend (configurável, atualmente MOCK)

## User Personas
1. **Contadores**: Upload de lotes, verificação de status
2. **Analistas Financeiros**: Resolução de pendências de mapeamento
3. **Gestores**: Visualização de estatísticas e relatórios

## Core Requirements (Implementado)
- [x] Upload de lote Excel (base64)
- [x] Processamento assíncrono (BackgroundTasks)
- [x] Validação de período contábil
- [x] Geração de arquivo TXT
- [x] Download de arquivo processado
- [x] Dashboard com estatísticas
- [x] Lista de lotes com filtros
- [x] Detalhes do lote com lançamentos
- [x] Resolução de pendências de mapeamento
- [x] Exclusão de lotes
- [x] **CRUD de Mapeamento de Contas** (2026-03-08)
- [x] **Layouts de Importação Excel** (2026-03-08)
- [x] **Regras de Processamento** (2026-03-08)

## O que foi implementado

### Backend (2026-03-08)
- Estrutura Clean Architecture completa
- Value Objects: CNPJ, PeriodoContabil, Email, ContaContabil, TipoDado, TipoSinal, TipoRegra, OperadorCondicao, TipoAcao
- Entidades: Lote, Lancamento, PendenciaMapeamento, MapeamentoConta, LayoutExcel, ColunaLayout, ConfigPlanilha, ConfigValor, ConfigHistoricoPadrao, RegraProcessamento, CondicaoRegra, AcaoRegra
- Casos de Uso: CriarProtocolo, ProcessarLote, ResolverPendencia, ConsultarLote, DeletarLote
- Portas e Adaptadores seguindo Hexagonal Architecture
- API REST com endpoints /api/v1/lotes
- Parser Excel com python-calamine
- Gerador TXT no formato padrão

### Backend - Account Mappings (2026-03-08)
- **Use Cases**: CriarMapeamento, AtualizarMapeamento, AtualizarLoteMapeamento, ListarMapeamentos, DeletarMapeamento
- **Repository Port**: MapeamentoContaRepositoryPort (interface completa)
- **SQLAlchemy Repository**: CRUD completo + operações em lote
- **Controller REST**: /api/v1/account-mappings (CRUD + bulk operations)
- **DTOs**: Request/Response para todas as operações

### Backend - Layouts de Importação (2026-03-08)
- **Use Cases**: CriarLayout, AtualizarLayout, ListarLayouts, DeletarLayout, ClonarLayout
- **Repository Port**: LayoutRepositoryPort (interface completa)
- **SQLAlchemy Repository**: CRUD completo para layouts
- **Controller REST**: /api/v1/import-layouts (CRUD + clone + campos-disponiveis)
- **DTOs**: CriarLayoutRequest, AtualizarLayoutRequest, ClonarLayoutRequest, LayoutResponse, LayoutListResponse
- **23 campos de mapeamento** disponíveis (valor, conta_debito, conta_credito, data, historico, etc.)

### Backend - Regras de Processamento (2026-03-08)
- **Use Cases**: CriarRegra, AtualizarRegra, ListarRegras, ReordenarRegras, DeletarRegra, TestarRegra, AplicarRegras
- **Repository Port**: RegraRepositoryPort (interface completa)
- **SQLAlchemy Repository**: CRUD completo + reordenação
- **Controller REST**: /api/v1/import-layouts/{layout_id}/rules (CRUD + reorder)
- **DTOs**: CriarRegraRequest, AtualizarRegraRequest, ReordenarRegrasRequest, RegraResponse, RegraListResponse
- **Motor de Regras**: Suporte a FILTRO, TRANSFORMAÇÃO, VALIDAÇÃO e ENRIQUECIMENTO
- **14 operadores de condição**: igual, diferente, maior, menor, contém, regex, etc.
- **11 tipos de ação**: excluir, definir_valor, template, copiar_campo, maiúscula, etc.
- **ConfigValor flexível**: 5 métodos de determinação D/C:
  - `sinal_valor`: Positivo=Débito, Negativo=Crédito
  - `coluna_tipo`: Uma coluna com valores D/C (com mapeamento editável de 12+ variantes)
  - `colunas_separadas`: Colunas distintas para Débito e Crédito
  - `fixo_debito` / `fixo_credito`: Tipo fixo
  - Suporte a `case_insensitive` e mapeamento customizável de textos

### Frontend (2026-03-08)
- Design System Swiss High-Contrast
- Dashboard com estatísticas
- Formulário de Upload com drag & drop
- Lista de Lotes com filtros e paginação
- Detalhes do Lote com lançamentos
- Resolução de Pendências

### Frontend - Mapeamentos (2026-03-08)
- **Nova página**: /mapeamentos
- **Filtro por CNPJ**, busca, seleção múltipla, edição em lote

### Frontend - Layouts de Importação (2026-03-08)
- **Nova página**: /layouts (lista de layouts com filtro por CNPJ)
- **Formulário**: /layouts/novo e /layouts/{id}/editar (CNPJ, nome, descrição, config planilha, mapeamento de colunas, config valor D/C)
- **Detalhe**: /layouts/{id} (colunas mapeadas + lista de regras com criação/edição inline)
- **Ações**: Ativar/desativar, editar, clonar, excluir
- **Navegação**: Link "Layouts" com ícone FileSpreadsheet no sidebar

## Backlog (P0/P1/P2)

### P0 - Crítico
- [x] MVP completo
- [x] CRUD Mapeamentos
- [x] Layouts de Importação + Regras de Processamento
- [x] Bug: coluna layout_id faltando na tabela lotes (migração SQLite)

### P1 - Importante
- [ ] Frontend: Construtor visual de regras aprimorado (RegraBuilder.jsx)
- [ ] Backend: Preview de parsing com layout + arquivo de exemplo
- [ ] Backend: Integrar layouts/regras no fluxo de processamento de lotes existente
- [ ] Configuração de credenciais Resend para envio real de emails

### P2 - Melhorias
- [ ] Clonagem avançada de layouts (com UI dedicada)
- [ ] Migração de processamento assíncrono para Celery/Redis
- [ ] Histórico de processamentos
- [ ] Export de relatórios em PDF
- [ ] Testes unitários para domínio

## Endpoints da API

### Lotes (/api/v1/lotes)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/health | Health check |
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
| GET | /api/v1/account-mappings/cnpjs | Listar CNPJs distintos |
| GET | /api/v1/account-mappings/{id} | Obter mapeamento |
| POST | /api/v1/account-mappings | Criar mapeamento |
| PUT | /api/v1/account-mappings/{id} | Atualizar mapeamento |
| PUT | /api/v1/account-mappings/bulk/update | Atualização em lote |
| DELETE | /api/v1/account-mappings/{id} | Excluir mapeamento |
| DELETE | /api/v1/account-mappings/bulk/delete | Exclusão em lote |

### Import Layouts (/api/v1/import-layouts)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/v1/import-layouts | Listar layouts |
| GET | /api/v1/import-layouts/campos-disponiveis | Campos disponíveis |
| GET | /api/v1/import-layouts/cnpjs | Listar CNPJs distintos |
| GET | /api/v1/import-layouts/{id} | Obter layout |
| POST | /api/v1/import-layouts | Criar layout |
| PUT | /api/v1/import-layouts/{id} | Atualizar layout |
| POST | /api/v1/import-layouts/{id}/clone | Clonar layout |
| DELETE | /api/v1/import-layouts/{id} | Excluir layout |

### Processing Rules (/api/v1/import-layouts/{layout_id}/rules)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | .../rules | Listar regras |
| GET | .../rules/{id} | Obter regra |
| POST | .../rules | Criar regra |
| PUT | .../rules/{id} | Atualizar regra |
| PUT | .../rules/reorder | Reordenar regras |
| DELETE | .../rules/{id} | Excluir regra |
