import {
  ChangeDetectionStrategy, Component, OnInit,
  inject, signal, computed,
} from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { ImportLayoutService } from '../../../core/services/import-layout.service';
import { SessionService } from '../../../core/services/session.service';
import { ToastService } from '../../../core/services/toast.service';
import { CamposDisponiveisResponse, ColunaLayout } from '../../../core/models/import-layout.model';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { ColunaLayoutTableComponent } from '../../../shared/components/coluna-layout-table/coluna-layout-table.component';
import { RegraService } from '../../../core/services/regra.service';
import { Regra } from '../../../core/models/regra.model';
import { TIPO_REGRA_LABELS } from '../../../core/models/regra.model';

@Component({
  selector: 'app-import-layout-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, SpinnerComponent, ColunaLayoutTableComponent],
  template: `
    @if (loadingLayout()) {
      <div class="flex items-center justify-center py-20">
        <app-spinner [size]="32" />
      </div>
    } @else {
      <div class="max-w-4xl">

        <!-- Back -->
        <a
          routerLink="/extrato/import-layout"
          class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors duration-150"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Voltar para Layouts
        </a>

        <h2 class="text-xl font-bold text-slate-900 mb-8">
          {{ editId() ? 'Editar Layout' : 'Novo Layout de Importação' }}
        </h2>

        <form [formGroup]="form" (ngSubmit)="save()" class="space-y-8">

          <!-- Seção 1: Identificação -->
          <section class="border border-slate-200 p-6">
            <h3 class="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4">Identificação</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="layout-nome" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                  Nome <span aria-hidden="true" class="text-red-500">*</span>
                </label>
                <input
                  id="layout-nome"
                  type="text"
                  formControlName="nome"
                  class="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors duration-150"
                  data-testid="input-nome"
                />
              </div>
              <div>
                <p class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">CNPJ (sessão ativa)</p>
                <p class="h-9 px-3 flex items-center border border-slate-200 bg-slate-50 text-sm font-mono text-slate-600">
                  {{ sessionService.activeSession()?.cnpj ?? '—' }}
                </p>
              </div>
              <div class="sm:col-span-2">
                <label for="layout-descricao" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">Descrição</label>
                <input
                  id="layout-descricao"
                  type="text"
                  formControlName="descricao"
                  class="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors duration-150"
                  data-testid="input-descricao"
                />
              </div>
            </div>
          </section>

          <!-- Seção 2: Configuração da Planilha -->
          <section class="border border-slate-200 p-6">
            <h3 class="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4">Configuração da Planilha</h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4" formGroupName="config_planilha">
              <div>
                <label for="linha-cabecalho" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                  Linha do Cabeçalho <span aria-hidden="true" class="text-red-500">*</span>
                </label>
                <input
                  id="linha-cabecalho"
                  type="number"
                  formControlName="linha_cabecalho"
                  min="0"
                  class="w-full h-9 px-3 border border-slate-300 bg-white text-sm font-mono focus:outline-none focus:border-slate-900 transition-colors duration-150"
                  data-testid="input-linha-cabecalho"
                />
                <p class="mt-1 text-xs text-slate-400">Índice 0 = primeira linha</p>
              </div>
              <div>
                <label for="linha-inicio" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                  Linha Inicial dos Dados <span aria-hidden="true" class="text-red-500">*</span>
                </label>
                <input
                  id="linha-inicio"
                  type="number"
                  formControlName="linha_inicio_dados"
                  min="0"
                  class="w-full h-9 px-3 border border-slate-300 bg-white text-sm font-mono focus:outline-none focus:border-slate-900 transition-colors duration-150"
                  data-testid="input-linha-inicio"
                />
                <p class="mt-1 text-xs text-slate-400">Índice 0 = primeira linha</p>
              </div>
              <div>
                <label for="nome-aba" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">Nome da Aba</label>
                <input
                  id="nome-aba"
                  type="text"
                  formControlName="nome_aba"
                  placeholder="Deixe vazio para usar a primeira aba"
                  class="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors duration-150"
                  data-testid="input-nome-aba"
                />
              </div>
            </div>
          </section>

          <!-- Seção 3: Mapeamento de Colunas -->
          <section class="border border-slate-200 p-6">
            @if (loadingCampos()) {
              <div class="flex items-center gap-2 py-4 text-sm text-slate-500">
                <app-spinner [size]="16" /> Carregando campos disponíveis...
              </div>
            } @else {
              <app-coluna-layout-table
                [formArray]="colunasArray"
                [campos]="campos()"
              />
            }
          </section>

          <!-- Seção 4: Regras (somente edição) -->
          @if (editId()) {
            <section class="border border-slate-200 p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-xs font-semibold text-slate-700 uppercase tracking-wider">Regras de Processamento</h3>
                <button
                  type="button"
                  (click)="novaRegra()"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors duration-150"
                  data-testid="nova-regra-btn"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Nova Regra
                </button>
              </div>

              @if (loadingRegras()) {
                <div class="flex items-center gap-2 py-4 text-sm text-slate-500">
                  <app-spinner [size]="16" /> Carregando regras...
                </div>
              } @else if (regras().length === 0) {
                <p class="text-sm text-slate-400 py-4">Nenhuma regra configurada para este layout.</p>
              } @else {
                <div class="space-y-2">
                  @for (r of regras(); track r.id; let i = $index) {
                    <div class="flex items-center justify-between p-3 bg-white border border-slate-200 hover:border-slate-300 transition-colors duration-150">
                      <div class="flex items-center gap-3">
                        <span class="text-xs font-mono text-slate-400 w-5">{{ r.ordem }}.</span>
                        <div>
                          <p class="text-sm font-medium text-slate-900">{{ r.nome }}</p>
                          <p class="text-xs text-slate-500">
                            {{ tipoRegraLabel(r.tipo) }}
                            · {{ r.condicoes.length }} condição(ões)
                          </p>
                        </div>
                      </div>
                      <div class="flex items-center gap-1">
                        <span [class]="r.ativo ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-100 border-slate-200'"
                          class="text-xs px-2 py-0.5 border font-medium mr-2">
                          {{ r.ativo ? 'Ativa' : 'Inativa' }}
                        </span>
                        <button
                          type="button"
                          (click)="moverRegra(r.id, i, -1)"
                          [disabled]="i === 0"
                          class="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-sm disabled:opacity-30 transition-colors duration-150"
                          aria-label="Mover regra para cima"
                          data-testid="regra-up-btn"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <polyline points="18 15 12 9 6 15"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          (click)="moverRegra(r.id, i, 1)"
                          [disabled]="i === regras().length - 1"
                          class="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-sm disabled:opacity-30 transition-colors duration-150"
                          aria-label="Mover regra para baixo"
                          data-testid="regra-down-btn"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          (click)="editarRegra(r)"
                          class="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-sm transition-colors duration-150"
                          [attr.aria-label]="'Editar regra ' + r.nome"
                          data-testid="edit-regra-btn"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          (click)="deletarRegra(r)"
                          class="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors duration-150"
                          [attr.aria-label]="'Deletar regra ' + r.nome"
                          data-testid="delete-regra-btn"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </section>
          }

          <!-- Botões -->
          <div class="flex gap-3 pb-8">
            <button
              type="submit"
              [disabled]="saving() || form.invalid"
              class="px-6 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors duration-150"
              data-testid="save-btn"
            >
              @if (saving()) { Salvando... } @else { Salvar Layout }
            </button>
            <a
              routerLink="/extrato/import-layout"
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
export class ImportLayoutFormComponent implements OnInit {
  private readonly service     = inject(ImportLayoutService);
  private readonly regraService = inject(RegraService);
  readonly sessionService       = inject(SessionService);
  private readonly toastService = inject(ToastService);
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly fb           = inject(FormBuilder);

  editId         = signal<string | null>(null);
  loadingLayout  = signal(false);
  loadingCampos  = signal(false);
  loadingRegras  = signal(false);
  saving         = signal(false);
  campos         = signal<CamposDisponiveisResponse>({});
  regras         = signal<Regra[]>([]);

  form = this.fb.group({
    nome:      ['', Validators.required],
    descricao: [''],
    config_planilha: this.fb.group({
      linha_cabecalho:    [0, [Validators.required, Validators.min(0)]],
      linha_inicio_dados: [1, [Validators.required, Validators.min(0)]],
      nome_aba:           [''],
    }),
    colunas: this.fb.array([]),
  });

  get colunasArray(): FormArray {
    return this.form.get('colunas') as FormArray;
  }

  ngOnInit(): void {
    this.loadingCampos.set(true);
    this.service.camposDisponiveis().subscribe({
      next: (c) => { this.campos.set(c); this.loadingCampos.set(false); },
      error: () => { this.loadingCampos.set(false); },
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      this.loadingLayout.set(true);
      this.service.get(id).subscribe({
        next: (layout) => {
          this.form.patchValue({
            nome:      layout.nome,
            descricao: layout.descricao ?? '',
            config_planilha: {
              linha_cabecalho:    layout.config_planilha?.linha_cabecalho    ?? 0,
              linha_inicio_dados: layout.config_planilha?.linha_inicio_dados ?? 1,
              nome_aba:           layout.config_planilha?.nome_aba           ?? '',
            },
          });
          this.colunasArray.clear();
          for (const c of layout.colunas ?? []) {
            this.colunasArray.push(this.fb.group({
              coluna_excel:  [c.coluna_excel,   Validators.required],
              campo_destino: [c.campo_destino,  Validators.required],
              tipo_dado:     [c.tipo_dado,      Validators.required],
              formato:       [c.formato     ?? ''],
              obrigatorio:   [c.obrigatorio ?? false],
            }));
          }
          this.loadingLayout.set(false);
        },
        error: () => { this.loadingLayout.set(false); this.toastService.error('Erro ao carregar layout.'); },
      });
      this.loadRegras(id);
    }
  }

  private loadRegras(layoutId: string): void {
    this.loadingRegras.set(true);
    this.regraService.list(layoutId).subscribe({
      next: (r) => { this.regras.set(r); this.loadingRegras.set(false); },
      error: () => { this.loadingRegras.set(false); },
    });
  }

  save(): void {
    if (this.form.invalid) return;
    const cnpj = this.sessionService.activeSession()?.cnpj;
    if (!cnpj) { this.toastService.error('Selecione um CNPJ antes de salvar.'); return; }

    const v = this.form.getRawValue();
    const colunas: ColunaLayout[] = this.colunasArray.controls.map(ctrl => {
      const g = ctrl.value;
      return {
        coluna_excel:  g['coluna_excel'],
        campo_destino: g['campo_destino'],
        tipo_dado:     g['tipo_dado'],
        formato:       g['formato']     || undefined,
        obrigatorio:   g['obrigatorio'] ?? false,
      };
    });

    const body = {
      nome:      v['nome'] ?? '',
      descricao: v['descricao'] ?? undefined,
      cnpj,
      config_planilha: {
        linha_cabecalho:    Number(v['config_planilha']['linha_cabecalho']),
        linha_inicio_dados: Number(v['config_planilha']['linha_inicio_dados']),
        nome_aba:           v['config_planilha']['nome_aba'] || undefined,
      },
      colunas,
    };

    this.saving.set(true);
    const id = this.editId();
    const req = id ? this.service.update(id, body) : this.service.create(body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.toastService.success('Layout salvo com sucesso.');
        this.router.navigate(['/extrato/import-layout']);
      },
      error: () => { this.saving.set(false); this.toastService.error('Erro ao salvar layout.'); },
    });
  }

  tipoRegraLabel(tipo: string): string {
    return TIPO_REGRA_LABELS[tipo as keyof typeof TIPO_REGRA_LABELS] ?? tipo;
  }

  novaRegra(): void {
    const id = this.editId();
    if (id) this.router.navigate(['/extrato/import-layout', id, 'rules', 'new']);
  }

  editarRegra(r: Regra): void {
    const id = this.editId();
    if (id) this.router.navigate(['/extrato/import-layout', id, 'rules', r.id, 'edit']);
  }

  deletarRegra(r: Regra): void {
    const id = this.editId();
    if (!id) return;
    this.regraService.delete(id, r.id).subscribe({
      next: () => { this.toastService.success('Regra deletada.'); this.loadRegras(id); },
      error: () => { this.toastService.error('Erro ao deletar regra.'); },
    });
  }

  moverRegra(regraId: string, index: number, dir: -1 | 1): void {
    const id = this.editId();
    if (!id) return;
    const list = [...this.regras()];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.regras.set(list);
    this.regraService.reorder(id, list.map(r => r.id)).subscribe({
      error: () => { this.toastService.error('Erro ao reordenar regras.'); this.loadRegras(id); },
    });
  }
}
