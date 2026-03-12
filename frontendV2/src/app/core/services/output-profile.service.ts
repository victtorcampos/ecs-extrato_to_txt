import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { OutputProfile, OutputProfileListParams } from '../models/output-profile.model';

@Injectable({ providedIn: 'root' })
export class OutputProfileService {
  private readonly api = inject(ApiService);

  list(params?: OutputProfileListParams): Observable<OutputProfile[]> {
    return this.api.get<OutputProfile[]>('/output-profiles', params as Record<string, string>);
  }

  sistemas(): Observable<string[]> {
    return this.api.get<string[]>('/output-profiles/sistemas-disponiveis');
  }

  get(id: string): Observable<OutputProfile> {
    return this.api.get<OutputProfile>(`/output-profiles/${id}`);
  }

  create(body: Partial<OutputProfile>): Observable<OutputProfile> {
    return this.api.post<OutputProfile>('/output-profiles', body);
  }

  update(id: string, body: Partial<OutputProfile>): Observable<OutputProfile> {
    return this.api.put<OutputProfile>(`/output-profiles/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/output-profiles/${id}`);
  }
}
