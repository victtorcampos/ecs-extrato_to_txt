import { Routes } from '@angular/router';
import { ShellComponent } from './shared/components/shell/shell.component';
import { sessionGuard } from './core/guards/session.guard';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'extrato',
        canActivate: [sessionGuard],
        loadChildren: () =>
          import('./features/extrato/extrato.routes').then(m => m.extratoRoutes),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
