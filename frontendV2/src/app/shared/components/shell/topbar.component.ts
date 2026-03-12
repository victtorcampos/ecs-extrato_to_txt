import {
  ChangeDetectionStrategy, Component, computed,
  inject, signal, OnInit
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SessionService } from '../../../core/services/session.service';
import { CnpjPipe } from '../../pipes/cnpj.pipe';

@Component({
  selector: 'app-topbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CnpjPipe],
  host: {
    class: 'flex items-center justify-between h-16 px-6 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 shrink-0',
  },
  template: `
    <!-- Left: breadcrumb -->
    <div class="flex items-center gap-2 text-sm text-slate-500">
      <span class="font-semibold text-slate-900 font-heading">ECS</span>
    </div>

    <!-- Right: CNPJ selector + session -->
    <div class="flex items-center gap-3">
      <!-- CNPJ selector -->
      <div class="relative">
        <button
          (click)="toggleDropdown()"
          class="flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors duration-150"
          aria-haspopup="listbox"
          [attr.aria-expanded]="dropdownOpen()"
          data-testid="cnpj-selector"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span class="font-mono text-xs">
            @if (sessionService.activeSession()) {
              {{ sessionService.activeSession()!.cnpj | cnpj }}
            } @else {
              Selecionar CNPJ
            }
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        @if (dropdownOpen()) {
          <div
            class="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 shadow-lg z-50"
            role="listbox"
            aria-label="Selecionar CNPJ"
          >
            @if (loadingCnpjs()) {
              <div class="px-4 py-3 text-sm text-slate-400">Carregando...</div>
            } @else if (cnpjs().length === 0) {
              <div class="px-4 py-3 text-sm text-slate-400">Nenhum CNPJ disponível</div>
            } @else {
              @for (cnpj of cnpjs(); track cnpj) {
                <button
                  (click)="selectCnpj(cnpj)"
                  role="option"
                  [attr.aria-selected]="sessionService.activeSession()?.cnpj === cnpj"
                  class="w-full text-left px-4 py-2.5 text-sm font-mono hover:bg-slate-50 transition-colors duration-150 flex items-center justify-between"
                  [class.bg-slate-100]="sessionService.activeSession()?.cnpj === cnpj"
                  data-testid="cnpj-option"
                >
                  {{ cnpj | cnpj }}
                  @if (sessionService.activeSession()?.cnpj === cnpj) {
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  }
                </button>
              }
            }

            @if (sessionService.activeSession()) {
              <div class="border-t border-slate-100">
                <button
                  (click)="clearSession()"
                  class="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                  data-testid="clear-session"
                >
                  Limpar sessão
                </button>
              </div>
            }
          </div>
        }
      </div>

      <!-- Session indicator -->
      @if (sessionService.activeSession()) {
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span class="text-xs text-slate-500 font-mono hidden sm:inline">Sessão ativa</span>
        </div>
      }
    </div>

    <!-- Backdrop to close dropdown -->
    @if (dropdownOpen()) {
      <div
        class="fixed inset-0 z-40"
        (click)="dropdownOpen.set(false)"
        aria-hidden="true"
      ></div>
    }
  `,
})
export class TopbarComponent implements OnInit {
  readonly sessionService = inject(SessionService);
  private readonly http = inject(HttpClient);

  dropdownOpen = signal(false);
  cnpjs = signal<string[]>([]);
  loadingCnpjs = signal(false);

  ngOnInit(): void {
    this.loadCnpjs();
  }

  toggleDropdown(): void {
    this.dropdownOpen.update(v => !v);
  }

  selectCnpj(cnpj: string): void {
    this.sessionService.setSession({ cnpj, label: cnpj, setAt: new Date().toISOString() });
    this.dropdownOpen.set(false);
  }

  clearSession(): void {
    this.sessionService.clearSession();
    this.dropdownOpen.set(false);
  }

  private loadCnpjs(): void {
    this.loadingCnpjs.set(true);
    this.http.get<string[]>('/api/v1/import-layouts/cnpjs').subscribe({
      next: (list) => { this.cnpjs.set(list); this.loadingCnpjs.set(false); },
      error: () => { this.loadingCnpjs.set(false); },
    });
  }
}
