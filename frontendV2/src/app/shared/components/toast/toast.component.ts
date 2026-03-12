import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none',
    'aria-live': 'polite',
    'aria-atomic': 'false',
  },
  template: `
    @for (toast of toastService.toasts(); track toast.id) {
      <div
        role="alert"
        [class]="toastClass(toast.type)"
        class="flex items-start gap-3 px-4 py-3 shadow-lg border max-w-sm pointer-events-auto"
      >
        <span [class]="iconClass(toast.type)" class="mt-0.5 shrink-0" aria-hidden="true">
          @switch (toast.type) {
            @case ('success') { ✓ }
            @case ('error') { ✕ }
            @case ('warning') { ⚠ }
            @default { ℹ }
          }
        </span>
        <p class="text-sm font-medium flex-1">{{ toast.message }}</p>
        <button
          (click)="toastService.dismiss(toast.id)"
          class="text-current opacity-50 hover:opacity-100 transition-opacity duration-150 shrink-0"
          [attr.aria-label]="'Fechar notificação'"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    }
  `,
})
export class ToastOutletComponent {
  readonly toastService = inject(ToastService);

  toastClass(type: string): string {
    const map: Record<string, string> = {
      success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      error:   'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-amber-50 border-amber-200 text-amber-800',
      info:    'bg-blue-50 border-blue-200 text-blue-800',
    };
    return map[type] ?? map['info'];
  }

  iconClass(type: string): string {
    const map: Record<string, string> = {
      success: 'text-emerald-600',
      error:   'text-red-600',
      warning: 'text-amber-600',
      info:    'text-blue-600',
    };
    return map[type] ?? map['info'];
  }
}
