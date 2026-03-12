import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { Regra, RegraCreateRequest, RegraListResponse } from '../models/regra.model';

@Injectable({ providedIn: 'root' })
export class RegraService {
  private readonly api = inject(ApiService);

  private base(layoutId: string): string {
    return `/import-layouts/${layoutId}/rules`;
  }

  list(layoutId: string, apenasAtivas = false): Observable<Regra[]> {
    return this.api.get<RegraListResponse>(
      this.base(layoutId),
      apenasAtivas ? { apenas_ativas: true } : undefined
    ).pipe(map(r => r.items));
  }

  get(layoutId: string, regraId: string): Observable<Regra> {
    return this.api.get<Regra>(`${this.base(layoutId)}/${regraId}`);
  }

  create(layoutId: string, body: RegraCreateRequest): Observable<Regra> {
    return this.api.post<Regra>(this.base(layoutId), body);
  }

  update(layoutId: string, regraId: string, body: Partial<RegraCreateRequest>): Observable<Regra> {
    return this.api.put<Regra>(`${this.base(layoutId)}/${regraId}`, body);
  }

  delete(layoutId: string, regraId: string): Observable<void> {
    return this.api.delete<void>(`${this.base(layoutId)}/${regraId}`);
  }

  reorder(layoutId: string, ids: string[]): Observable<void> {
    return this.api.put<void>(`${this.base(layoutId)}/reorder`, { ids });
  }
}
