import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { TopbarComponent } from './topbar.component';
import { ToastOutletComponent } from '../toast/toast.component';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, ToastOutletComponent],
  template: `
    <div class="flex h-screen overflow-hidden bg-surface">
      <!-- Sidebar -->
      <app-sidebar
        [collapsed]="sidebarCollapsed()"
        (toggleCollapse)="sidebarCollapsed.update(v => !v)"
      />

      <!-- Main column -->
      <div class="flex flex-col flex-1 overflow-hidden min-w-0">
        <app-topbar />

        <main class="flex-1 overflow-auto p-8" id="main-content">
          <router-outlet />
        </main>
      </div>
    </div>

    <!-- Toast notifications -->
    <app-toast-outlet />
  `,
})
export class ShellComponent {
  sidebarCollapsed = signal(false);
}
