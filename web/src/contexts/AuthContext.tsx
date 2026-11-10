import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, tokenStore } from '../lib/axios'
import type { GeoPoint, Role, User } from '../lib/types'

export type RegisterInput = {
  name: string
  email: string
  password: string
  role: Role
  phoneNumber: string
  address?: string
  location?: GeoPoint
}

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null)
      return
    }
    try {
      const res = await api.get('/auth/me')
      setUser(res.data.user)
    } catch {
      tokenStore.clear()
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    tokenStore.set(res.data.token)
    setUser(res.data.user)
    return res.data.user as User
  }

  const register = async (input: RegisterInput) => {
    const payload: RegisterInput = { ...input }
    if (input.role !== 'NGO' && !input.location) {
      delete payload.location
    }
    const res = await api.post('/auth/register', payload)
    tokenStore.set(res.data.token)
    setUser(res.data.user)
    return res.data.user as User
  }

  const logout = () => {
    tokenStore.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
