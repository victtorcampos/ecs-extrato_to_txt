import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { AccountMapping, AccountMappingListParams } from '../models/account-mapping.model';

@Injectable({ providedIn: 'root' })
export class AccountMappingService {
  private readonly api = inject(ApiService);

  list(params?: AccountMappingListParams): Observable<AccountMapping[]> {
    return this.api.get<{ items: AccountMapping[]; total: number; cnpjs_disponiveis: string[] }>(
      '/account-mappings',
      params as Record<string, string>
    ).pipe(map(r => r.items));
  }

  get(id: string): Observable<AccountMapping> {
    return this.api.get<AccountMapping>(`/account-mappings/${id}`);
  }

  create(body: Partial<AccountMapping>): Observable<AccountMapping> {
    return this.api.post<AccountMapping>('/account-mappings', body);
  }

  update(id: string, body: Partial<AccountMapping>): Observable<AccountMapping> {
    return this.api.put<AccountMapping>(`/account-mappings/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/account-mappings/${id}`);
  }
}
