import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Lote, LoteCreateRequest, LoteEstatisticas, LoteListParams } from '../models/lote.model';

@Injectable({ providedIn: 'root' })
export class LoteService {
  private readonly api = inject(ApiService);

  list(params?: LoteListParams): Observable<Lote[]> {
    return this.api.get<Lote[]>('/lotes', params as Record<string, string>);
  }

  estatisticas(cnpj?: string): Observable<LoteEstatisticas> {
    return this.api.get<LoteEstatisticas>('/lotes/estatisticas', cnpj ? { cnpj } : undefined);
  }

  get(id: string): Observable<Lote> {
    return this.api.get<Lote>(`/lotes/${id}`);
  }

  create(req: LoteCreateRequest): Observable<Lote> {
    const fd = new FormData();
    fd.append('cnpj', req.cnpj);
    fd.append('import_layout_id', req.import_layout_id);
    fd.append('output_profile_id', req.output_profile_id);
    fd.append('arquivo', req.arquivo);
    return this.api.postForm<Lote>('/lotes', fd);
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
