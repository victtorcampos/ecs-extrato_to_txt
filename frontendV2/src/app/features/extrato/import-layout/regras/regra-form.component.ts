import {
  ChangeDetectionStrategy, Component, OnInit,
  inject, signal,
} from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { RegraService } from '../../../../core/services/regra.service';
import { ImportLayoutService } from '../../../../core/services/import-layout.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  RegraCreateRequest, CondicaoRegra, AcaoRegra,
  TipoRegra, OperadorCondicao, TipoAcao,
  OPERADOR_LABELS, TIPO_ACAO_LABELS, TIPO_REGRA_LABELS,
} from '../../../../core/models/regra.model';
import { CamposDisponiveisResponse } from '../../../../core/models/import-layout.model';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner.component';

const TIPOS_REGRA: { value: TipoRegra; label: string }[] = [
  { value: 'filtro',         label: 'Filtro — exclui lançamentos' },
  { value: 'transformacao',  label: 'Transformação — altera valores' },
  { value: 'enriquecimento', label: 'Enriquecimento — completa dados' },
  { value: 'validacao',      label: 'Validação — verifica dados' },
];

const OPERADORES: { value: OperadorCondicao; label: string }[] = Object.entries(OPERADOR_LABELS).map(
  ([value, label]) => ({ value: value as OperadorCondicao, label })
);

const TIPOS_ACAO: { value: TipoAcao; label: string }[] = Object.entries(TIPO_ACAO_LABELS).map(
  ([value, label]) => ({ value: value as TipoAcao, label })
);

const OPERADORES_SEM_VALOR: OperadorCondicao[] = ['vazio', 'nao_vazio'];

@Component({
  selector: 'app-regra-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, SpinnerComponent],
  template: `
    @if (loading()) {
      <div class="flex items-center justify-center py-20">
        <app-spinner [size]="32" />
      </div>
    } @else {
      <div class="max-w-3xl">

        <!-- Back -->
        <a
          [routerLink]="['/extrato/import-layout', layoutId(), 'edit']"
          class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors duration-150"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Voltar para o Layout
        </a>

        <h2 class="text-xl font-bold text-slate-900 mb-8">
          {{ editId() ? 'Editar Regra' : 'Nova Regra de Processamento' }}
        </h2>

        <form [formGroup]="form" (ngSubmit)="save()" class="space-y-6">

          <!-- Identificação -->
          <section class="border border-slate-200 p-6">
            <h3 class="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4">Identificação</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="regra-nome" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                  Nome <span aria-hidden="true" class="text-red-500">*</span>
                </label>
                <input id="regra-nome" type="text" formControlName="nome"
                  class="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors duration-150"
                  data-testid="input-regra-nome" />
              </div>
              <div>
                <label for="regra-tipo" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                  Tipo <span aria-hidden="true" class="text-red-500">*</span>
                </label>
                <select id="regra-tipo" formControlName="tipo"
                  class="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors duration-150"
                  data-testid="select-regra-tipo">
                  @for (t of tiposRegra; track t.value) {
                    <option [value]="t.value">{{ t.label }}</option>
                  }
                </select>
              </div>
              <div class="sm:col-span-2">
                <label for="regra-descricao" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">Descrição</label>
                <input id="regra-descricao" type="text" formControlName="descricao"
                  class="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors duration-150" />
              </div>
            </div>
          </section>

          <!-- Condições -->
          <section class="border border-slate-200 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Condições <span class="text-slate-400 font-normal normal-case">(todas devem ser verdadeiras)</span>
              </h3>
              <button type="button" (click)="addCondicao()"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors duration-150"
                data-testid="add-condicao-btn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Adicionar Condição
              </button>
            </div>

            @if (condicoesArray.length === 0) {
              <p class="text-sm text-slate-400 py-4">Nenhuma condição definida. A regra será aplicada a todos os lançamentos.</p>
            } @else {
              <div class="space-y-3" [formArray]="condicoesArray">
                @for (g of condicoesArray.controls; track $index; let i = $index) {
                  <div [formGroupName]="i" class="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200">
                    <span class="mt-2 text-xs font-semibold text-slate-500 w-6 flex-shrink-0">
                      {{ i === 0 ? 'SE' : 'E' }}
                    </span>
                    <div class="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label [for]="'cond-campo-' + i" class="sr-only">Campo</label>
                        <select [id]="'cond-campo-' + i" formControlName="campo"
                          class="w-full h-8 px-2 border border-slate-300 bg-white text-xs focus:outline-none focus:border-slate-900 transition-colors duration-150"
                          data-testid="select-cond-campo">
                          <option value="">Campo...</option>
                          @for (entry of camposEntries(); track entry.key) {
                            <option [value]="entry.key">{{ entry.info.label }}</option>
                          }
                        </select>
                      </div>
                      <div>
                        <label [for]="'cond-op-' + i" class="sr-only">Operador</label>
                        <select [id]="'cond-op-' + i" formControlName="operador"
                          class="w-full h-8 px-2 border border-slate-300 bg-white text-xs focus:outline-none focus:border-slate-900 transition-colors duration-150"
                          data-testid="select-cond-operador">
                          @for (op of operadores; track op.value) {
                            <option [value]="op.value">{{ op.label }}</option>
                          }
                        </select>
                      </div>
                      @if (!operadorSemValor(asFormGroup(g).get('operador')?.value)) {
                        <div>
                          <label [for]="'cond-val-' + i" class="sr-only">Valor</label>
                          <input [id]="'cond-val-' + i" type="text" formControlName="valor"
                            placeholder="Valor"
                            class="w-full h-8 px-2 border border-slate-300 bg-white text-xs focus:outline-none focus:border-slate-900 transition-colors duration-150"
                            data-testid="input-cond-valor" />
                        </div>
                      }
                    </div>
                    <button type="button" (click)="removeCondicao(i)"
                      class="mt-1 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors duration-150"
                      [attr.aria-label]="'Remover condição ' + (i + 1)"
                      data-testid="remove-condicao-btn">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                }
              </div>
            }
          </section>

          <!-- Ação Principal -->
          <section class="border border-slate-200 p-6" formGroupName="acao">
            <h3 class="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4">Então</h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label for="acao-tipo" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                  Ação <span aria-hidden="true" class="text-red-500">*</span>
                </label>
                <select id="acao-tipo" formControlName="tipo_acao"
                  class="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors duration-150"
                  data-testid="select-acao-tipo">
                  @for (t of tiposAcao; track t.value) {
                    <option [value]="t.value">{{ t.label }}</option>
                  }
                </select>
              </div>
              @if (acaoTipoValue !== 'excluir') {
                <div>
                  <label for="acao-campo" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">Campo Destino</label>
                  <select id="acao-campo" formControlName="campo_destino"
                    class="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors duration-150"
                    data-testid="select-acao-campo">
                    <option value="">Selecione...</option>
                    @for (entry of camposEntries(); track entry.key) {
                      <option [value]="entry.key">{{ entry.info.label }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label for="acao-valor" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">Valor</label>
                  <input id="acao-valor" type="text" formControlName="valor"
                    placeholder="Novo valor"
                    class="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors duration-150"
                    data-testid="input-acao-valor" />
                </div>
              }
            </div>
          </section>

          <!-- Botões -->
          <div class="flex gap-3 pb-8">
            <button type="submit" [disabled]="saving() || form.invalid"
              class="px-6 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors duration-150"
              data-testid="save-regra-btn">
              @if (saving()) { Salvando... } @else { Salvar Regra }
            </button>
            <a
              [routerLink]="['/extrato/import-layout', layoutId(), 'edit']"
              class="px-6 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors duration-150"
            >
              Cancelar
            </a>
          </div>

        </form>
      </div>
    }
  `,
})
export class RegraFormComponent implements OnInit {
  private readonly service        = inject(RegraService);
  private readonly layoutService  = inject(ImportLayoutService);
  private readonly toastService   = inject(ToastService);
  private readonly router         = inject(Router);
  private readonly route          = inject(ActivatedRoute);
  private readonly fb             = inject(FormBuilder);

  layoutId = signal<string>('');
  editId   = signal<string | null>(null);
  loading  = signal(false);
  saving   = signal(false);
  campos   = signal<CamposDisponiveisResponse>({});

  readonly tiposRegra = TIPOS_REGRA;
  readonly operadores = OPERADORES;
  readonly tiposAcao  = TIPOS_ACAO;

  form = this.fb.group({
    nome:      ['', Validators.required],
    tipo:      ['filtro' as TipoRegra, Validators.required],
    descricao: [''],
    acao: this.fb.group({
      tipo_acao:     ['definir_valor' as TipoAcao, Validators.required],
      campo_destino: [''],
      valor:         [''],
    }),
  });

  get condicoesArray(): FormArray {
    return (this.form.get('condicoes') as unknown as FormArray) ?? this.fb.array([]);
  }

  get acaoTipoValue(): string {
    return this.form.get('acao.tipo_acao')?.value ?? '';
  }

  camposEntries(): { key: string; info: { label: string; tipo: string; obrigatorio: boolean } }[] {
    return Object.entries(this.campos()).map(([key, info]) => ({ key, info }));
  }

  operadorSemValor(op: string): boolean {
    return OPERADORES_SEM_VALOR.includes(op as OperadorCondicao);
  }

  asFormGroup(ctrl: unknown): FormGroup {
    return ctrl as FormGroup;
  }

  ngOnInit(): void {
    const layoutId = this.route.snapshot.paramMap.get('layoutId') ?? '';
    const editId   = this.route.snapshot.paramMap.get('id');
    this.layoutId.set(layoutId);

    // add condicoes formArray dynamically
    (this.form as FormGroup).addControl('condicoes', this.fb.array([]));

    this.layoutService.camposDisponiveis().subscribe({
      next: (c) => this.campos.set(c),
      error: () => {},
    });

    if (editId) {
      this.editId.set(editId);
      this.loading.set(true);
      this.service.get(layoutId, editId).subscribe({
        next: (r) => {
          this.form.patchValue({
            nome:      r.nome,
            tipo:      r.tipo,
            descricao: r.descricao ?? '',
            acao: {
              tipo_acao:     r.acao.tipo_acao,
              campo_destino: r.acao.campo_destino ?? '',
              valor:         r.acao.valor ?? '',
            },
          });
          const arr = this.form.get('condicoes') as unknown as FormArray;
          arr.clear();
          for (const c of r.condicoes) {
            arr.push(this.buildCondicaoGroup(c));
          }
          this.loading.set(false);
        },
        error: () => { this.loading.set(false); this.toastService.error('Erro ao carregar regra.'); },
      });
    }
  }

  private buildCondicaoGroup(c?: Partial<CondicaoRegra>): FormGroup {
    return this.fb.group({
      campo:    [c?.campo    ?? '', Validators.required],
      operador: [c?.operador ?? 'igual', Validators.required],
      valor:    [c?.valor    ?? ''],
    });
  }

  addCondicao(): void {
    (this.form.get('condicoes') as unknown as FormArray).push(this.buildCondicaoGroup());
  }

  removeCondicao(i: number): void {
    (this.form.get('condicoes') as unknown as FormArray).removeAt(i);
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const condicoes: CondicaoRegra[] = ((v as Record<string, unknown>)['condicoes'] as unknown[]).map((c: unknown) => {
      const cond = c as Record<string, unknown>;
      return {
        campo:    cond['campo'] as string,
        operador: cond['operador'] as OperadorCondicao,
        valor:    cond['valor'] as string | undefined,
      };
    });
    const acaoRaw = v['acao'] as Record<string, unknown>;
    const acao: AcaoRegra = {
      tipo_acao:     acaoRaw['tipo_acao'] as TipoAcao,
      campo_destino: (acaoRaw['campo_destino'] as string) || undefined,
      valor:         (acaoRaw['valor'] as string) || undefined,
    };
    const body: RegraCreateRequest = {
      nome:      v['nome'] ?? '',
      tipo:      v['tipo'] as TipoRegra,
      descricao: v['descricao'] || undefined,
      condicoes,
      acao,
    };

    this.saving.set(true);
    const layoutId = this.layoutId();
    const id = this.editId();
    const req = id
      ? this.service.update(layoutId, id, body)
      : this.service.create(layoutId, body);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.toastService.success('Regra salva com sucesso.');
        this.router.navigate(['/extrato/import-layout', layoutId, 'edit']);
      },
      error: () => { this.saving.set(false); this.toastService.error('Erro ao salvar regra.'); },
    });
  }
}
