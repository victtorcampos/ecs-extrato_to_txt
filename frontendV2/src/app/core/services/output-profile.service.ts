import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { OutputProfile, OutputProfileListParams, OutputSistema } from '../models/output-profile.model';

@Injectable({ providedIn: 'root' })
export class OutputProfileService {
  private readonly api = inject(ApiService);

  list(params?: OutputProfileListParams): Observable<OutputProfile[]> {
    return this.api.get<{ items: OutputProfile[]; total: number }>(
      '/output-profiles',
      params as Record<string, string>
    ).pipe(map(r => r.items));
  }

  sistemas(): Observable<OutputSistema[]> {
    return this.api.get<{ sistemas: OutputSistema[]; geradores_implementados: string[] }>(
      '/output-profiles/sistemas-disponiveis'
    ).pipe(map(r => r.sistemas));
  }

  get(id: string): Observable<OutputProfile> {
    return this.api.get<OutputProfile>(`/output-profiles/${id}`);
  }

  create(body: Record<string, unknown>): Observable<OutputProfile> {
    return this.api.post<OutputProfile>('/output-profiles', body);
  }

  update(id: string, body: Record<string, unknown>): Observable<OutputProfile> {
    return this.api.put<OutputProfile>(`/output-profiles/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/output-profiles/${id}`);
  }
}
