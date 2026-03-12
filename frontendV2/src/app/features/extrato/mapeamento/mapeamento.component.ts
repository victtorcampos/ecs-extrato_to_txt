import {
  ChangeDetectionStrategy, Component, OnInit,
  inject, signal
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AccountMappingService } from '../../../core/services/account-mapping.service';
import { SessionService } from '../../../core/services/session.service';
import { ToastService } from '../../../core/services/toast.service';
import { AccountMapping } from '../../../core/models/account-mapping.model';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-mapeamento',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, SpinnerComponent, ConfirmDialogComponent],
  template: `
    <div class="max-w-4xl">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Mapeamento de Contas</h2>
          <p class="text-sm text-slate-500 mt-0.5">Configure a equivalência entre contas do extrato e do plano contábil.</p>
        </div>
        <button
          (click)="openForm()"
          class="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors duration-150"
          data-testid="add-mapping-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Novo Mapeamento
        </button>
      </div>

      <!-- Form inline -->
      @if (formOpen()) {
        <form [formGroup]="form" (ngSubmit)="save()" class="bg-slate-50 border border-slate-200 p-5 mb-6">
          <h3 class="text-sm font-semibold text-slate-900 mb-4">
            {{ editId() ? 'Editar Mapeamento' : 'Novo Mapeamento' }}
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label for="conta_origem" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                Conta Origem
              </label>
              <input
                id="conta_origem"
                type="text"
                formControlName="conta_origem"
                class="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 font-mono transition-colors duration-150"
                placeholder="Ex: 1001"
                data-testid="input-conta-origem"
              />
            </div>
            <div>
              <label for="conta_destino" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                Conta Destino
              </label>
              <input
                id="conta_destino"
                type="text"
                formControlName="conta_destino"
                class="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 font-mono transition-colors duration-150"
                placeholder="Ex: 1.1.01.001"
                data-testid="input-conta-destino"
              />
            </div>
          </div>
          <div class="mb-4">
            <label for="descricao" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
              Descrição (opcional)
            </label>
            <input
              id="descricao"
              type="text"
              formControlName="descricao"
              class="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors duration-150"
              data-testid="input-descricao"
            />
          </div>
          <div class="flex gap-3">
            <button
              type="submit"
              [disabled]="saving() || form.invalid"
              class="px-4 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors duration-150"
              data-testid="save-mapping-btn"
            >
              @if (saving()) { Salvando... } @else { Salvar }
            </button>
            <button
              type="button"
              (click)="closeForm()"
              class="px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors duration-150"
            >
              Cancelar
            </button>
          </div>
        </form>
      }

      <!-- Table -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <app-spinner [size]="28" />
        </div>
      } @else if (mappings().length === 0) {
        <div class="text-center py-12 border border-dashed border-slate-200">
          <p class="text-sm text-slate-400">Nenhum mapeamento configurado.</p>
        </div>
      } @else {
        <div class="border border-slate-200 overflow-x-auto">
          <table class="w-full text-sm" aria-label="Mapeamentos de contas">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" class="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Conta Origem</th>
                <th scope="col" class="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Conta Destino</th>
                <th scope="col" class="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Descrição</th>
                <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (m of mappings(); track m.id) {
                <tr class="hover:bg-slate-50/60 transition-colors duration-100">
                  <td class="px-4 py-3 font-mono text-slate-900 text-xs">{{ m.conta_origem }}</td>
                  <td class="px-4 py-3 font-mono text-slate-900 text-xs">{{ m.conta_destino }}</td>
                  <td class="px-4 py-3 text-slate-500 text-xs">{{ m.descricao || '—' }}</td>
                  <td class="px-4 py-3">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        (click)="openForm(m)"
                        class="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-sm transition-colors duration-150"
                        [attr.aria-label]="'Editar mapeamento ' + m.conta_origem"
                        data-testid="edit-mapping-btn"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        (click)="confirmDel(m)"
                        class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors duration-150"
                        [attr.aria-label]="'Deletar mapeamento ' + m.conta_origem"
                        data-testid="delete-mapping-btn"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
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

      <app-confirm-dialog
        [open]="confirmOpen()"
        title="Deletar mapeamento"
        message="Tem certeza que deseja deletar este mapeamento?"
        confirmLabel="Deletar"
        cancelLabel="Cancelar"
        (confirmed)="doDelete()"
        (cancelled)="confirmOpen.set(false)"
      />
    </div>
  `,
})
export class MapeamentoComponent implements OnInit {
  private readonly service = inject(AccountMappingService);
  private readonly sessionService = inject(SessionService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  mappings = signal<AccountMapping[]>([]);
  loading = signal(false);
  saving = signal(false);
  formOpen = signal(false);
  editId = signal<string | null>(null);
  confirmOpen = signal(false);
  toDelete = signal<AccountMapping | null>(null);

  form = this.fb.group({
    conta_origem: ['', Validators.required],
    conta_destino: ['', Validators.required],
    descricao: [''],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    const cnpj = this.sessionService.activeSession()?.cnpj;
    this.loading.set(true);
    this.service.list(cnpj ? { cnpj } : {}).subscribe({
      next: (m) => { this.mappings.set(m); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  openForm(m?: AccountMapping): void {
    this.editId.set(m?.id ?? null);
    this.form.reset({ conta_origem: m?.conta_origem ?? '', conta_destino: m?.conta_destino ?? '', descricao: m?.descricao ?? '' });
    this.formOpen.set(true);
  }

  closeForm(): void { this.formOpen.set(false); this.editId.set(null); }

  save(): void {
    if (this.form.invalid) return;
    const cnpj = this.sessionService.activeSession()?.cnpj ?? '';
    const body = { ...this.form.getRawValue(), cnpj };
    this.saving.set(true);
    const id = this.editId();
    const req = id ? this.service.update(id, body) : this.service.create(body);
    req.subscribe({
      next: () => { this.saving.set(false); this.closeForm(); this.load(); this.toastService.success('Mapeamento salvo.'); },
      error: () => { this.saving.set(false); this.toastService.error('Erro ao salvar mapeamento.'); },
    });
  }

  confirmDel(m: AccountMapping): void { this.toDelete.set(m); this.confirmOpen.set(true); }

  doDelete(): void {
    const m = this.toDelete();
    if (!m) return;
    this.confirmOpen.set(false);
    this.service.delete(m.id).subscribe({
      next: () => { this.load(); this.toastService.success('Mapeamento deletado.'); },
      error: () => { this.toastService.error('Erro ao deletar.'); },
    });
  }
}
