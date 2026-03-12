import {
  ChangeDetectionStrategy, Component, input, output, computed,
} from '@angular/core';
import { ReactiveFormsModule, FormArray, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ColunaLayout, TipoDado, CamposDisponiveisResponse } from '../../../core/models/import-layout.model';

const TIPOS: { value: TipoDado; label: string }[] = [
  { value: 'string',  label: 'Texto'    },
  { value: 'decimal', label: 'Decimal'  },
  { value: 'date',    label: 'Data'     },
  { value: 'integer', label: 'Inteiro'  },
];

@Component({
  selector: 'app-coluna-layout-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div>
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Mapeamento de Colunas
        </h4>
        <button
          type="button"
          (click)="addColuna()"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors duration-150"
          data-testid="add-coluna-btn"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Adicionar Coluna
        </button>
      </div>

      @if (formArray().length === 0) {
        <div class="text-center py-6 border border-dashed border-slate-200 text-sm text-slate-400">
          Nenhuma coluna mapeada. Clique em "Adicionar Coluna" para começar.
        </div>
      } @else {
        <div class="border border-slate-200 overflow-x-auto">
          <table class="w-full text-sm" aria-label="Mapeamento de colunas">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-24">Coluna Excel</th>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Campo Destino</th>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-28">Tipo</th>
                <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-32">Formato</th>
                <th scope="col" class="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wider w-16">Req.</th>
                <th scope="col" class="px-3 py-2 w-10" aria-label="Ações"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100" [formArray]="formArray()">
              @for (group of formArray().controls; track $index; let i = $index) {
                <tr [formGroupName]="i" class="hover:bg-slate-50/60">
                  <td class="px-2 py-1.5">
                    <input
                      formControlName="coluna_excel"
                      type="text"
                      placeholder="ex: A"
                      [attr.aria-label]="'Coluna Excel da linha ' + (i + 1)"
                      class="w-full h-8 px-2 border border-slate-300 bg-white text-xs font-mono focus:outline-none focus:border-slate-900 transition-colors duration-150"
                      data-testid="input-coluna-excel"
                    />
                  </td>
                  <td class="px-2 py-1.5">
                    <select
                      formControlName="campo_destino"
                      [attr.aria-label]="'Campo destino da linha ' + (i + 1)"
                      class="w-full h-8 px-2 border border-slate-300 bg-white text-xs focus:outline-none focus:border-slate-900 transition-colors duration-150"
                      data-testid="select-campo-destino"
                    >
                      <option value="">Selecione...</option>
                      @for (entry of camposEntries(); track entry.key) {
                        <option [value]="entry.key">{{ entry.info.label }}</option>
                      }
                    </select>
                  </td>
                  <td class="px-2 py-1.5">
                    <select
                      formControlName="tipo_dado"
                      [attr.aria-label]="'Tipo de dado da linha ' + (i + 1)"
                      class="w-full h-8 px-2 border border-slate-300 bg-white text-xs focus:outline-none focus:border-slate-900 transition-colors duration-150"
                      data-testid="select-tipo-dado"
                    >
                      @for (t of tipos; track t.value) {
                        <option [value]="t.value">{{ t.label }}</option>
                      }
                    </select>
                  </td>
                  <td class="px-2 py-1.5">
                    @if (asFormGroup(group).get('tipo_dado')?.value === 'date') {
                      <input
                        formControlName="formato"
                        type="text"
                        placeholder="DD/MM/YYYY"
                        [attr.aria-label]="'Formato de data da linha ' + (i + 1)"
                        class="w-full h-8 px-2 border border-slate-300 bg-white text-xs font-mono focus:outline-none focus:border-slate-900 transition-colors duration-150"
                        data-testid="input-formato"
                      />
                    } @else {
                      <span class="text-xs text-slate-300">—</span>
                    }
                  </td>
                  <td class="px-2 py-1.5 text-center">
                    <input
                      formControlName="obrigatorio"
                      type="checkbox"
                      [attr.aria-label]="'Campo obrigatório linha ' + (i + 1)"
                      class="h-4 w-4 border-slate-300 focus:ring-0"
                      data-testid="check-obrigatorio"
                    />
                  </td>
                  <td class="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      (click)="removeColuna(i)"
                      class="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors duration-150"
                      [attr.aria-label]="'Remover coluna ' + (i + 1)"
                      data-testid="remove-coluna-btn"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class ColunaLayoutTableComponent {
  formArray  = input.required<FormArray>();
  campos     = input<CamposDisponiveisResponse>({});

  added   = output<void>();
  removed = output<number>();

  readonly tipos = TIPOS;

  private readonly fb = new FormBuilder();

  camposEntries = computed(() => {
    const c = this.campos();
    return Object.entries(c).map(([key, info]) => ({ key, info }));
  });

  asFormGroup(control: unknown): FormGroup {
    return control as FormGroup;
  }

  addColuna(): void {
    this.formArray().push(this.fb.group({
      coluna_excel:   ['', Validators.required],
      campo_destino:  ['', Validators.required],
      tipo_dado:      ['string', Validators.required],
      formato:        [''],
      obrigatorio:    [false],
    }));
    this.added.emit();
  }

  removeColuna(i: number): void {
    this.formArray().removeAt(i);
    this.removed.emit(i);
  }

  static buildColunasArray(fb: FormBuilder, colunas: ColunaLayout[]): FormArray {
    return fb.array(colunas.map(c => fb.group({
      coluna_excel:  [c.coluna_excel,  Validators.required],
      campo_destino: [c.campo_destino, Validators.required],
      tipo_dado:     [c.tipo_dado,     Validators.required],
      formato:       [c.formato  ?? ''],
      obrigatorio:   [c.obrigatorio ?? false],
    })));
  }
}
