import { Injectable, signal } from '@angular/core';

export interface CnpjSession {
  cnpj: string;
  label: string;
  setAt: string;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly STORAGE_KEY = 'ecs_active_session';

  private _activeSession = signal<CnpjSession | null>(null);
  readonly activeSession = this._activeSession.asReadonly();

  loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CnpjSession;
        this._activeSession.set(parsed);
      }
    } catch {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  setSession(session: CnpjSession): void {
    const s: CnpjSession = { ...session, setAt: new Date().toISOString() };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(s));
    this._activeSession.set(s);
  }

  clearSession(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this._activeSession.set(null);
  }
}
