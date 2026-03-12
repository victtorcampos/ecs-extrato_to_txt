import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import { PreviewExcelResponse } from '../../../core/models/import-layout.model';

@Component({
  selector: 'app-excel-preview-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (preview()) {
      <div class="border border-slate-200 overflow-x-auto">
        <table class="text-xs font-mono" aria-label="Preview do arquivo Excel">
          <thead class="bg-slate-900 text-white">
            <tr>
              <th scope="col" class="px-3 py-2 text-left font-medium opacity-60">#</th>
              @for (h of preview()!.cabecalhos; track $index) {
                <th scope="col" class="px-3 py-2 text-left font-medium whitespace-nowrap">{{ h }}</th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            @for (row of preview()!.linhas; track $index; let i = $index) {
              <tr class="hover:bg-slate-50/60">
                <td class="px-3 py-1.5 text-slate-400">{{ i + 1 }}</td>
                @for (cell of row; track $index) {
                  <td class="px-3 py-1.5 text-slate-800 whitespace-nowrap">{{ cell }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
        <p class="px-3 py-2 text-xs text-slate-400 border-t border-slate-200">
          Exibindo {{ preview()!.linhas.length }} de {{ preview()!.total_linhas }} linhas —
          aba: <span class="font-mono">{{ preview()!.aba_selecionada }}</span>
        </p>
      </div>
    } @else {
      <div class="text-center py-6 border border-dashed border-slate-200 text-sm text-slate-400">
        Carregue um arquivo Excel e clique em "Pré-visualizar" para ver os dados.
      </div>
    }
  `,
})
export class ExcelPreviewTableComponent {
  preview = input<PreviewExcelResponse | null>(null);
}
