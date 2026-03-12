import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { Lote, LoteCreateRequest, LoteEstatisticas, LoteListParams } from '../models/lote.model';

@Injectable({ providedIn: 'root' })
export class LoteService {
  private readonly api = inject(ApiService);

  list(params?: LoteListParams): Observable<Lote[]> {
    return this.api.get<Lote[]>('/lotes', params as Record<string, string>);
  }

  estatisticas(cnpj?: string): Observable<LoteEstatisticas> {
    return this.api.get<{ total: number; por_status: Record<string, number> }>(
      '/lotes/estatisticas',
      cnpj ? { cnpj } : undefined
    ).pipe(
      map(r => ({
        total: r.total,
        concluidos: r.por_status['concluido'] ?? 0,
        pendentes: r.por_status['pendente'] ?? 0,
        processando: r.por_status['processando'] ?? 0,
      }))
    );
  }

  get(id: string): Observable<Lote> {
    return this.api.get<Lote>(`/lotes/${id}`);
  }

  create(req: LoteCreateRequest): Observable<Lote> {
    return this.api.post<Lote>('/lotes', req);
  }

  reprocessar(id: string): Observable<Lote> {
    return this.api.post<Lote>(`/lotes/${id}/reprocessar`, {});
  }

  resolverPendencias(id: string, resolucoes: unknown): Observable<Lote> {
    return this.api.post<Lote>(`/lotes/${id}/resolver-pendencias`, resolucoes);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/lotes/${id}`);
  }

  downloadUrl(id: string): string {
    return `/api/v1/lotes/${id}/download`;
  }
}
