import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type StatCardIcon = 'layers' | 'check-circle' | 'clock' | 'loader' | 'alert-circle';

@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">
            {{ label() }}
          </p>
          <p class="font-mono text-3xl font-bold text-slate-900">
            {{ value() }}
          </p>
        </div>
        <div [class]="iconWrapperClass()" class="p-2 rounded-sm">
          @switch (icon()) {
            @case ('check-circle') {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
              </svg>
            }
            @case ('clock') {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            }
            @case ('loader') {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
              </svg>
            }
            @default {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
              </svg>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class StatCardComponent {
  label = input.required<string>();
  value = input.required<number | string>();
  icon = input<StatCardIcon>('layers');
  variant = input<'default' | 'success' | 'warning' | 'info' | 'error'>('default');

  iconWrapperClass() {
    const map: Record<string, string> = {
      success: 'bg-emerald-50 text-emerald-600',
      warning: 'bg-amber-50 text-amber-600',
      info:    'bg-blue-50 text-blue-600',
      error:   'bg-red-50 text-red-600',
      default: 'bg-slate-100 text-slate-600',
    };
    return map[this.variant()] ?? map['default'];
  }
}
