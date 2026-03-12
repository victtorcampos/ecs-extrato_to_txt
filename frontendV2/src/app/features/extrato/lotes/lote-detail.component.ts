import {
  ChangeDetectionStrategy, Component, OnInit,
  inject, input, signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoteService } from '../../../core/services/lote.service';
import { ToastService } from '../../../core/services/toast.service';
import { Lote } from '../../../core/models/lote.model';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { CnpjPipe } from '../../../shared/pipes/cnpj.pipe';

@Component({
  selector: 'app-lote-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BadgeComponent, SpinnerComponent, CnpjPipe],
  template: `
    @if (loading()) {
      <div class="flex items-center justify-center py-20">
        <app-spinner [size]="32" />
      </div>
    } @else if (lote()) {
      <div class="max-w-3xl">

        <!-- Back -->
        <a
          routerLink="/extrato/lotes"
          class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors duration-150"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Voltar para Lotes
        </a>

        <!-- Header -->
        <div class="flex items-start justify-between mb-8">
          <div>
            <p class="text-xs text-slate-400 uppercase tracking-widest mb-1">Lote</p>
            <h2 class="text-2xl font-bold text-slate-900 font-mono">{{ lote()!.protocolo }}</h2>
            <p class="text-sm text-slate-500 mt-1 font-mono">{{ lote()!.cnpj | cnpj }}</p>
          </div>
          <app-badge [value]="lote()!.status" />
        </div>

        <!-- Info grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div class="p-4 bg-slate-50 border border-slate-200">
            <p class="text-xs text-slate-400 uppercase tracking-widest mb-1">Criado em</p>
            <p class="text-sm font-mono text-slate-800">{{ formatDate(lote()!.criado_em) }}</p>
          </div>
          @if (lote()!.arquivo_nome) {
            <div class="p-4 bg-slate-50 border border-slate-200">
              <p class="text-xs text-slate-400 uppercase tracking-widest mb-1">Arquivo</p>
              <p class="text-sm font-mono text-slate-800 truncate">{{ lote()!.arquivo_nome }}</p>
            </div>
          }
          @if (lote()!.total_registros != null) {
            <div class="p-4 bg-slate-50 border border-slate-200">
              <p class="text-xs text-slate-400 uppercase tracking-widest mb-1">Registros</p>
              <p class="text-sm font-mono text-slate-800">
                {{ lote()!.registros_processados }}/{{ lote()!.total_registros }}
              </p>
            </div>
          }
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap gap-3">
          @if (lote()!.status === 'CONCLUIDO') {
            <a
              [href]="loteService.downloadUrl(lote()!.id)"
              target="_blank"
              class="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors duration-150"
              data-testid="download-btn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download TXT
            </a>
          }
          @if (lote()!.status === 'ERRO') {
            <button
              (click)="reprocessar()"
              [disabled]="reprocessando()"
              class="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors duration-150"
              data-testid="reprocess-btn"
            >
              @if (reprocessando()) {
                <app-spinner [size]="14" />
              } @else {
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              }
              Reprocessar
            </button>
          }
        </div>
      </div>
    } @else {
      <p class="text-slate-500">Lote não encontrado.</p>
    }
  `,
})
export class LoteDetailComponent implements OnInit {
  readonly loteService = inject(LoteService);
  private readonly toastService = inject(ToastService);

  id = input.required<string>();

  lote = signal<Lote | null>(null);
  loading = signal(false);
  reprocessando = signal(false);

  ngOnInit(): void {
    this.loading.set(true);
    this.loteService.get(this.id()).subscribe({
      next: (l) => { this.lote.set(l); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  reprocessar(): void {
    const l = this.lote();
    if (!l) return;
    this.reprocessando.set(true);
    this.loteService.reprocessar(l.id).subscribe({
      next: (updated) => { this.lote.set(updated); this.reprocessando.set(false); this.toastService.info('Reprocessamento iniciado.'); },
      error: () => { this.reprocessando.set(false); this.toastService.error('Erro ao reprocessar.'); },
    });
  }
}
