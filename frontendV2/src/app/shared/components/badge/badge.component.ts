import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LoteStatus } from '../../../core/models/lote.model';
import { StatusLabelPipe } from '../../pipes/status-label.pipe';

const VARIANT_CLASSES: Record<string, string> = {
  concluido:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  pendente:    'bg-amber-50 text-amber-700 border border-amber-200',
  processando: 'bg-blue-50 text-blue-700 border border-blue-200',
  aguardando:  'bg-slate-100 text-slate-600 border border-slate-200',
  erro:        'bg-red-50 text-red-700 border border-red-200',
  default:     'bg-slate-50 text-slate-700 border border-slate-200',
};

@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusLabelPipe],
  template: `
    <span
      [class]="classes()"
      class="inline-flex items-center px-2 py-0.5 text-xs font-medium font-mono rounded-sm"
    >
      {{ value() | statusLabel }}
    </span>
  `,
})
export class BadgeComponent {
  value = input.required<LoteStatus | string>();

  classes = computed(() => {
    const v = this.value();
    return VARIANT_CLASSES[v] ?? VARIANT_CLASSES['default'];
  });
}
