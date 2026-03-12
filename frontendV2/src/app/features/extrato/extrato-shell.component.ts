import {
  ChangeDetectionStrategy, Component, OnInit,
  computed, inject, signal
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LoteService } from '../../core/services/lote.service';
import { SessionService } from '../../core/services/session.service';
import { LoteEstatisticas } from '../../core/models/lote.model';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

interface StatCard {
  label: string;
  key: keyof LoteEstatisticas;
  icon: 'layers' | 'check-circle' | 'clock' | 'loader';
  variant: 'default' | 'success' | 'warning' | 'info';
}

const STAT_CARDS: StatCard[] = [
  { label: 'Total de Lotes',  key: 'total',       icon: 'layers',       variant: 'default'  },
  { label: 'Concluídos',      key: 'concluidos',  icon: 'check-circle', variant: 'success'  },
  { label: 'Pendentes',       key: 'pendentes',   icon: 'clock',        variant: 'warning'  },
  { label: 'Processando',     key: 'processando', icon: 'loader',       variant: 'info'     },
];

@Component({
  selector: 'app-extrato-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, StatCardComponent],
  template: `
    <div class="max-w-7xl mx-auto">

      <!-- Page header -->
      <div class="mb-8">
        <p class="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Módulo</p>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900">Extrato to TXT</h1>
      </div>

      <!-- Stat cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        @for (card of statCards; track card.key) {
          <app-stat-card
            [label]="card.label"
            [value]="estatisticasValue(card.key)"
            [icon]="card.icon"
            [variant]="card.variant"
          />
        }
      </div>

      <!-- Subnav + Gear button -->
      <div class="flex items-center justify-between border-b border-slate-200 mb-8">
        <!-- Left: primary nav tabs -->
        <nav class="flex items-center gap-0" aria-label="Navegação do módulo">
          <a
            routerLink="upload"
            routerLinkActive="border-b-2 border-slate-900 text-slate-900"
            class="px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-900 border-b-2 border-transparent transition-colors duration-150"
            data-testid="nav-upload"
          >
            Upload
          </a>
          <a
            routerLink="lotes"
            routerLinkActive="border-b-2 border-slate-900 text-slate-900"
            class="px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-900 border-b-2 border-transparent transition-colors duration-150"
            data-testid="nav-lotes"
          >
            Lotes
          </a>
        </nav>

        <!-- Right: gear settings dropdown -->
        <div class="relative pb-1">
          <button
            (click)="gearOpen.update(v => !v)"
            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors duration-150 rounded-sm"
            aria-haspopup="menu"
            [attr.aria-expanded]="gearOpen()"
            data-testid="gear-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>Configurações</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          @if (gearOpen()) {
            <div
              class="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 shadow-lg z-30"
              role="menu"
              aria-label="Configurações"
            >
              @for (item of gearItems; track item.route) {
                <a
                  [routerLink]="item.route"
                  (click)="gearOpen.set(false)"
                  role="menuitem"
                  class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors duration-150"
                  data-testid="gear-item"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path [attr.d]="item.iconPath"/>
                  </svg>
                  {{ item.label }}
                </a>
              }
            </div>

            <!-- Backdrop -->
            <div
              class="fixed inset-0 z-20"
              (click)="gearOpen.set(false)"
              aria-hidden="true"
            ></div>
          }
        </div>
      </div>

      <!-- Feature router outlet -->
      <router-outlet />
    </div>
  `,
})
export class ExtratoShellComponent implements OnInit {
  private readonly loteService = inject(LoteService);
  private readonly sessionService = inject(SessionService);

  readonly statCards = STAT_CARDS;
  gearOpen = signal(false);

  private _estat = signal<LoteEstatisticas>({ total: 0, concluidos: 0, pendentes: 0, processando: 0 });

  estatisticasValue(key: keyof LoteEstatisticas): number {
    return this._estat()[key];
  }

  readonly gearItems = [
    {
      label: 'Mapeamento',
      route: 'mapeamento',
      iconPath: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
    },
    {
      label: 'Layout de Importação',
      route: 'import-layout',
      iconPath: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    },
    {
      label: 'Layout de Saída',
      route: 'output-layout',
      iconPath: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    },
  ];

  ngOnInit(): void {
    const cnpj = this.sessionService.activeSession()?.cnpj;
    this.loteService.estatisticas(cnpj).subscribe({
      next: (e) => this._estat.set(e),
      error: () => {},
    });
  }
}
