import { createContext, useState, useCallback, type ReactNode } from 'react'
import type { User, LoginRequest } from '../services/schemas'
import { api } from '@/lib/api-client'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  login: (data: LoginRequest) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('ecs_user')
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser)

  const login = useCallback(async (data: LoginRequest) => {
    const res = await api.post<{ access_token: string; user: User }>('/auth/login', data)
    localStorage.setItem('ecs_token', res.access_token)
    localStorage.setItem('ecs_user', JSON.stringify(res.user))
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('ecs_token')
    localStorage.removeItem('ecs_user')
    setUser(null)
  }, [])

  return (
    <AuthContext value={{ user, isAuthenticated: user !== null, login, logout }}>
      {children}
    </AuthContext>
  )
}
