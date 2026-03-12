import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { ImportLayout, ImportLayoutListParams } from '../models/import-layout.model';

@Injectable({ providedIn: 'root' })
export class ImportLayoutService {
  private readonly api = inject(ApiService);

  list(params?: ImportLayoutListParams): Observable<ImportLayout[]> {
    return this.api.get<{ items: ImportLayout[]; total: number; cnpjs_disponiveis: string[] }>(
      '/import-layouts',
      params as Record<string, string>
    ).pipe(map(r => r.items));
  }

  cnpjs(): Observable<string[]> {
    return this.api.get<string[]>('/import-layouts/cnpjs');
  }

  get(id: string): Observable<ImportLayout> {
    return this.api.get<ImportLayout>(`/import-layouts/${id}`);
  }

  create(body: Partial<ImportLayout>): Observable<ImportLayout> {
    return this.api.post<ImportLayout>('/import-layouts', body);
  }

  update(id: string, body: Partial<ImportLayout>): Observable<ImportLayout> {
    return this.api.put<ImportLayout>(`/import-layouts/${id}`, body);
  }

  clone(id: string): Observable<ImportLayout> {
    return this.api.post<ImportLayout>(`/import-layouts/${id}/clone`, {});
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/import-layouts/${id}`);
  }
}
