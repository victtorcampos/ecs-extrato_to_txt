import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { CnpjPipe } from '../../shared/pipes/cnpj.pipe';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CnpjPipe],
  template: `
    <div class="max-w-7xl mx-auto">

      <!-- Header -->
      <div class="mb-10">
        <p class="text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">Painel</p>
        <h1 class="text-4xl font-bold tracking-tight text-slate-900">
          Bem-vindo ao ECS
        </h1>
        <p class="mt-2 text-base text-slate-500">
          Sistema de conversão de extratos bancários para TXT contábil.
        </p>
      </div>

      <!-- Session status -->
      @if (sessionService.activeSession(); as session) {
        <div class="mb-8 p-4 bg-emerald-50 border border-emerald-200 flex items-center gap-3">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
          <div>
            <p class="text-sm font-medium text-emerald-800">Sessão ativa</p>
            <p class="text-xs text-emerald-600 font-mono mt-0.5">
              CNPJ: {{ session.cnpj | cnpj }}
            </p>
          </div>
        </div>
      } @else {
        <div class="mb-8 p-4 bg-amber-50 border border-amber-200 flex items-start gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-600 shrink-0 mt-0.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <p class="text-sm font-medium text-amber-800">Nenhuma sessão ativa</p>
            <p class="text-xs text-amber-700 mt-0.5">
              Selecione um CNPJ no menu superior para acessar o módulo Extrato to TXT.
            </p>
          </div>
        </div>
      }

      <!-- Bento grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

        <!-- Card principal: Extrato to TXT -->
        <div class="md:col-span-2 bg-white border border-slate-200 p-8 shadow-sm group">
          <div class="flex items-start justify-between mb-6">
            <div class="p-3 bg-slate-900">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
          </div>
          <h2 class="text-2xl font-bold text-slate-900 mb-2">Extrato to TXT</h2>
          <p class="text-sm text-slate-500 mb-6 leading-relaxed">
            Faça upload de extratos bancários em Excel e converta-os automaticamente para o formato TXT contábil configurado.
          </p>
          <a
            routerLink="/extrato"
            class="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors duration-150"
            data-testid="go-extrato"
          >
            Acessar módulo
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>
        </div>

        <!-- Card: Como funciona -->
        <div class="bg-slate-50 border border-slate-200 p-6 shadow-sm">
          <h3 class="text-sm font-semibold text-slate-900 uppercase tracking-widest mb-4">Como funciona</h3>
          <ol class="space-y-4">
            @for (step of steps; track step.n) {
              <li class="flex items-start gap-3">
                <span class="flex-shrink-0 w-6 h-6 bg-slate-200 text-slate-700 text-xs font-bold font-mono flex items-center justify-center">
                  {{ step.n }}
                </span>
                <div>
                  <p class="text-sm font-medium text-slate-800">{{ step.title }}</p>
                  <p class="text-xs text-slate-500 mt-0.5">{{ step.desc }}</p>
                </div>
              </li>
            }
          </ol>
        </div>
      </div>

      <!-- Quick links -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        @for (link of quickLinks; track link.label) {
          <a
            [routerLink]="link.route"
            class="flex items-center gap-4 p-4 bg-white border border-slate-200 hover:border-slate-400 hover:shadow-sm transition-all duration-150 group"
            data-testid="quick-link"
          >
            <div class="p-2 bg-slate-100 group-hover:bg-slate-900 transition-colors duration-150">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" [attr.stroke]="'currentColor'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                   class="text-slate-600 group-hover:text-white transition-colors duration-150" aria-hidden="true">
                <path [attr.d]="link.iconPath"/>
              </svg>
            </div>
            <span class="text-sm font-medium text-slate-700 group-hover:text-slate-900">{{ link.label }}</span>
          </a>
        }
      </div>
    </div>
  `,
})
export class DashboardComponent {
  readonly sessionService = inject(SessionService);

  readonly steps = [
    { n: 1, title: 'Selecione o CNPJ', desc: 'Escolha a empresa no menu superior' },
    { n: 2, title: 'Faça o upload', desc: 'Envie o arquivo Excel do extrato' },
    { n: 3, title: 'Configure o layout', desc: 'Associe as colunas aos campos contábeis' },
    { n: 4, title: 'Baixe o TXT', desc: 'Arquivo pronto para importação' },
  ];

  readonly quickLinks = [
    { label: 'Upload de Extrato', route: '/extrato/upload', iconPath: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12' },
    { label: 'Lotes Recentes', route: '/extrato/lotes', iconPath: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
    { label: 'Configurações', route: '/extrato/mapeamento', iconPath: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
  ];
}
