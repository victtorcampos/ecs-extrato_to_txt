import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LoteStatus } from '../../../core/models/lote.model';
import { StatusLabelPipe } from '../../pipes/status-label.pipe';

type BadgeVariant = LoteStatus | 'default';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  CONCLUIDO:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  PENDENTE:    'bg-amber-50 text-amber-700 border border-amber-200',
  PROCESSANDO: 'bg-blue-50 text-blue-700 border border-blue-200',
  ERRO:        'bg-red-50 text-red-700 border border-red-200',
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
  value = input.required<BadgeVariant | string>();

  classes = computed(() => {
    const v = this.value() as BadgeVariant;
    return VARIANT_CLASSES[v] ?? VARIANT_CLASSES['default'];
  });
}
