import {
  ChangeDetectionStrategy, Component, OnInit,
  inject, signal, computed,
} from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { OutputProfileService } from '../../../core/services/output-profile.service';
import { ToastService } from '../../../core/services/toast.service';
import { OutputProfile, OutputSistema } from '../../../core/models/output-profile.model';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';

@Component({
  selector: 'app-output-layout-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, SpinnerComponent],
  template: `
    @if (loadingProfile()) {
      <div class="flex items-center justify-center py-20">
        <app-spinner [size]="32" />
      </div>
    } @else {
      <div class="max-w-3xl">

        <!-- Back -->
        <a
          routerLink="/extrato/output-layout"
          class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors duration-150"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Voltar para Layouts de Saída
        </a>

        <h2 class="text-xl font-bold text-slate-900 mb-8">
          {{ editId() ? 'Editar Perfil de Saída' : 'Novo Perfil de Saída' }}
        </h2>

        <form [formGroup]="form" (ngSubmit)="save()" class="space-y-8">

          <!-- Seção 1: Identificação -->
          <section class="border border-slate-200 p-6">
            <h3 class="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4">Identificação</h3>
            <div class="grid grid-cols-1 gap-4">
              <div>
                <label for="profile-nome" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                  Nome <span aria-hidden="true" class="text-red-500">*</span>
                </label>
                <input
                  id="profile-nome"
                  type="text"
                  formControlName="nome"
                  class="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors duration-150"
                  data-testid="input-nome"
                />
              </div>
              <div>
                <label for="profile-descricao" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">Descrição</label>
                <input
                  id="profile-descricao"
                  type="text"
                  formControlName="descricao"
                  class="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors duration-150"
                  data-testid="input-descricao"
                />
              </div>
            </div>
          </section>

          <!-- Seção 2: Destino -->
          <section class="border border-slate-200 p-6">
            <h3 class="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-4">Configuração de Destino</h3>

            @if (loadingSistemas()) {
              <div class="flex items-center gap-2 py-4 text-sm text-slate-500">
                <app-spinner [size]="16" /> Carregando sistemas...
              </div>
            } @else {
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label for="profile-sistema" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                    Sistema Destino <span aria-hidden="true" class="text-red-500">*</span>
                  </label>
                  <select
                    id="profile-sistema"
                    formControlName="sistema_destino"
                    class="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors duration-150"
                    data-testid="select-sistema"
                  >
                    <option value="">Selecione...</option>
                    @for (s of sistemas(); track s.value) {
                      <option [value]="s.value">{{ s.nome }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label for="profile-formato" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1">
                    Formato <span aria-hidden="true" class="text-red-500">*</span>
                  </label>
                  <select
                    id="profile-formato"
                    formControlName="formato"
                    class="w-full h-9 px-3 border border-slate-300 bg-white text-sm focus:outline-none focus:border-slate-900 transition-colors duration-150"
                    data-testid="select-formato"
                  >
                    <option value="">Selecione...</option>
                    @for (f of formatosDisponiveis(); track f.value) {
                      <option [value]="f.value">{{ f.nome }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="flex gap-8">
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    formControlName="ativo"
                    class="h-4 w-4 border-slate-300 focus:ring-0"
                    data-testid="check-ativo"
                  />
                  <span class="text-sm text-slate-700">Ativo</span>
                </label>
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    formControlName="padrao"
                    class="h-4 w-4 border-slate-300 focus:ring-0"
                    data-testid="check-padrao"
                  />
                  <span class="text-sm text-slate-700">Perfil padrão</span>
                </label>
              </div>
            }
          </section>

          <!-- Botões -->
          <div class="flex gap-3 pb-8">
            <button
              type="submit"
              [disabled]="saving() || form.invalid"
              class="px-6 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors duration-150"
              data-testid="save-btn"
            >
              @if (saving()) { Salvando... } @else { Salvar Perfil }
            </button>
            <a
              routerLink="/extrato/output-layout"
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
export class OutputLayoutFormComponent implements OnInit {
  private readonly service      = inject(OutputProfileService);
  private readonly toastService = inject(ToastService);
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly fb           = inject(FormBuilder);

  editId         = signal<string | null>(null);
  loadingProfile = signal(false);
  loadingSistemas = signal(false);
  saving         = signal(false);
  sistemas       = signal<OutputSistema[]>([]);

  form = this.fb.group({
    nome:            ['', Validators.required],
    descricao:       [''],
    sistema_destino: ['', Validators.required],
    formato:         ['', Validators.required],
    ativo:           [true],
    padrao:          [false],
  });

  formatosDisponiveis = computed(() => {
    const sistemaValue = this.form.get('sistema_destino')?.value ?? '';
    const found = this.sistemas().find(s => s.value === sistemaValue);
    return found?.formatos ?? [];
  });

  ngOnInit(): void {
    this.loadingSistemas.set(true);
    this.service.sistemas().subscribe({
      next: (s) => { this.sistemas.set(s); this.loadingSistemas.set(false); },
      error: () => { this.loadingSistemas.set(false); },
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      this.loadingProfile.set(true);
      this.service.get(id).subscribe({
        next: (p: OutputProfile) => {
          this.form.patchValue({
            nome:            p.nome,
            descricao:       p.descricao ?? '',
            sistema_destino: p.sistema_destino,
            formato:         p.formato,
            ativo:           p.ativo,
            padrao:          p.padrao,
          });
          this.loadingProfile.set(false);
        },
        error: () => { this.loadingProfile.set(false); this.toastService.error('Erro ao carregar perfil.'); },
      });
    }
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const body: Record<string, unknown> = {
      nome:            v['nome'],
      descricao:       v['descricao'] || undefined,
      sistema_destino: v['sistema_destino'],
      formato:         v['formato'],
      ativo:           v['ativo'],
      padrao:          v['padrao'],
    };

    this.saving.set(true);
    const id = this.editId();
    const req = id ? this.service.update(id, body) : this.service.create(body);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.toastService.success('Perfil salvo com sucesso.');
        this.router.navigate(['/extrato/output-layout']);
      },
      error: () => { this.saving.set(false); this.toastService.error('Erro ao salvar perfil.'); },
    });
  }
}
