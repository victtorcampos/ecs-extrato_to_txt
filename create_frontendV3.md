# Solicitação de Criação: frontendV3

> **Status:** Aguardando autorização
> **Data:** 2026-03-12

---

## 1. Objetivo

Criar `frontendV3/` na raiz do repositório — uma aplicação React independente para o sistema **ECS (Extrato to TXT)**, com as seguintes características principais:

- Stack **React 19 + Vite + TypeScript (strict)**
- **Dados servidos por Mock API local** (MSW — Mock Service Worker), sem acesso ao backend real
- **Autenticação JWT simulada** com gestão de usuários também via mock
- Arquitetura **Feature-Based (FBA)**

---

## 2. Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 19 (APIs: `use`, `useActionState`, `ref` como prop) |
| Build | Vite + TypeScript Strict |
| Estilo | Tailwind CSS v4 (CSS-first, `@theme` no CSS principal) |
| UI Components | Shadcn UI + Framer Motion |
| Roteamento | TanStack Router (file-based, type-safe) |
| Data Fetching | TanStack Query v5 |
| Validação | Zod (single source of truth para schemas e tipos) |
| Mock API | MSW v2 (Mock Service Worker — browser + node) |
| Auth Mock | JWT simulado com `jose` (localStorage) |
| Testes | Vitest + Testing Library (setup básico) |

---

## 3. Estrutura de Diretórios

```
frontendV3/
├── public/
│   └── mockServiceWorker.js          # gerado pelo MSW
├── src/
│   ├── main.tsx
│   ├── app.tsx                        # Router provider + QueryClient + AuthProvider
│   ├── index.css                      # @theme Tailwind v4
│   │
│   ├── mocks/                         # MSW handlers (Mock API)
│   │   ├── browser.ts                 # MSW browser setup
│   │   ├── db.ts                      # mock database (in-memory, seed data)
│   │   ├── handlers/
│   │   │   ├── auth.handlers.ts       # login, refresh, logout, users CRUD
│   │   │   ├── lotes.handlers.ts
│   │   │   ├── import-layouts.handlers.ts
│   │   │   ├── output-layouts.handlers.ts
│   │   │   ├── mapeamento.handlers.ts
│   │   │   └── regras.handlers.ts
│   │   └── seed/
│   │       └── seed-data.ts           # dados iniciais realistas
│   │
│   ├── lib/
│   │   ├── query-client.ts
│   │   ├── api-client.ts              # fetch wrapper com auth header
│   │   └── utils.ts
│   │
│   ├── features/
│   │   ├── auth/                      # Login, gestão de usuários
│   │   ├── dashboard/
│   │   ├── lotes/
│   │   ├── upload/
│   │   ├── import-layout/
│   │   ├── output-layout/
│   │   ├── mapeamento/
│   │   └── regras/
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── ui/                    # Shadcn re-exports
│   │   │   ├── layout/                # AppShell, Sidebar, Topbar
│   │   │   ├── excel-preview-table/
│   │   │   ├── coluna-layout-table/
│   │   │   ├── badge/
│   │   │   ├── spinner/
│   │   │   └── confirm-dialog/
│   │   ├── hooks/
│   │   │   ├── use-session.ts         # CNPJ ativo (localStorage)
│   │   │   └── use-toast.ts
│   │   └── types/
│   │       └── pagination.ts
│   │
│   └── routes/                        # TanStack Router file-based
│       ├── __root.tsx
│       ├── index.tsx                  # redirect → /dashboard
│       ├── login.tsx
│       ├── _authenticated.tsx         # layout guard
│       ├── _authenticated/
│       │   ├── dashboard.tsx
│       │   ├── extrato/
│       │   │   ├── upload.tsx
│       │   │   ├── lotes/
│       │   │   │   ├── index.tsx
│       │   │   │   └── $id.tsx
│       │   │   ├── import-layout/
│       │   │   │   ├── index.tsx
│       │   │   │   ├── new.tsx
│       │   │   │   ├── $id.edit.tsx
│       │   │   │   └── $layoutId.rules/
│       │   │   │       ├── new.tsx
│       │   │   │       └── $id.edit.tsx
│       │   │   ├── output-layout/
│       │   │   │   ├── index.tsx
│       │   │   │   ├── new.tsx
│       │   │   │   └── $id.edit.tsx
│       │   │   └── mapeamento.tsx
│       │   └── admin/
│       │       └── usuarios.tsx
```

Cada feature segue a estrutura obrigatória:

```
src/features/[feature-name]/
  ├── components/   # UI específica da feature
  ├── hooks/        # lógica de estado / data-fetching
  ├── services/     # schemas Zod + chamadas de API
  ├── types/        # interfaces TS (inferidas do Zod)
  └── index.ts      # public API da feature
```

---

## 4. Domínio de Dados

Todos os schemas serão definidos com **Zod** e os tipos inferidos com `z.infer<>`.

### 4.1 Auth & Usuários

```typescript
User {
  id: string
  nome: string
  email: string
  papel: 'admin' | 'operador' | 'visualizador'
  ativo: boolean
  criado_em: string
}

TokenPayload {
  sub: string        // user id
  email: string
  papel: UserPapel
  exp: number
}

LoginRequest  { email: string; senha: string }
LoginResponse { access_token: string; user: User }
```

### 4.2 Sessão de CNPJ

```typescript
CnpjSession {
  cnpj: string        // "00.000.000/0001-00"
  label: string       // nome da empresa
  setAt: string
}
```

### 4.3 Import Layout

```typescript
ImportLayout {
  id, nome, cnpj, ativo, criado_em, descricao?
}
ConfigPlanilha {
  nome_aba?, linha_cabecalho: number, linha_inicio_dados: number
}
ColunaLayout {
  coluna_excel, campo_destino, tipo_dado: TipoDado,
  formato?, obrigatorio?, valor_padrao?, transformacao?
}
ImportLayoutCompleto extends ImportLayout {
  config_planilha?, colunas?
}
```

### 4.4 Output Layout

```typescript
OutputProfile {
  id, nome, sistema_destino, sistema_destino_nome,
  formato, formato_nome, ativo, padrao,
  config, criado_em, atualizado_em, descricao?
}
```

### 4.5 Lotes

```typescript
Lote {
  id, protocolo, cnpj, cnpj_formatado, periodo,
  nome_layout, layout_id?, perfil_saida_id?,
  status: LoteStatus, mensagem_erro?, nome_arquivo?,
  tem_arquivo_saida, total_lancamentos, valor_total,
  total_pendencias, pendencias_resolvidas,
  criado_em, atualizado_em, processado_em?
}
LoteStatus = 'aguardando' | 'processando' | 'pendente' | 'concluido' | 'erro'
```

### 4.6 Mapeamento de Contas

```typescript
AccountMapping {
  id, cnpj, cnpj_formatado, conta_cliente, conta_padrao,
  nome_conta_cliente?, nome_conta_padrao?, criado_em
}
```

### 4.7 Regras de Processamento

```typescript
Regra {
  id, layout_id, nome, descricao?, ordem, ativo,
  tipo: TipoRegra, condicoes: CondicaoRegra[],
  condicoes_ou?, acao: AcaoRegra, acoes_extras?,
  criado_em, atualizado_em?
}
TipoRegra        = 'filtro' | 'transformacao' | 'validacao' | 'enriquecimento'
OperadorCondicao = 'igual' | 'diferente' | 'maior' | ... (14 operadores)
TipoAcao         = 'excluir' | 'definir_valor' | 'concatenar' | ... (7 ações)
```

---

## 5. Mock API — Contratos de Endpoints

Os handlers MSW implementam os mesmos contratos do backend Python real. Toda chamada passa pelo `api-client.ts`, que injeta o header `Authorization: Bearer <token>`.

### 5.1 Auth

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/v1/auth/login` | Retorna JWT + user |
| POST | `/api/v1/auth/logout` | Invalida token (mock: apenas 200) |
| GET | `/api/v1/auth/me` | Retorna user atual do token |
| GET | `/api/v1/users` | Lista usuários (admin) |
| POST | `/api/v1/users` | Cria usuário (admin) |
| PUT | `/api/v1/users/:id` | Atualiza usuário |
| DELETE | `/api/v1/users/:id` | Remove usuário |

### 5.2 Import Layouts

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/import-layouts` | Lista (filtro: cnpj, apenas_ativos) |
| POST | `/api/v1/import-layouts` | Cria layout |
| GET | `/api/v1/import-layouts/:id` | Detalhe completo |
| PUT | `/api/v1/import-layouts/:id` | Atualiza |
| DELETE | `/api/v1/import-layouts/:id` | Remove |
| GET | `/api/v1/import-layouts/campos-disponiveis` | Retorna `Record<string, CampoDisponivelInfo>` |
| POST | `/api/v1/import-layouts/preview-excel` | Mock: gera preview com linhas falsas |
| POST | `/api/v1/import-layouts/test-parse` | Mock: gera lançamentos de teste |
| GET | `/api/v1/import-layouts/:id/rules` | Lista regras |
| POST | `/api/v1/import-layouts/:id/rules` | Cria regra |
| GET | `/api/v1/import-layouts/:id/rules/:ruleId` | Detalhe regra |
| PUT | `/api/v1/import-layouts/:id/rules/:ruleId` | Atualiza regra |
| DELETE | `/api/v1/import-layouts/:id/rules/:ruleId` | Remove regra |
| PUT | `/api/v1/import-layouts/:id/rules/reorder` | Reordena |

### 5.3 Output Layouts

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/output-profiles` | Lista |
| POST | `/api/v1/output-profiles` | Cria |
| GET | `/api/v1/output-profiles/:id` | Detalhe |
| PUT | `/api/v1/output-profiles/:id` | Atualiza |
| DELETE | `/api/v1/output-profiles/:id` | Remove |

### 5.4 Lotes

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/lotes` | Lista paginada (cnpj, status, page, page_size) |
| POST | `/api/v1/lotes` | Cria lote (upload) |
| GET | `/api/v1/lotes/:id` | Detalhe |
| POST | `/api/v1/lotes/:id/processar` | Inicia processamento (mock: muda status) |
| DELETE | `/api/v1/lotes/:id` | Remove |
| GET | `/api/v1/lotes/estatisticas` | Totais por status |

### 5.5 Mapeamento de Contas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/account-mappings` | Lista (filtro: cnpj) |
| POST | `/api/v1/account-mappings` | Cria |
| PUT | `/api/v1/account-mappings/:id` | Atualiza |
| DELETE | `/api/v1/account-mappings/:id` | Remove |

---

## 6. Funcionalidades por Feature

### 6.1 `auth` — Login e Gestão de Usuários

**Telas:**
- `/login` — formulário email + senha, validado com Zod, JWT armazenado em `localStorage`
- `/admin/usuarios` — tabela CRUD de usuários (apenas papel `admin`)

**Comportamento mock:**
- Seed com 2 usuários: `admin@ecs.com / admin123` e `operador@ecs.com / op123`
- Token JWT assinado com chave mock, decodificado no cliente para extrair `papel` e `exp`
- Redirect automático para `/login` se token expirado ou ausente (TanStack Router `beforeLoad`)

---

### 6.2 `dashboard`

**Tela:** `/dashboard`

**Conteúdo:**
- Indicador de sessão CNPJ ativa (verde/amarelo)
- Cards de acesso rápido: Upload, Lotes, Import Layout, Output Layout
- Resumo de lotes: totais por status (usa `GET /api/v1/lotes/estatisticas`)

---

### 6.3 `upload`

**Tela:** `/extrato/upload`

**Fluxo principal:**
1. Seleção de arquivo `.xlsx` / `.xls`
2. Seleção de CNPJ ativo (dropdown com sessão)
3. Seleção de Período (mês/ano)
4. Seleção de Import Layout (filtrado por CNPJ) com botão "Criar novo" → abre **Layout Wizard**
5. Seleção de Output Layout (opcional)
6. Botão "Processar" → `POST /api/v1/lotes` com arquivo em base64

**Layout Wizard (modal 4 passos):**
- Passo 1: Nome do layout + Configuração da planilha (`linha_cabecalho`, `linha_inicio_dados`, `nome_aba`) + botão Pré-visualizar → `POST /preview-excel`
- Passo 2: Tabela de mapeamento de colunas (coluna_excel → campo_destino, tipo_dado, formato, obrigatorio)
- Passo 3: Preview de lançamentos + contas pendentes → `POST /test-parse`
- Passo 4: Confirmação → cria o layout e seleciona automaticamente no Upload

---

### 6.4 `lotes`

**Telas:**
- `/extrato/lotes` — tabela paginada com filtro por status, botão Processar, botão Download, botão Excluir
- `/extrato/lotes/:id` — detalhe: lançamentos, pendências, erros, timeline de status

---

### 6.5 `import-layout`

**Telas:**
- `/extrato/import-layout` — lista com ações: Novo, Editar, Excluir
- `/extrato/import-layout/new` — formulário full-page
- `/extrato/import-layout/:id/edit` — formulário com seção de Regras (lista + reorder)

**Formulário:**
- Identificação: nome, cnpj, descrição, ativo
- Configuração da Planilha: `linha_cabecalho`, `linha_inicio_dados`, `nome_aba`
- Mapeamento de Colunas: tabela dinâmica (add/remove linhas)
- Seção Regras (edit only): lista de regras com drag-to-reorder + botão Nova Regra

---

### 6.6 `regras`

**Telas:**
- `/extrato/import-layout/:layoutId/rules/new`
- `/extrato/import-layout/:layoutId/rules/:id/edit`

**Formulário:**
- Identificação: nome, tipo, descrição
- Condições SE (array dinâmico): campo, operador, valor (oculto para `vazio`/`nao_vazio`)
- Ação ENTÃO: tipo_acao, campo_destino, valor

---

### 6.7 `output-layout`

**Telas:**
- `/extrato/output-layout` — lista com badge "Padrão"
- `/extrato/output-layout/new`
- `/extrato/output-layout/:id/edit`

**Formulário:**
- sistema_destino (select → define formatos disponíveis via `useMemo`)
- formato (dinâmico conforme sistema)
- ativo, padrao (toggles)
- descricao

---

### 6.8 `mapeamento`

**Tela:** `/extrato/mapeamento`

**Conteúdo:** tabela inline CRUD de `AccountMapping` (conta_cliente ↔ conta_padrao), filtrada pelo CNPJ ativo.

---

## 7. Shared Components

| Componente | Descrição |
|-----------|-----------|
| `AppShell` | Sidebar + Topbar com seletor de CNPJ e user menu |
| `Sidebar` | Nav links: Dashboard, Upload, Lotes, Import Layout, Output Layout, Mapeamento |
| `Topbar` | CNPJ selector, nome do usuário, logout |
| `ColunaLayoutTable` | Tabela dinâmica de mapeamento de colunas (reutilizada em ImportLayoutForm e Wizard) |
| `ExcelPreviewTable` | Tabela de preview do Excel (linhas `unknown[][]`) |
| `Badge` | Status badges com variantes por cor |
| `Spinner` | Indicador de carregamento |
| `ConfirmDialog` | Modal de confirmação de ação destrutiva |
| `Toast` | Notificações via Sonner |
| `PageHeader` | Título de página + breadcrumb |

---

## 8. Mock Database (Seed Data)

O arquivo `src/mocks/db.ts` usará `@mswjs/data` para criar um banco em memória:

```typescript
users:           5 usuários (2 admin, 3 operador)
cnpjs:           3 empresas com CNPJ fictício
importLayouts:   4 layouts (3 ativos, 1 inativo)
colunas:         vinculadas a layouts
regras:          6 regras distribuídas entre layouts
outputProfiles:  3 perfis (Domínio, SPED, CSV)
lotes:           10 lotes em estados variados
accountMappings: 15 mapeamentos de contas
```

---

## 9. Visual Design

- Tipografia: sistema sem-serif, escala `text-xs` a `text-xl`
- Paleta: `slate` como cor principal, `emerald` para sucesso, `amber` para aviso, `red` para erro
- Estilo: bordas finas `border-slate-200`, sem border-radius (sharp corners), hover sutil
- Espaçamentos: `gap-4`, `p-6`, `mb-6` como padrões
- Shadcn UI configurado com tema neutro ("zinc") como base, sobrescrito pelo design system acima

---

## 10. Fases de Desenvolvimento

### Fase 1 — Scaffolding (setup completo)
- `npm create vite@latest frontendV3 -- --template react-ts`
- Instalar e configurar: Tailwind v4, TanStack Router, TanStack Query, Shadcn UI, MSW, Zod, Framer Motion
- Configurar TypeScript strict
- Setup MSW (`browser.ts` + handlers vazios)
- AppShell com Sidebar + Topbar (sem dados ainda)

### Fase 2 — Auth Mock
- Schema Zod: `LoginRequest`, `LoginResponse`, `User`
- MSW handler: `POST /auth/login` (valida credentials mock, retorna JWT simulado)
- Feature `auth`: página de Login + hook `useAuth`
- TanStack Router `beforeLoad` guard (redireciona se não autenticado)
- Topbar: nome do usuário + logout
- Página `/admin/usuarios`: CRUD completo

### Fase 3 — Sessão CNPJ + Dashboard
- Hook `useSession` (localStorage, seletor no Topbar)
- Feature `dashboard`: cards + estatísticas de lotes
- MSW handler: `GET /lotes/estatisticas`

### Fase 4 — Import Layouts + Regras
- Schemas Zod completos
- MSW handlers + seed data
- Feature `import-layout`: lista + formulário full-page + shared `ColunaLayoutTable`
- Feature `regras`: formulário SE/ENTÃO

### Fase 5 — Output Layouts + Mapeamento
- Feature `output-layout`: lista + formulário full-page
- Feature `mapeamento`: tabela inline CRUD

### Fase 6 — Upload + Layout Wizard + Lotes
- Feature `upload`: form de upload + seleção de layout
- Componente `LayoutWizard`: modal 4 passos
- MSW handlers mock para `preview-excel` e `test-parse` (gera dados fictícios)
- Feature `lotes`: lista paginada + detalhe

### Fase 7 — Polimento e Animações
- Framer Motion: `layoutId` animations nas listas, transições de rota
- `Suspense` boundaries em todas as queries
- Acessibilidade: ARIA, focus management, contraste WCAG AA
- Vitest: testes básicos dos custom hooks principais

---

## 11. Restrições e Decisões Técnicas

| Decisão | Justificativa |
|---------|--------------|
| MSW em vez de JSON Server | Controle total dos handlers, simula latência e erros 4xx/5xx, sem processo separado |
| TanStack Router (file-based) | Type-safe, integra com TanStack Query (loaders), elimina erros de rota em runtime |
| Zod como single source of truth | Types inferidos = sem duplicação entre schema de validação e tipo TS |
| Shadcn UI | Componentes acessíveis sem opinião de estilo, fácil de customizar |
| `localStorage` para JWT | Suficiente para MVP mock; transição para `httpOnly cookies` será feita na integração com o backend real |
| Sem Redux/Zustand | TanStack Query gerencia estado server; React Context para estado auth é suficiente |

---

## 12. Critério de Conclusão

- [ ] Build (`vite build`) sem erros
- [ ] Todas as rotas navegáveis sem erro 404
- [ ] Login funcional com 2 usuários mock
- [ ] CRUD completo (via mock) para: ImportLayout, Regras, OutputLayout, Mapeamento
- [ ] Upload cria lote no mock e aparece na lista
- [ ] Wizard 4 passos funcional (preview + test-parse com dados mock)
- [ ] Nenhum uso de `any` (TypeScript strict)
- [ ] Componentes compartilhados reutilizados entre features (sem duplicação)
