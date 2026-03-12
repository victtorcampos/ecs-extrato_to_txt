import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import {
  ImportLayout, ImportLayoutCompleto, ImportLayoutListParams,
  PreviewExcelRequest, PreviewExcelResponse,
  DetectarLayoutRequest, DetectarLayoutResponse,
  TestParseRequest, TestParseResponse,
  CamposDisponiveisResponse,
} from '../models/import-layout.model';

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

  get(id: string): Observable<ImportLayoutCompleto> {
    return this.api.get<ImportLayoutCompleto>(`/import-layouts/${id}`);
  }

  create(body: Partial<ImportLayoutCompleto>): Observable<ImportLayoutCompleto> {
    return this.api.post<ImportLayoutCompleto>('/import-layouts', body);
  }

  update(id: string, body: Partial<ImportLayoutCompleto>): Observable<ImportLayoutCompleto> {
    return this.api.put<ImportLayoutCompleto>(`/import-layouts/${id}`, body);
  }

  clone(id: string): Observable<ImportLayout> {
    return this.api.post<ImportLayout>(`/import-layouts/${id}/clone`, {});
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/import-layouts/${id}`);
  }

  camposDisponiveis(): Observable<CamposDisponiveisResponse> {
    return this.api.get<CamposDisponiveisResponse>('/import-layouts/campos-disponiveis');
  }

  previewExcel(req: PreviewExcelRequest): Observable<PreviewExcelResponse> {
    return this.api.post<PreviewExcelResponse>('/import-layouts/preview-excel', req);
  }

  detectarLayout(req: DetectarLayoutRequest): Observable<DetectarLayoutResponse> {
    return this.api.post<DetectarLayoutResponse>('/import-layouts/detect', req);
  }

  testParse(req: TestParseRequest): Observable<TestParseResponse> {
    return this.api.post<TestParseResponse>('/import-layouts/test-parse', req);
  }
}
