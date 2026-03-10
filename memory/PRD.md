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
- **Frontend**: React 18 + TailwindCSS + Shadcn/UI
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
  - DynamicExcelParser com formatação de números, regex, concat, campos compostos, D/C embutido
- [x] **Regras de Definição de Contas** (2026-03-10)
  - RegraContaLayout com condições AND, operadores: positivo, negativo, igual, diferente, contem, dc_debito, dc_credito
  - Frontend AccountRulesBuilder com templates: "Por sinal do valor", "Por coluna D/C", "Por conteúdo de coluna", "Por combinação de colunas"
  - Integrado em LayoutForm.jsx e UploadForm.jsx

## Backlog (P0/P1/P2)

### P0 - Crítico
- [x] MVP completo
- [x] CRUD Mapeamentos
- [x] Layouts de Importação + Regras de Processamento
- [x] Upload com Preview Excel, Layout Inline
- [x] Perfis de Saída + Gerador Domínio Sistemas TXT
- [x] Transformação Avançada de Dados (DynamicExcelParser + UI)
- [x] Regras de Definição de Contas (AccountRulesBuilder + backend engine)

### P1 - Importante
- [ ] Integrar o gerador de saída (perfil_saida_id) no ProcessarLoteUseCase
- [ ] Construtor visual de regras aprimorado (RegraBuilder.jsx) para regras de processamento
- [ ] Preview de parsing com layout + arquivo de exemplo
- [ ] Integração real de envio de e-mails (Resend)

### P2 - Melhorias
- [ ] Clonagem avançada de layouts com UI dedicada
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
| POST | /api/v1/import-layouts | Criar layout (com regras_conta) |
| PUT | /api/v1/import-layouts/{id} | Atualizar layout (com regras_conta) |
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
