import { Routes } from '@angular/router';
import { ExtratoShellComponent } from './extrato-shell.component';

export const extratoRoutes: Routes = [
  {
    path: '',
    component: ExtratoShellComponent,
    children: [
      { path: '', redirectTo: 'upload', pathMatch: 'full' },
      {
        path: 'upload',
        loadComponent: () =>
          import('./upload/upload.component').then(m => m.UploadComponent),
      },
      {
        path: 'lotes',
        loadComponent: () =>
          import('./lotes/lotes.component').then(m => m.LotesComponent),
      },
      {
        path: 'lotes/:id',
        loadComponent: () =>
          import('./lotes/lote-detail.component').then(m => m.LoteDetailComponent),
      },
      {
        path: 'mapeamento',
        loadComponent: () =>
          import('./mapeamento/mapeamento.component').then(m => m.MapeamentoComponent),
      },
      {
        path: 'import-layout',
        loadComponent: () =>
          import('./import-layout/import-layout.component').then(m => m.ImportLayoutComponent),
      },
      {
        path: 'output-layout',
        loadComponent: () =>
          import('./output-layout/output-layout.component').then(m => m.OutputLayoutComponent),
      },
    ],
  },
];
