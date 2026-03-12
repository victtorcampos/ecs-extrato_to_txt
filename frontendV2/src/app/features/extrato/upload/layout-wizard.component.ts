import {
  ChangeDetectionStrategy, Component, OnChanges, SimpleChanges,
  inject, input, output, signal, computed,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { ImportLayoutService } from '../../../core/services/import-layout.service';
import { SessionService } from '../../../core/services/session.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  ImportLayoutCompleto, PreviewExcelResponse, TestParseResponse,
  ContaPendente, CamposDisponiveisResponse, ColunaLayout,
} from '../../../core/models/import-layout.model';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { ColunaLayoutTableComponent } from '../../../shared/components/coluna-layout-table/coluna-layout-table.component';
import { ExcelPreviewTableComponent } from '../../../shared/components/excel-preview-table/excel-preview-table.component';

type WizardStep = 1 | 2 | 3 | 4;

@Component({
  selector: 'app-layout-wizard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, ReactiveFormsModule, SpinnerComponent, ColunaLayoutTableComponent, ExcelPreviewTableComponent],
  template: `
    @if (isOpen()) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-slate-900/60 z-40"
        (click)="close()"
        aria-hidden="true"
      ></div>

      <!-- Modal -->
      <div
        class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
      >
        <div class="w-full max-w-4xl bg-white shadow-2xl">

          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <h2 id="wizard-title" class="text-base font-bold text-slate-900">Criar Novo Layout de Importação</h2>
              <p class="text-xs text-slate-500 mt-0.5">Passo {{ step() }} de 4</p>
            </div>
            <button
              type="button"
              (click)="close()"
              class="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-sm transition-colors duration-150"
              aria-label="Fechar wizard"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Progress bar -->
          <div class="h-1 bg-slate-100">
            <div
              class="h-full bg-slate-900 transition-all duration-300"
              [style.width.%]="(step() / 4) * 100"
              role="progressbar"
              [attr.aria-valuenow]="step()"
              aria-valuemin="1"
              aria-valuemax="4"
            ></div>
          </div>

          <!-- Body -->
          <div class="p-6">

            <!-- Passo 1: Configuração da planilha -->
            @if (step() === 1) {
              <div class="space-y-4">
                <h3 class="text-sm font-semibold text-slate-900 mb-4">Configuração da Planilha</h3>
                <form [formGroup]="configForm">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label for="wiz-nome" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                        Nome do Layout <span aria-hidden="true" class="text-red-500">*</span>
                      </label>
                      <input id="wiz-nome" type="text" formControlName="nome"
                        class="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors duration-150"
                        data-testid="wiz-nome" />
                    </div>
                    <div>
                      <p class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">CNPJ</p>
                      <p class="h-9 px-3 flex items-center border border-slate-200 bg-slate-50 text-sm font-mono text-slate-600">
                        {{ cnpj() ?? '—' }}
                      </p>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label for="wiz-cabecalho" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                        Linha Cabeçalho <span aria-hidden="true" class="text-red-500">*</span>
                      </label>
                      <input id="wiz-cabecalho" type="number" formControlName="linha_cabecalho" min="0"
                        class="w-full h-9 px-3 border border-slate-300 bg-white text-sm font-mono focus:outline-none focus:border-slate-900 transition-colors duration-150"
                        data-testid="wiz-cabecalho" />
                      <p class="mt-1 text-xs text-slate-400">Índice 0 = 1ª linha</p>
                    </div>
                    <div>
                      <label for="wiz-inicio" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                        Linha Inicial dos Dados <span aria-hidden="true" class="text-red-500">*</span>
                      </label>
                      <input id="wiz-inicio" type="number" formControlName="linha_inicio_dados" min="0"
                        class="w-full h-9 px-3 border border-slate-300 bg-white text-sm font-mono focus:outline-none focus:border-slate-900 transition-colors duration-150"
                        data-testid="wiz-inicio" />
                    </div>
                    <div>
                      <label for="wiz-aba" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">Nome da Aba</label>
                      <input id="wiz-aba" type="text" formControlName="nome_aba"
                        placeholder="Primeira aba"
                        class="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors duration-150"
                        data-testid="wiz-aba" />
                    </div>
                  </div>

                  <button type="button" (click)="previsualizarExcel()"
                    [disabled]="loadingPreview()"
                    class="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors duration-150"
                    data-testid="wiz-preview-btn">
                    @if (loadingPreview()) {
                      <app-spinner [size]="14" />
                    }
                    Pré-visualizar Excel
                  </button>
                </form>

                @if (excelPreview()) {
                  <div class="mt-4">
                    <app-excel-preview-table [preview]="excelPreview()" />
                  </div>
                }
              </div>
            }

            <!-- Passo 2: Mapeamento de Colunas -->
            @if (step() === 2) {
              <div class="space-y-4">
                <h3 class="text-sm font-semibold text-slate-900 mb-4">Mapeamento de Colunas</h3>

                @if (excelPreview()) {
                  <div class="mb-4">
                    <p class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Preview do Excel</p>
                    <app-excel-preview-table [preview]="excelPreview()" />
                  </div>
                }

                <app-coluna-layout-table
                  [formArray]="colunasArray"
                  [campos]="campos()"
                />
              </div>
            }

            <!-- Passo 3: Preview de Lançamentos + Contas Pendentes -->
            @if (step() === 3) {
              <div class="space-y-6">
                <h3 class="text-sm font-semibold text-slate-900">Preview de Lançamentos</h3>

                @if (loadingParse()) {
                  <div class="flex items-center justify-center py-12">
                    <app-spinner [size]="28" />
                  </div>
                } @else if (parseResult()) {
                  <!-- Resumo -->
                  <div class="grid grid-cols-4 gap-3">
                    <div class="p-3 bg-slate-50 border border-slate-200 text-center">
                      <p class="text-xs text-slate-400 uppercase tracking-wider">Total</p>
                      <p class="text-xl font-bold font-mono text-slate-900 mt-1">{{ parseResult()!.resumo.total }}</p>
                    </div>
                    <div class="p-3 bg-emerald-50 border border-emerald-200 text-center">
                      <p class="text-xs text-emerald-600 uppercase tracking-wider">OK</p>
                      <p class="text-xl font-bold font-mono text-emerald-800 mt-1">{{ parseResult()!.resumo.ok }}</p>
                    </div>
                    <div class="p-3 bg-amber-50 border border-amber-200 text-center">
                      <p class="text-xs text-amber-600 uppercase tracking-wider">Sem conta</p>
                      <p class="text-xl font-bold font-mono text-amber-800 mt-1">{{ parseResult()!.resumo.sem_conta }}</p>
                    </div>
                    <div class="p-3 bg-red-50 border border-red-200 text-center">
                      <p class="text-xs text-red-600 uppercase tracking-wider">Erros</p>
                      <p class="text-xl font-bold font-mono text-red-800 mt-1">{{ parseResult()!.resumo.erros }}</p>
                    </div>
                  </div>

                  <!-- Contas Pendentes -->
                  @if (parseResult()!.contas_pendentes.length > 0) {
                    <div>
                      <h4 class="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Contas sem Mapeamento</h4>
                      <div class="border border-slate-200">
                        <table class="w-full text-sm" aria-label="Contas pendentes de mapeamento">
                          <thead class="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Conta do Extrato</th>
                              <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                              <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Definir Conta</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-slate-100">
                            @for (c of parseResult()!.contas_pendentes; track c.conta; let i = $index) {
                              <tr>
                                <td class="px-4 py-2 font-mono text-slate-900">{{ c.conta }}</td>
                                <td class="px-4 py-2 text-xs text-slate-500">{{ c.tipo }}</td>
                                <td class="px-4 py-2">
                                  <input
                                    type="text"
                                    [value]="mapeamentosForm[c.conta] ?? c.mapeamento_existente ?? ''"
                                    (input)="onMapeamentoInput(c.conta, $event)"
                                    placeholder="Conta contábil"
                                    [attr.aria-label]="'Conta contábil para ' + c.conta"
                                    class="w-40 h-8 px-2 border border-slate-300 bg-white text-xs font-mono focus:outline-none focus:border-slate-900 transition-colors duration-150"
                                    data-testid="input-mapeamento"
                                  />
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                      <button type="button" (click)="testarNovamente()"
                        [disabled]="loadingParse()"
                        class="mt-3 inline-flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors duration-150"
                        data-testid="wiz-retest-btn">
                        Testar novamente
                      </button>
                    </div>
                  }

                  <!-- Preview dos lancamentos -->
                  @if (parseResult()!.lancamentos.length > 0) {
                    <div>
                      <h4 class="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        Lançamentos Detectados ({{ parseResult()!.lancamentos.length }})
                      </h4>
                      <div class="border border-slate-200 overflow-x-auto max-h-64">
                        <table class="w-full text-xs font-mono" aria-label="Preview dos lançamentos">
                          <thead class="bg-slate-50 border-b border-slate-200 sticky top-0">
                            <tr>
                              <th scope="col" class="px-3 py-2 text-left font-medium text-slate-500">#</th>
                              <th scope="col" class="px-3 py-2 text-left font-medium text-slate-500">Data</th>
                              <th scope="col" class="px-3 py-2 text-right font-medium text-slate-500">Valor</th>
                              <th scope="col" class="px-3 py-2 text-left font-medium text-slate-500">C.Débito</th>
                              <th scope="col" class="px-3 py-2 text-left font-medium text-slate-500">C.Crédito</th>
                              <th scope="col" class="px-3 py-2 text-left font-medium text-slate-500">Histórico</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-slate-100">
                            @for (l of parseResult()!.lancamentos; track l.linha) {
                              <tr [class]="l.status !== 'ok' ? 'bg-red-50' : 'hover:bg-slate-50/60'">
                                <td class="px-3 py-1.5 text-slate-400">{{ l.linha }}</td>
                                <td class="px-3 py-1.5 text-slate-800">{{ l.data }}</td>
                                <td class="px-3 py-1.5 text-slate-800 text-right">{{ l.valor | number:'1.2-2' }}</td>
                                <td class="px-3 py-1.5 text-slate-800">{{ l.conta_debito }}</td>
                                <td class="px-3 py-1.5 text-slate-800">{{ l.conta_credito }}</td>
                                <td class="px-3 py-1.5 text-slate-600 truncate max-w-xs">{{ l.historico }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  }

                  <!-- Erros -->
                  @if (parseResult()!.erros.length > 0) {
                    <div>
                      <h4 class="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">Erros ({{ parseResult()!.erros.length }})</h4>
                      <div class="space-y-1">
                        @for (e of parseResult()!.erros; track e.linha) {
                          <p class="text-xs text-red-600 font-mono">Linha {{ e.linha }} — {{ e.campo }}: {{ e.mensagem }}</p>
                        }
                      </div>
                    </div>
                  }
                }
              </div>
            }

            <!-- Passo 4: Confirmação -->
            @if (step() === 4) {
              <div class="space-y-4">
                @if (saving()) {
                  <div class="flex items-center justify-center py-12">
                    <app-spinner [size]="28" />
                    <span class="ml-3 text-sm text-slate-600">Salvando layout...</span>
                  </div>
                } @else if (layoutCriado()) {
                  <div class="text-center py-8">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="1.5" class="mx-auto mb-4" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <h3 class="text-base font-bold text-slate-900 mb-2">Layout criado com sucesso!</h3>
                    <p class="text-sm text-slate-600 mb-1">
                      <span class="font-mono font-medium">{{ layoutCriado()!.nome }}</span>
                    </p>
                    <p class="text-xs text-slate-400">
                      {{ layoutCriado()!.colunas?.length ?? 0 }} coluna(s) mapeada(s)
                    </p>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              (click)="voltar()"
              [class.invisible]="step() === 1 || (step() === 4 && layoutCriado())"
              class="px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors duration-150"
              data-testid="wiz-back-btn"
            >
              Voltar
            </button>

            <div class="flex gap-3">
              @if (step() < 3) {
                <button
                  type="button"
                  (click)="avancar()"
                  [disabled]="!podeAvancar()"
                  class="px-4 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors duration-150"
                  data-testid="wiz-next-btn"
                >
                  Próximo
                </button>
              }

              @if (step() === 3 && !saving()) {
                <button
                  type="button"
                  (click)="salvarLayout()"
                  [disabled]="saving()"
                  class="px-4 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors duration-150"
                  data-testid="wiz-save-btn"
                >
                  Salvar Layout
                </button>
              }

              @if (step() === 4 && layoutCriado()) {
                <button
                  type="button"
                  (click)="usarLayout()"
                  class="px-4 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors duration-150"
                  data-testid="wiz-use-btn"
                >
                  Usar este Layout
                </button>
              }
            </div>
          </div>

        </div>
      </div>
    }
  `,
})
export class LayoutWizardComponent implements OnChanges {
  private readonly service       = inject(ImportLayoutService);
  readonly sessionService        = inject(SessionService);
  private readonly toastService  = inject(ToastService);
  private readonly fb            = inject(FormBuilder);

  isOpen      = input.required<boolean>();
  arquivo     = input<File | null>(null);
  periodoMes  = input<number>(1);
  periodoAno  = input<number>(2026);
  cnpj        = input<string | null>(null);
  campos      = input<CamposDisponiveisResponse>({});

  layoutCreatedEvent = output<ImportLayoutCompleto>();
  closedEvent        = output<void>();

  step          = signal<WizardStep>(1);
  loadingPreview = signal(false);
  loadingParse   = signal(false);
  saving         = signal(false);

  excelPreview  = signal<PreviewExcelResponse | null>(null);
  parseResult   = signal<TestParseResponse | null>(null);
  layoutCriado  = signal<ImportLayoutCompleto | null>(null);

  mapeamentosForm: Record<string, string> = {};

  configForm = this.fb.group({
    nome:               ['', Validators.required],
    linha_cabecalho:    [0, [Validators.required, Validators.min(0)]],
    linha_inicio_dados: [1, [Validators.required, Validators.min(0)]],
    nome_aba:           [''],
  });

  colunasArray: FormArray = this.fb.array([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen()) {
      this.resetWizard();
    }
  }

  private resetWizard(): void {
    this.step.set(1);
    this.excelPreview.set(null);
    this.parseResult.set(null);
    this.layoutCriado.set(null);
    this.mapeamentosForm = {};
    this.configForm.reset({ nome: '', linha_cabecalho: 0, linha_inicio_dados: 1, nome_aba: '' });
    this.colunasArray = this.fb.array([]);
  }

  podeAvancar(): boolean {
    if (this.step() === 1) return this.configForm.valid;
    if (this.step() === 2) return this.colunasArray.length > 0 && this.colunasArray.valid;
    return true;
  }

  avancar(): void {
    const s = this.step();
    if (s === 1) { this.step.set(2); return; }
    if (s === 2) { this.step.set(3); this.testarParse(); return; }
  }

  voltar(): void {
    const s = this.step();
    if (s === 2) { this.step.set(1); return; }
    if (s === 3) { this.step.set(2); return; }
  }

  close(): void { this.closedEvent.emit(); }

  usarLayout(): void {
    const l = this.layoutCriado();
    if (l) { this.layoutCreatedEvent.emit(l); }
    this.closedEvent.emit();
  }

  private getBase64(): Promise<{ base64: string; nome: string } | null> {
    return new Promise(resolve => {
      const file = this.arquivo();
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
        resolve({ base64, nome: file.name });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  previsualizarExcel(): void {
    if (this.configForm.invalid) return;
    const v = this.configForm.getRawValue();
    this.loadingPreview.set(true);
    this.getBase64().then(f => {
      if (!f) { this.loadingPreview.set(false); this.toastService.error('Nenhum arquivo selecionado.'); return; }
      this.service.previewExcel({
        arquivo_base64:    f.base64,
        linha_cabecalho:    Number(v['linha_cabecalho']),
        linha_inicio_dados: Number(v['linha_inicio_dados']),
        nome_aba:           v['nome_aba'] || undefined,
        max_linhas:         8,
      }).subscribe({
        next: (r) => { this.excelPreview.set(r); this.loadingPreview.set(false); },
        error: () => { this.loadingPreview.set(false); this.toastService.error('Erro ao pré-visualizar Excel.'); },
      });
    });
  }

  private testarParse(): void {
    const v = this.configForm.getRawValue();
    const colunas: ColunaLayout[] = this.colunasArray.controls.map(ctrl => {
      const g = ctrl.value;
      return {
        coluna_excel:  g['coluna_excel'],
        campo_destino: g['campo_destino'],
        tipo_dado:     g['tipo_dado'],
        formato:       g['formato'] || undefined,
        obrigatorio:   g['obrigatorio'] ?? false,
      };
    });

    this.loadingParse.set(true);
    this.parseResult.set(null);

    this.getBase64().then(f => {
      if (!f) { this.loadingParse.set(false); return; }
      this.service.testParse({
        arquivo_base64:    f.base64,
        periodo_mes:       this.periodoMes(),
        periodo_ano:       this.periodoAno(),
        cnpj:              this.cnpj() ?? undefined,
        layout_config: {
          config_planilha: {
            linha_cabecalho:    Number(v['linha_cabecalho']),
            linha_inicio_dados: Number(v['linha_inicio_dados']),
            nome_aba:           v['nome_aba'] || undefined,
          },
          colunas,
        },
        mapeamentos_manuais: Object.keys(this.mapeamentosForm).length > 0 ? this.mapeamentosForm : undefined,
      }).subscribe({
        next: (r) => { this.parseResult.set(r); this.loadingParse.set(false); },
        error: () => { this.loadingParse.set(false); this.toastService.error('Erro ao testar parse.'); },
      });
    });
  }

  testarNovamente(): void { this.testarParse(); }

  onMapeamentoInput(conta: string, event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.mapeamentosForm = { ...this.mapeamentosForm, [conta]: v };
  }

  salvarLayout(): void {
    const cnpj = this.cnpj();
    if (!cnpj) { this.toastService.error('Selecione um CNPJ na sessão ativa.'); return; }

    const v = this.configForm.getRawValue();
    const colunas: ColunaLayout[] = this.colunasArray.controls.map(ctrl => {
      const g = ctrl.value;
      return {
        coluna_excel:  g['coluna_excel'],
        campo_destino: g['campo_destino'],
        tipo_dado:     g['tipo_dado'],
        formato:       g['formato'] || undefined,
        obrigatorio:   g['obrigatorio'] ?? false,
      };
    });

    const body: Partial<ImportLayoutCompleto> = {
      nome:  v['nome'] ?? '',
      cnpj,
      config_planilha: {
        linha_cabecalho:    Number(v['linha_cabecalho']),
        linha_inicio_dados: Number(v['linha_inicio_dados']),
        nome_aba:           v['nome_aba'] || undefined,
      },
      colunas,
    };

    this.saving.set(true);
    this.step.set(4);
    this.service.create(body).subscribe({
      next: (l) => {
        this.layoutCriado.set(l);
        this.saving.set(false);
        this.toastService.success(`Layout "${l.nome}" criado com sucesso.`);
      },
      error: () => {
        this.saving.set(false);
        this.step.set(3);
        this.toastService.error('Erro ao salvar layout.');
      },
    });
  }
}
