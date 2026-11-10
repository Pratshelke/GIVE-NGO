/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

type Mode = 'light' | 'dark'
type Ctx = { theme: Mode; toggle: () => void }
const ThemeCtx = createContext<Ctx>({ theme: 'light', toggle: () => {} })
const KEY = 'givengo-theme'

function systemTheme(): Mode {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
function stored(): Mode | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'dark' || v === 'light' ? v : null
  } catch {
    return null
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [explicit, setExplicit] = useState<Mode | null>(stored)
  const [system, setSystem] = useState<Mode>(systemTheme)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    const on = () => setSystem(mq.matches ? 'dark' : 'light')
    mq?.addEventListener?.('change', on)
    // Respect a theme chosen by the host page (e.g. an embedding viewer)
    const host = document.documentElement.getAttribute('data-theme')
    if (!explicit && (host === 'dark' || host === 'light')) setSystem(host)
    return () => mq?.removeEventListener?.('change', on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const theme = explicit ?? system
  useEffect(() => {
    if (explicit) document.documentElement.setAttribute('data-theme', explicit)
  }, [explicit])

  const toggle = useCallback(() => {
    const next: Mode = theme === 'dark' ? 'light' : 'dark'
    setExplicit(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* ignore */
    }
  }, [theme])

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => useContext(ThemeCtx)
