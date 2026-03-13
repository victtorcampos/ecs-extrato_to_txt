import { useState, useCallback } from 'react'

export interface CnpjSession {
  cnpj: string
  label: string
  setAt: string
}

const STORAGE_KEY = 'ecs_active_session'

export const CNPJS_DISPONIVEIS = [
  { cnpj: '12345678000190', label: 'Empresa Alpha Ltda' },
  { cnpj: '98765432000154', label: 'Beta Comércio SA' },
  { cnpj: '11222333000181', label: 'Gama Serviços ME' },
]

function load(): CnpjSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CnpjSession) : null
  } catch {
    return null
  }
}

export function useSession() {
  const [session, setSession] = useState<CnpjSession | null>(load)

  const setActive = useCallback((cnpj: string, label: string) => {
    const s: CnpjSession = { cnpj, label, setAt: new Date().toISOString() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    setSession(s)
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }, [])

  return { session, setActive, clearSession }
}
