import {
  ChangeDetectionStrategy, Component, OnInit,
  inject, signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoteService } from '../../../core/services/lote.service';
import { SessionService } from '../../../core/services/session.service';
import { ToastService } from '../../../core/services/toast.service';
import { Lote, LoteStatus } from '../../../core/models/lote.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CnpjPipe } from '../../../shared/pipes/cnpj.pipe';

@Component({
  selector: 'app-lotes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BadgeComponent, SpinnerComponent, ConfirmDialogComponent, CnpjPipe],
  template: `
    <div>
      <!-- Filters -->
      <div class="flex items-center gap-3 mb-6 flex-wrap">
        <select
          [value]="filterStatus()"
          (change)="onStatusChange($event)"
          class="h-9 px-3 border border-slate-300 bg-white text-sm text-slate-700 focus:outline-none focus:border-slate-900 transition-colors duration-150"
          aria-label="Filtrar por status"
          data-testid="filter-status"
        >
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="PROCESSANDO">Processando</option>
          <option value="CONCLUIDO">Concluído</option>
          <option value="ERRO">Erro</option>
        </select>

        <button
          (click)="load()"
          class="h-9 px-3 border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors duration-150 flex items-center gap-1.5"
          data-testid="refresh-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Atualizar
        </button>
      </div>

      <!-- Table -->
      @if (loading()) {
        <div class="flex items-center justify-center py-16">
          <app-spinner [size]="32" />
        </div>
      } @else if (lotes().length === 0) {
        <div class="text-center py-16 border border-dashed border-slate-200">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5" class="mx-auto mb-3" aria-hidden="true">
            <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <p class="text-sm text-slate-400 font-medium">Nenhum lote encontrado</p>
          <p class="text-xs text-slate-300 mt-1">Faça um upload para criar o primeiro lote.</p>
        </div>
      } @else {
        <div class="border border-slate-200 overflow-x-auto">
          <table class="w-full text-sm" aria-label="Lista de lotes">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" class="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Protocolo</th>
                <th scope="col" class="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">CNPJ</th>
                <th scope="col" class="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" class="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Criado em</th>
                <th scope="col" class="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (lote of lotes(); track lote.id) {
                <tr class="hover:bg-slate-50/60 transition-colors duration-100">
                  <td class="px-4 py-3 font-mono text-slate-900 text-xs">
                    <a [routerLink]="['/extrato/lotes', lote.id]" class="hover:underline" data-testid="lote-link">
                      {{ lote.protocolo }}
                    </a>
                  </td>
                  <td class="px-4 py-3 font-mono text-slate-600 text-xs">{{ lote.cnpj | cnpj }}</td>
                  <td class="px-4 py-3">
                    <app-badge [value]="lote.status" />
                  </td>
                  <td class="px-4 py-3 text-slate-500 text-xs font-mono">
                    {{ formatDate(lote.criado_em) }}
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center justify-end gap-2">
                      @if (lote.status === 'CONCLUIDO') {
                        <a
                          [href]="loteService.downloadUrl(lote.id)"
                          target="_blank"
                          class="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-sm transition-colors duration-150"
                          title="Download TXT"
                          [attr.aria-label]="'Download TXT do lote ' + lote.protocolo"
                          data-testid="download-btn"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </a>
                      }
                      @if (lote.status === 'ERRO') {
                        <button
                          (click)="reprocessar(lote)"
                          class="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-sm transition-colors duration-150"
                          title="Reprocessar"
                          [attr.aria-label]="'Reprocessar lote ' + lote.protocolo"
                          data-testid="reprocess-btn"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="23 4 23 10 17 10"/>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                          </svg>
                        </button>
                      }
                      <button
                        (click)="confirmDelete(lote)"
                        class="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-sm transition-colors duration-150"
                        title="Deletar"
                        [attr.aria-label]="'Deletar lote ' + lote.protocolo"
                        data-testid="delete-btn"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Confirm dialog -->
      <app-confirm-dialog
        [open]="confirmOpen()"
        title="Deletar lote"
        [message]="'Tem certeza que deseja deletar o lote ' + (loteToDelete()?.protocolo ?? '') + '? Esta ação não pode ser desfeita.'"
        confirmLabel="Deletar"
        cancelLabel="Cancelar"
        (confirmed)="doDelete()"
        (cancelled)="confirmOpen.set(false)"
      />
    </div>
  `,
})
export class LotesComponent implements OnInit {
  readonly loteService = inject(LoteService);
  private readonly sessionService = inject(SessionService);
  private readonly toastService = inject(ToastService);

  lotes = signal<Lote[]>([]);
  loading = signal(false);
  filterStatus = signal<LoteStatus | ''>('');
  confirmOpen = signal(false);
  loteToDelete = signal<Lote | null>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    const cnpj = this.sessionService.activeSession()?.cnpj;
    const status = this.filterStatus() || undefined;
    this.loading.set(true);
    this.loteService.list({ cnpj, status }).subscribe({
      next: (l) => { this.lotes.set(l); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  onStatusChange(event: Event): void {
    this.filterStatus.set((event.target as HTMLSelectElement).value as LoteStatus | '');
    this.load();
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  reprocessar(lote: Lote): void {
    this.loteService.reprocessar(lote.id).subscribe({
      next: () => { this.toastService.info(`Lote ${lote.protocolo} enviado para reprocessamento.`); this.load(); },
      error: () => { this.toastService.error('Erro ao reprocessar o lote.'); },
    });
  }

  confirmDelete(lote: Lote): void {
    this.loteToDelete.set(lote);
    this.confirmOpen.set(true);
  }

  doDelete(): void {
    const lote = this.loteToDelete();
    if (!lote) return;
    this.confirmOpen.set(false);
    this.loteService.delete(lote.id).subscribe({
      next: () => { this.toastService.success(`Lote ${lote.protocolo} deletado.`); this.load(); },
      error: () => { this.toastService.error('Erro ao deletar o lote.'); },
    });
  }
}
