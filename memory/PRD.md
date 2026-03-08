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
- **Email**: Resend (configurável)

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

## O que foi implementado

### Backend (2026-03-08)
- Estrutura Clean Architecture completa
- Value Objects: CNPJ, PeriodoContabil, Email, ContaContabil
- Entidades: Lote, Lancamento, PendenciaMapeamento, MapeamentoConta
- Casos de Uso: CriarProtocolo, ProcessarLote, ResolverPendencia, ConsultarLote, DeletarLote
- Portas e Adaptadores seguindo Hexagonal Architecture
- API REST com endpoints /api/v1/lotes
- Parser Excel com python-calamine
- Gerador TXT no formato padrão

### Frontend (2026-03-08)
- Design System Swiss High-Contrast
- Dashboard com estatísticas
- Formulário de Upload com drag & drop
- Lista de Lotes com filtros e paginação
- Detalhes do Lote com lançamentos
- Resolução de Pendências

## Backlog (P0/P1/P2)

### P0 - Crítico
- [x] MVP completo

### P1 - Importante
- [ ] Configuração de credenciais Resend para envio real de emails
- [ ] Testes unitários para domínio
- [ ] Validação mais robusta de CNPJ com consulta externa

### P2 - Melhorias
- [ ] Suporte a múltiplos layouts de Excel
- [ ] Histórico de processamentos
- [ ] Export de relatórios em PDF
- [ ] Notificações por webhook

## Próximas Tarefas
1. Configurar chave API Resend para envio de emails
2. Adicionar suporte a mais layouts de Excel
3. Implementar autenticação (se necessário no futuro)

## Endpoints da API

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
