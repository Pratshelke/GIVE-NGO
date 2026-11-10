import axios from 'axios'
import { demoAdapter } from './demo/adapter'

/**
 * Demo mode (default): the whole API runs inside the browser — no server,
 * database or API keys needed. Set VITE_API_URL to talk to the real Express
 * backend in /server instead (and VITE_DEMO=false to force it off).
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO === 'true' || (!import.meta.env.VITE_API_URL && import.meta.env.VITE_DEMO !== 'false')

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  ...(DEMO_MODE ? { adapter: demoAdapter } : {}),
})

const TOKEN_KEY = 'token'
export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (t: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, t)
    } catch {
      /* private mode */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* private mode */
    }
  },
}

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && !String(error.config?.url).startsWith('/auth/')) {
      tokenStore.clear()
      if (!window.location.hash.includes('/login')) window.location.hash = '#/login'
    }
    return Promise.reject(error)
  },
)

export function errorMessage(err: unknown, fallback = 'Something went wrong') {
  const e = err as { response?: { data?: { message?: string } }; message?: string }
  return e?.response?.data?.message || e?.message || fallback
}
