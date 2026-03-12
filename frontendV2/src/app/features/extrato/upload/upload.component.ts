import {
  ChangeDetectionStrategy, Component, OnInit,
  inject, signal, computed,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoteService } from '../../../core/services/lote.service';
import { ImportLayoutService } from '../../../core/services/import-layout.service';
import { OutputProfileService } from '../../../core/services/output-profile.service';
import { SessionService } from '../../../core/services/session.service';
import { ToastService } from '../../../core/services/toast.service';
import { ImportLayout, ImportLayoutCompleto, CamposDisponiveisResponse } from '../../../core/models/import-layout.model';
import { OutputProfile } from '../../../core/models/output-profile.model';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { LayoutWizardComponent } from './layout-wizard.component';

@Component({
  selector: 'app-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, SpinnerComponent, LayoutWizardComponent],
  template: `
    <div class="max-w-2xl">
      <form [formGroup]="form" (ngSubmit)="onSubmit()">

        <!-- Drop zone -->
        <div
          class="border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center mb-6 cursor-pointer hover:border-slate-500 hover:bg-white transition-colors duration-200"
          [class.border-slate-900]="selectedFile()"
          [class.bg-white]="selectedFile()"
          (click)="fileInput.click()"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
          role="button"
          tabindex="0"
          [attr.aria-label]="'Área de upload. ' + (selectedFile() ? 'Arquivo: ' + selectedFile()!.name : 'Clique ou arraste um arquivo Excel')"
          (keydown.enter)="fileInput.click()"
          (keydown.space)="fileInput.click()"
          data-testid="drop-zone"
        >
          <input
            #fileInput
            type="file"
            accept=".xls,.xlsx"
            class="hidden"
            (change)="onFileChange($event)"
            data-testid="file-input"
          />

          @if (selectedFile()) {
            <div class="flex items-center justify-center gap-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <div class="text-left">
                <p class="text-sm font-medium text-slate-900">{{ selectedFile()!.name }}</p>
                <p class="text-xs text-slate-500 font-mono mt-0.5">{{ fileSizeLabel() }}</p>
              </div>
              <button
                type="button"
                (click)="clearFile($event)"
                class="ml-2 text-slate-400 hover:text-red-600 transition-colors duration-150"
                aria-label="Remover arquivo"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          } @else {
            <div>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-3" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p class="text-sm font-medium text-slate-700">Clique ou arraste o arquivo aqui</p>
              <p class="text-xs text-slate-400 mt-1">Aceita: .xls, .xlsx</p>
            </div>
          }
        </div>

        <!-- Periodo -->
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label for="periodo_mes" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1.5">Mes</label>
            <select id="periodo_mes" formControlName="periodo_mes"
              class="w-full h-10 px-3 border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors duration-150"
              data-testid="select-mes">
              <option value="">Selecione...</option>
              @for (m of meses; track m.v) {
                <option [value]="m.v">{{ m.label }}</option>
              }
            </select>
          </div>
          <div>
            <label for="periodo_ano" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1.5">Ano</label>
            <input id="periodo_ano" type="number" formControlName="periodo_ano" min="2000" max="2100"
              class="w-full h-10 px-3 border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors duration-150"
              data-testid="input-ano" />
          </div>
        </div>

        <!-- Layout de importacao -->
        <div class="mb-4">
          <label for="layout_id" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1.5">
            Layout de Importação
          </label>
          <div class="flex gap-2">
            <select
              id="layout_id"
              formControlName="layout_id"
              class="flex-1 h-10 px-3 border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors duration-150"
              data-testid="select-import-layout"
            >
              <option value="">Selecione um layout...</option>
              @for (layout of importLayouts(); track layout.id) {
                <option [value]="layout.id">{{ layout.nome }}</option>
              }
            </select>
            <button
              type="button"
              (click)="abrirWizard()"
              [disabled]="!selectedFile()"
              class="h-10 px-3 border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap transition-colors duration-150"
              [attr.title]="selectedFile() ? 'Criar novo layout' : 'Selecione um arquivo primeiro'"
              data-testid="criar-layout-btn"
            >
              + Criar novo
            </button>
          </div>
          @if (loadingLayouts()) {
            <p class="text-xs text-slate-400 mt-1">Carregando layouts...</p>
          }
        </div>

        <!-- Layout de saída -->
        <div class="mb-6">
          <label for="perfil_saida_id" class="block text-xs font-medium text-slate-700 uppercase tracking-wider mb-1.5">
            Layout de Saída
          </label>
          <select
            id="perfil_saida_id"
            formControlName="perfil_saida_id"
            class="w-full h-10 px-3 border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors duration-150"
            data-testid="select-output-profile"
          >
            <option value="">Selecione um perfil...</option>
            @for (profile of outputProfiles(); track profile.id) {
              <option [value]="profile.id">{{ profile.nome }} — {{ profile.sistema_destino_nome }}</option>
            }
          </select>
          @if (loadingProfiles()) {
            <p class="text-xs text-slate-400 mt-1">Carregando perfis...</p>
          }
        </div>

        <!-- Submit -->
        <button
          type="submit"
          [disabled]="submitting() || form.invalid || !selectedFile()"
          class="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          data-testid="submit-upload"
        >
          @if (submitting()) {
            <app-spinner [size]="16" />
            Enviando...
          } @else {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Processar Extrato
          }
        </button>
      </form>
    </div>

    <!-- Wizard Modal -->
    <app-layout-wizard
      [isOpen]="wizardOpen()"
      [arquivo]="selectedFile()"
      [periodoMes]="periodoMesValue()"
      [periodoAno]="periodoAnoValue()"
      [cnpj]="cnpjAtivo()"
      [campos]="camposDisponiveis()"
      (layoutCreatedEvent)="onLayoutCriado($event)"
      (closedEvent)="wizardOpen.set(false)"
    />
  `,
})
export class UploadComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly loteService = inject(LoteService);
  private readonly importLayoutService = inject(ImportLayoutService);
  private readonly outputProfileService = inject(OutputProfileService);
  private readonly sessionService = inject(SessionService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  selectedFile      = signal<File | null>(null);
  submitting        = signal(false);
  importLayouts     = signal<ImportLayout[]>([]);
  outputProfiles    = signal<OutputProfile[]>([]);
  loadingLayouts    = signal(false);
  loadingProfiles   = signal(false);
  wizardOpen        = signal(false);
  camposDisponiveis = signal<CamposDisponiveisResponse>({});

  readonly meses = [
    { v: 1, label: '01' }, { v: 2, label: '02' }, { v: 3, label: '03' }, { v: 4, label: '04' },
    { v: 5, label: '05' }, { v: 6, label: '06' }, { v: 7, label: '07' }, { v: 8, label: '08' },
    { v: 9, label: '09' }, { v: 10, label: '10' }, { v: 11, label: '11' }, { v: 12, label: '12' },
  ];

  form = this.fb.group({
    periodo_mes:     ['', Validators.required],
    periodo_ano:     [new Date().getFullYear(), [Validators.required, Validators.min(2000), Validators.max(2100)]],
    layout_id:       ['', Validators.required],
    perfil_saida_id: ['', Validators.required],
  });

  cnpjAtivo       = computed(() => this.sessionService.activeSession()?.cnpj ?? null);
  periodoMesValue = computed(() => Number(this.form.get('periodo_mes')?.value) || 1);
  periodoAnoValue = computed(() => Number(this.form.get('periodo_ano')?.value) || new Date().getFullYear());

  fileSizeLabel(): string {
    const f = this.selectedFile();
    if (!f) return '';
    const kb = f.size / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
  }

  ngOnInit(): void {
    const cnpj = this.sessionService.activeSession()?.cnpj;
    this.loadingLayouts.set(true);
    this.importLayoutService.list(cnpj ? { cnpj } : {}).subscribe({
      next: (l) => { this.importLayouts.set(l); this.loadingLayouts.set(false); },
      error: () => { this.loadingLayouts.set(false); },
    });
    this.loadingProfiles.set(true);
    this.outputProfileService.list({ apenas_ativos: true }).subscribe({
      next: (p) => { this.outputProfiles.set(p); this.loadingProfiles.set(false); },
      error: () => { this.loadingProfiles.set(false); },
    });
    this.importLayoutService.camposDisponiveis().subscribe({
      next: (c) => this.camposDisponiveis.set(c),
      error: () => {},
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile.set(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDragLeave(_event: DragEvent): void {}

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.selectedFile.set(file);
  }

  clearFile(event: MouseEvent): void {
    event.stopPropagation();
    this.selectedFile.set(null);
  }

  abrirWizard(): void {
    if (!this.selectedFile()) return;
    this.wizardOpen.set(true);
  }

  onLayoutCriado(layout: ImportLayoutCompleto): void {
    this.importLayouts.update(list => [...list, layout]);
    this.form.patchValue({ layout_id: layout.id });
  }

  onSubmit(): void {
    const file = this.selectedFile();
    const cnpj = this.sessionService.activeSession()?.cnpj;
    if (!file || this.form.invalid || !cnpj) return;

    this.submitting.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
      const { periodo_mes, periodo_ano, layout_id, perfil_saida_id } = this.form.getRawValue();

      this.loteService.create({
        cnpj,
        periodo_mes: Number(periodo_mes),
        periodo_ano: Number(periodo_ano),
        arquivo_base64: base64,
        nome_arquivo: file.name,
        layout_id: layout_id ?? undefined,
        perfil_saida_id: perfil_saida_id ?? undefined,
      }).subscribe({
        next: (lote) => {
          this.submitting.set(false);
          this.toastService.success('Lote ' + lote.protocolo + ' criado com sucesso.');
          this.router.navigate(['/extrato/lotes', lote.id]);
        },
        error: (err) => {
          this.submitting.set(false);
          this.toastService.error(err?.error?.detail ?? 'Erro ao processar o extrato.');
        },
      });
    };
    reader.readAsDataURL(file);
  }
}
