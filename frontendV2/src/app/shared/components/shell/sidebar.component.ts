import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  label: string;
  route: string;
  icon: 'home' | 'file-text';
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', route: '/dashboard', icon: 'home' },
  { label: 'Extrato to TXT', route: '/extrato', icon: 'file-text' },
];

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  host: {
    class: 'flex flex-col h-full bg-surface border-r border-slate-200 transition-[width] duration-300 overflow-hidden shrink-0',
    '[class.w-64]': '!collapsed()',
    '[class.w-16]': 'collapsed()',
  },
  template: `
    <!-- Logo area -->
    <div class="flex items-center gap-3 px-4 h-16 border-b border-slate-200 shrink-0">
      <div class="w-8 h-8 bg-slate-900 flex items-center justify-center shrink-0">
        <span class="text-white text-xs font-bold font-mono">EC</span>
      </div>
      @if (!collapsed()) {
        <span class="font-bold text-slate-900 text-sm tracking-tight whitespace-nowrap">
          ECS Extrato
        </span>
      }
    </div>

    <!-- Navigation -->
    <nav class="flex-1 py-4 px-2 space-y-1" aria-label="Menu principal">
      @for (item of navItems; track item.route) {
        <a
          [routerLink]="item.route"
          routerLinkActive="bg-slate-900 text-white"
          [routerLinkActiveOptions]="{ exact: false }"
          class="flex items-center gap-3 px-3 py-2.5 rounded-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-150 group"
          [attr.aria-label]="collapsed() ? item.label : null"
          [attr.title]="collapsed() ? item.label : null"
          data-testid="nav-item"
        >
          <span class="shrink-0" aria-hidden="true">
            @switch (item.icon) {
              @case ('home') {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              }
              @case ('file-text') {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              }
            }
          </span>
          @if (!collapsed()) {
            <span class="text-sm font-medium whitespace-nowrap">{{ item.label }}</span>
          }
        </a>
      }
    </nav>

    <!-- Collapse toggle -->
    <div class="px-2 pb-4 border-t border-slate-200 pt-3 shrink-0">
      <button
        (click)="toggleCollapse.emit()"
        class="w-full flex items-center justify-center p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-sm transition-colors duration-150"
        [attr.aria-label]="collapsed() ? 'Expandir menu' : 'Recolher menu'"
        data-testid="sidebar-toggle"
      >
        @if (collapsed()) {
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        } @else {
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        }
      </button>
    </div>
  `,
})
export class SidebarComponent {
  collapsed = input<boolean>(false);
  toggleCollapse = output<void>();
  readonly navItems = NAV_ITEMS;
}
