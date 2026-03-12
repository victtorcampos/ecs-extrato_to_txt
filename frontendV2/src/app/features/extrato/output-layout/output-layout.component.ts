import {
  ChangeDetectionStrategy, Component, OnInit,
  inject, signal
} from '@angular/core';
import { Router } from '@angular/router';
import { OutputProfileService } from '../../../core/services/output-profile.service';
import { ToastService } from '../../../core/services/toast.service';
import { OutputProfile } from '../../../core/models/output-profile.model';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-output-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpinnerComponent, ConfirmDialogComponent],
  template: `
    <div class="max-w-4xl">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Layouts de Saída</h2>
          <p class="text-sm text-slate-500 mt-0.5">Configure os perfis de exportação TXT para cada sistema contábil.</p>
        </div>
        <button
          (click)="novo()"
          class="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors duration-150"
          data-testid="add-profile-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Novo Perfil
        </button>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-12"><app-spinner [size]="28" /></div>
      } @else if (profiles().length === 0) {
        <div class="text-center py-12 border border-dashed border-slate-200">
          <p class="text-sm text-slate-400">Nenhum perfil de saída configurado.</p>
        </div>
      } @else {
        <div class="space-y-2">
          @for (p of profiles(); track p.id) {
            <div class="flex items-center justify-between p-4 bg-white border border-slate-200 hover:border-slate-300 transition-colors duration-150">
              <div>
                <p class="text-sm font-medium text-slate-900">{{ p.nome }}</p>
                <p class="text-xs text-slate-500 mt-0.5">
                  {{ p.sistema_destino_nome }} — <span class="font-mono">{{ p.formato_nome }}</span>
                </p>
                @if (p.descricao) {
                  <p class="text-xs text-slate-400 mt-0.5">{{ p.descricao }}</p>
                }
              </div>
              <div class="flex items-center gap-2">
                @if (p.padrao) {
                  <span class="text-xs px-2 py-0.5 border border-blue-200 bg-blue-50 text-blue-700 font-medium">Padrão</span>
                }
                <span
                  [class]="p.ativo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'"
                  class="text-xs px-2 py-0.5 border font-medium"
                >
                  {{ p.ativo ? 'Ativo' : 'Inativo' }}
                </span>
                <button
                  (click)="editar(p)"
                  class="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-sm transition-colors duration-150"
                  [attr.aria-label]="'Editar perfil ' + p.nome"
                  data-testid="edit-profile-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  (click)="confirmDel(p)"
                  class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors duration-150"
                  [attr.aria-label]="'Deletar perfil ' + p.nome"
                  data-testid="delete-profile-btn"
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
        title="Deletar perfil"
        message="Tem certeza que deseja deletar este perfil de saída?"
        confirmLabel="Deletar"
        cancelLabel="Cancelar"
        (confirmed)="doDelete()"
        (cancelled)="confirmOpen.set(false)"
      />
    </div>
  `,
})
export class OutputLayoutComponent implements OnInit {
  private readonly service      = inject(OutputProfileService);
  private readonly toastService = inject(ToastService);
  private readonly router       = inject(Router);

  profiles    = signal<OutputProfile[]>([]);
  loading     = signal(false);
  confirmOpen = signal(false);
  toDelete    = signal<OutputProfile | null>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.service.list().subscribe({
      next: (p) => { this.profiles.set(p); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  novo():      void { this.router.navigate(['/extrato/output-layout/new']); }
  editar(p: OutputProfile): void { this.router.navigate(['/extrato/output-layout', p.id, 'edit']); }

  confirmDel(p: OutputProfile): void { this.toDelete.set(p); this.confirmOpen.set(true); }

  doDelete(): void {
    const p = this.toDelete();
    if (!p) return;
    this.confirmOpen.set(false);
    this.service.delete(p.id).subscribe({
      next: () => { this.load(); this.toastService.success('Perfil deletado.'); },
      error: () => { this.toastService.error('Erro ao deletar.'); },
    });
  }
}
