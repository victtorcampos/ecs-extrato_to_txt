import {
  ChangeDetectionStrategy, Component, OnInit,
  inject, signal
} from '@angular/core';
import { Router } from '@angular/router';
import { ImportLayoutService } from '../../../core/services/import-layout.service';
import { SessionService } from '../../../core/services/session.service';
import { ToastService } from '../../../core/services/toast.service';
import { ImportLayout } from '../../../core/models/import-layout.model';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-import-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpinnerComponent, ConfirmDialogComponent],
  template: `
    <div class="max-w-4xl">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Layouts de Importação</h2>
          <p class="text-sm text-slate-500 mt-0.5">Configure como as colunas do Excel são mapeadas para os campos do sistema.</p>
        </div>
        <button
          (click)="novo()"
          class="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors duration-150"
          data-testid="add-layout-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Novo Layout
        </button>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-12"><app-spinner [size]="28" /></div>
      } @else if (layouts().length === 0) {
        <div class="text-center py-12 border border-dashed border-slate-200">
          <p class="text-sm text-slate-400">Nenhum layout configurado.</p>
        </div>
      } @else {
        <div class="space-y-2">
          @for (l of layouts(); track l.id) {
            <div class="flex items-center justify-between p-4 bg-white border border-slate-200 hover:border-slate-300 transition-colors duration-150">
              <div>
                <p class="text-sm font-medium text-slate-900">{{ l.nome }}</p>
                <p class="text-xs text-slate-500 font-mono mt-0.5">{{ l.cnpj }}</p>
                @if (l.descricao) {
                  <p class="text-xs text-slate-400 mt-0.5">{{ l.descricao }}</p>
                }
              </div>
              <div class="flex items-center gap-2">
                <span
                  [class]="l.ativo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'"
                  class="text-xs px-2 py-0.5 border font-medium"
                >
                  {{ l.ativo ? 'Ativo' : 'Inativo' }}
                </span>
                <button
                  (click)="clone(l)"
                  class="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-sm transition-colors duration-150"
                  [attr.aria-label]="'Clonar layout ' + l.nome"
                  data-testid="clone-layout-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
                <button
                  (click)="editar(l)"
                  class="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-sm transition-colors duration-150"
                  [attr.aria-label]="'Editar layout ' + l.nome"
                  data-testid="edit-layout-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  (click)="confirmDel(l)"
                  class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors duration-150"
                  [attr.aria-label]="'Deletar layout ' + l.nome"
                  data-testid="delete-layout-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  </svg>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <app-confirm-dialog
        [open]="confirmOpen()"
        title="Deletar layout"
        message="Tem certeza que deseja deletar este layout?"
        confirmLabel="Deletar"
        cancelLabel="Cancelar"
        (confirmed)="doDelete()"
        (cancelled)="confirmOpen.set(false)"
      />
    </div>
  `,
})
export class ImportLayoutComponent implements OnInit {
  private readonly service      = inject(ImportLayoutService);
  private readonly sessionService = inject(SessionService);
  private readonly toastService = inject(ToastService);
  private readonly router       = inject(Router);

  layouts     = signal<ImportLayout[]>([]);
  loading     = signal(false);
  confirmOpen = signal(false);
  toDelete    = signal<ImportLayout | null>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    const cnpj = this.sessionService.activeSession()?.cnpj;
    this.loading.set(true);
    this.service.list(cnpj ? { cnpj } : {}).subscribe({
      next: (l) => { this.layouts.set(l); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  novo():      void { this.router.navigate(['/extrato/import-layout/new']); }
  editar(l: ImportLayout): void { this.router.navigate(['/extrato/import-layout', l.id, 'edit']); }

  clone(l: ImportLayout): void {
    this.service.clone(l.id).subscribe({
      next: () => { this.load(); this.toastService.success(`Layout "${l.nome}" clonado.`); },
      error: () => { this.toastService.error('Erro ao clonar layout.'); },
    });
  }

  confirmDel(l: ImportLayout): void { this.toDelete.set(l); this.confirmOpen.set(true); }

  doDelete(): void {
    const l = this.toDelete();
    if (!l) return;
    this.confirmOpen.set(false);
    this.service.delete(l.id).subscribe({
      next: () => { this.load(); this.toastService.success('Layout deletado.'); },
      error: () => { this.toastService.error('Erro ao deletar.'); },
    });
  }
}
