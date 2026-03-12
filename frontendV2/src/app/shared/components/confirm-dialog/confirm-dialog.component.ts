import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="'dialog-title'"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/40 backdrop-blur-sm"
          (click)="onCancel()"
          aria-hidden="true"
        ></div>

        <!-- Panel -->
        <div class="relative bg-white border border-slate-200 shadow-xl w-full max-w-md mx-4 p-6">
          <h2 id="dialog-title" class="text-lg font-semibold text-slate-900 mb-2 font-heading">
            {{ title() }}
          </h2>
          <p class="text-sm text-slate-600 mb-6">{{ message() }}</p>

          <div class="flex justify-end gap-3">
            <button
              type="button"
              (click)="onCancel()"
              class="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 bg-white hover:bg-slate-50 transition-colors duration-150"
              data-testid="confirm-cancel"
            >
              {{ cancelLabel() }}
            </button>
            <button
              type="button"
              (click)="onConfirm()"
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors duration-150"
              data-testid="confirm-ok"
            >
              {{ confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  open = input<boolean>(false);
  title = input<string>('Confirmar ação');
  message = input<string>('Tem certeza que deseja continuar?');
  confirmLabel = input<string>('Confirmar');
  cancelLabel = input<string>('Cancelar');

  confirmed = output<void>();
  cancelled = output<void>();

  onConfirm(): void { this.confirmed.emit(); }
  onCancel(): void { this.cancelled.emit(); }
}
