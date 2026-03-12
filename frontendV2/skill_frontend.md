# Skill Frontend — FrontendV2 Angular 21
> Referência técnica e guia de desenvolvimento para o agente

---

## Stack

| Item              | Versão / Escolha                    |
|-------------------|-------------------------------------|
| Angular           | 21.2.0 (standalone, sem NgModules)  |
| TypeScript        | 5.9.2 strict                        |
| Tailwind CSS      | v4 via PostCSS                      |
| Estado            | Signals + computed()                |
| HTTP              | HttpClient + functional interceptors|
| Formulários       | ReactiveFormsModule                 |
| CD Strategy       | OnPush em **todos** componentes     |
| Ícones            | Lucide Angular ou SVG inline        |
| Session Storage   | localStorage + SessionService signal|

---

## Regras Obrigatórias (CLAUDE.md)

1. **Standalone components** — nunca use `NgModule`.
2. **NÃO declarar `standalone: true`** — é default no Angular 20+.
3. **Signals para estado** — nunca `BehaviorSubject` para estado local.
4. **`input()` / `output()`** — nunca `@Input()` / `@Output()` decorators.
5. **`inject()`** — nunca constructor injection.
6. **`@if` / `@for` / `@switch`** — nunca `*ngIf` / `*ngFor`.
7. **`class` binding** — nunca `ngClass`.
8. **`style` binding** — nunca `ngStyle`.
9. **`ChangeDetectionStrategy.OnPush`** — obrigatório em todos os `@Component`.
10. **`host: {}`** — nunca `@HostBinding` / `@HostListener`.

---

## Estrutura de Diretórios

```
src/app/
├── core/                       # Singleton services, interceptors, guards
│   ├── services/
│   │   ├── api.service.ts
│   │   ├── session.service.ts
│   │   └── toast.service.ts
│   ├── interceptors/
│   │   └── cnpj.interceptor.ts
│   ├── guards/
│   │   └── session.guard.ts
│   └── models/
│       ├── lote.model.ts
│       ├── import-layout.model.ts
│       ├── account-mapping.model.ts
│       └── output-profile.model.ts
│
├── shared/                     # Componentes e pipes reutilizáveis
│   ├── components/
│   │   ├── shell/
│   │   │   ├── shell.component.ts
│   │   │   ├── sidebar.component.ts
│   │   │   └── topbar.component.ts
│   │   ├── stat-card/
│   │   ├── data-table/
│   │   ├── badge/
│   │   ├── spinner/
│   │   └── confirm-dialog/
│   └── pipes/
│       ├── cnpj.pipe.ts
│       └── status-label.pipe.ts
│
├── features/
│   ├── dashboard/
│   │   └── dashboard.component.ts
│   └── extrato/
│       ├── extrato.routes.ts
│       ├── extrato-shell.component.ts
│       ├── upload/
│       ├── lotes/
│       ├── mapeamento/
│       ├── import-layout/
│       └── output-layout/
│
├── app.routes.ts
├── app.config.ts
├── app.ts
└── app.html
```

---

## Convenções de Nomenclatura

| Artefato         | Pasta                    | Arquivo                          | Classe / Export              |
|------------------|--------------------------|----------------------------------|------------------------------|
| Componente       | `kebab-case/`            | `kebab-case.component.ts`        | `export class PascalCaseComponent` |
| Serviço          | `core/services/`         | `camelCase.service.ts`           | `export class CamelCaseService`    |
| Interceptor      | `core/interceptors/`     | `kebab-case.interceptor.ts`      | `export function kebabCaseInterceptor` |
| Guard            | `core/guards/`           | `kebab-case.guard.ts`            | `export function kebabCaseGuard`   |
| Pipe             | `shared/pipes/`          | `kebab-case.pipe.ts`             | `export class KebabCasePipe`       |
| Model/Interface  | `core/models/`           | `camelCase.model.ts`             | `export interface ModelName`       |
| Rotas (feature)  | `features/feature/`      | `feature.routes.ts`              | `export const featureRoutes`       |

---

## Padrão de Componente

```typescript
import { ChangeDetectionStrategy, Component, input, output, computed, signal } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="bg-white border border-slate-200 p-6 shadow-sm">
      <p class="text-sm font-medium text-slate-500 uppercase tracking-widest">{{ label() }}</p>
      <p class="font-mono text-3xl font-bold text-slate-900 mt-2">{{ value() }}</p>
    </div>
  `,
})
export class StatCardComponent {
  label = input.required<string>();
  value = input.required<number | string>();
}
```

---

## SessionService — Contrato

```typescript
interface CnpjSession {
  cnpj: string;       // ex: "12345678000195"
  label: string;      // ex: "12.345.678/0001-95 — Empresa X"
  setAt: string;      // ISO 8601
}

// Métodos públicos
sessionService.activeSession()          // Signal<CnpjSession | null>
sessionService.setSession(s: CnpjSession): void
sessionService.clearSession(): void
```

O interceptor lê `activeSession()?.cnpj` e adiciona `X-CNPJ: <valor>` no header de todas as chamadas para `/api/`.

---

## API Base URLs

```
GET  /api/v1/lotes/estatisticas          → { total, concluidos, pendentes, processando }
GET  /api/v1/lotes                       → listagem com filtros
POST /api/v1/lotes                       → upload / criação de lote
GET  /api/v1/import-layouts/cnpjs        → lista de CNPJs disponíveis
GET  /api/v1/import-layouts              → layouts do CNPJ ativo
GET  /api/v1/output-profiles             → perfis de saída
GET  /api/v1/account-mappings            → mapeamentos do CNPJ ativo
```

---

## Design Tokens (CSS Variables)

```css
/* Cores */
--color-bg:           #FFFFFF;
--color-surface:      #F8F9FA;
--color-border:       #E2E8F0;
--color-primary:      #0F172A;
--color-success:      #10B981;
--color-warning:      #F59E0B;
--color-destructive:  #EF4444;
--color-info:         #3B82F6;

/* Tipografia */
--font-heading: 'Manrope', sans-serif;
--font-body:    'IBM Plex Sans', sans-serif;
--font-mono:    'JetBrains Mono', monospace;
```

---

## Design Philosophy (Swiss High Contrast)

- **95% Monocromático** — cor como função, não decoração.
- **Grid visível** — use bordas `border-slate-200` para estruturar dados.
- **Sem rounded excessivo** — `rounded-md` no máximo, preferir `rounded-sm` ou sem arredondamento.
- **Tabelas densas e legíveis** — fonte mono para dados, header com `bg-slate-50`.
- **Glassmorphism no topbar/header** — `backdrop-blur-md bg-white/80`.
- **Micro-animações obrigatórias** — hover, focus, enter states em cada elemento interativo.
- **Sem `transition: all`** — sempre transicionar propriedades específicas.
- **Sem `text-align: center` global** — nunca no container raiz.
- **Espaçamento generoso** — padding `p-6`, gaps `gap-8`.
- **`data-testid`** em todos os elementos interativos.

---

## Layout da Feature `Extrato to TXT`

```
┌──────────────────────────────────────────────────────────┐
│  [Total Lotes: 42]  [Concluídos: 30]  [Pendentes: 7]  [Processando: 5]  │  stat cards
├──────────────────────────┬───────────────────────────────┤
│  ○ Upload   ○ Lotes      │                    ⚙ Configurações ▼         │  subnav
├──────────────────────────┴───────────────────────────────┤  dropdown ⚙:
│                                                          │  • Mapeamento
│               <router-outlet>                            │  • Layout Importação
│                                                          │  • Layout Saída
└──────────────────────────────────────────────────────────┘
```

---

## Status Badge — Mapeamento de Cores

| Status       | Classe Tailwind                            |
|--------------|--------------------------------------------|
| CONCLUIDO    | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| PENDENTE     | `bg-amber-50 text-amber-700 border-amber-200`       |
| PROCESSANDO  | `bg-blue-50 text-blue-700 border-blue-200`          |
| ERRO         | `bg-red-50 text-red-700 border-red-200`             |

---

## Checklist Antes de Cada Commit

- [ ] `ChangeDetectionStrategy.OnPush` no componente
- [ ] `data-testid` nos elementos interativos
- [ ] Sem `any` no TypeScript
- [ ] Sem `ngClass` / `ngStyle` / `*ngIf` / `*ngFor`
- [ ] `TrackBy` em todos os `@for` com listas de objetos
- [ ] Acessibilidade: `aria-label` em ícones sem texto visível
- [ ] Build sem warnings: `ng build`
