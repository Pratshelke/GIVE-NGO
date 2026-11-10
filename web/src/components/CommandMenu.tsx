/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CornerDownLeft, Home, LayoutDashboard, LogIn, LogOut, MapPinned, Moon, PlusCircle, RotateCcw, Search, Store, Sun, User, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../lib/theme'
import { api, DEMO_MODE } from '../lib/axios'
import { DEMO_ACCOUNTS } from '../lib/demo/store'
import { useToast } from './Toast'

type Cmd = { id: string; group: string; label: string; hint?: string; icon: LucideIcon; run: () => void }
const Ctx = createContext<() => void>(() => {})
export const useCommandMenu = () => useContext(Ctx)

export function CommandMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const show = useCallback(() => setOpen(true), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <Ctx.Provider value={show}>
      {children}
      <AnimatePresence>{open && <Palette onClose={() => setOpen(false)} />}</AnimatePresence>
    </Ctx.Provider>
  )
}

function Palette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { user, login, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => inputRef.current?.focus(), [])

  const cmds = useMemo<Cmd[]>(() => {
    const go = (to: string) => () => navigate(to)
    const list: Cmd[] = [{ id: 'home', group: 'Go to', label: 'Home', icon: Home, run: go('/') }, { id: 'map', group: 'Go to', label: 'Live map', icon: MapPinned, run: go('/map') }]
    if (user?.role === 'Donor') {
      list.unshift({ id: 'donate', group: 'Actions', label: 'Donate food', hint: 'Post a new donation', icon: PlusCircle, run: go('/donor/create') })
      list.push({ id: 'dash', group: 'Go to', label: 'My donations', icon: LayoutDashboard, run: go('/donor') })
    }
    if (user?.role === 'NGO') list.push({ id: 'dash', group: 'Go to', label: 'Pickups', icon: LayoutDashboard, run: go('/ngo') })
    if (user) {
      list.push({ id: 'profile', group: 'Go to', label: 'Profile & location', icon: User, run: go('/profile') })
      list.push({ id: 'logout', group: 'Account', label: 'Log out', icon: LogOut, run: () => (logout(), navigate('/')) })
    } else {
      list.push({ id: 'login', group: 'Account', label: 'Log in', icon: LogIn, run: go('/login') })
      list.push({ id: 'join', group: 'Account', label: 'Create an account', icon: Users, run: go('/register') })
    }
    list.push({ id: 'theme', group: 'Preferences', label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', icon: theme === 'dark' ? Sun : Moon, run: toggle })
    if (DEMO_MODE) {
      list.push({ id: 'as-donor', group: 'Demo', label: 'View as donor', hint: 'Annapurna Kitchens', icon: Store, run: async () => (await login(DEMO_ACCOUNTS.donor.email, DEMO_ACCOUNTS.donor.password), navigate('/donor')) })
      list.push({ id: 'as-ngo', group: 'Demo', label: 'View as NGO', hint: 'Seva Food Bank', icon: Users, run: async () => (await login(DEMO_ACCOUNTS.ngo.email, DEMO_ACCOUNTS.ngo.password), navigate('/ngo')) })
      list.push({ id: 'reset', group: 'Demo', label: 'Reset sample data', icon: RotateCcw, run: async () => (await api.post('/demo/reset'), logout(), navigate('/'), toast('Sample data restored.')) })
    }
    return list
  }, [user, theme, navigate, logout, login, toggle, toast])

  const filtered = cmds.filter((c) => (c.label + ' ' + (c.hint ?? '') + ' ' + c.group).toLowerCase().includes(q.toLowerCase()))
  const run = (c?: Cmd) => {
    if (!c) return
    onClose()
    c.run()
  }
  let lastGroup = ''

  return (
    <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.div
        className="cmdk"
        role="dialog"
        aria-label="Command menu"
        initial={{ opacity: 0, y: -12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="cmdk-input">
          <Search />
          <input
            id="cmdk-q"
            ref={inputRef}
            value={q}
            placeholder="Search actions and pages…"
            onChange={(e) => {
              setQ(e.target.value)
              setIdx(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setIdx((i) => Math.min(filtered.length - 1, i + 1))
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setIdx((i) => Math.max(0, i - 1))
              }
              if (e.key === 'Enter') run(filtered[idx])
              if (e.key === 'Escape') onClose()
            }}
          />
          <span className="kbd">esc</span>
        </div>
        <div className="cmdk-list">
          {filtered.length === 0 && <p className="muted small" style={{ padding: 16 }}>Nothing matches “{q}”.</p>}
          {filtered.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null
            lastGroup = c.group
            const Icon = c.icon
            return (
              <div key={c.id}>
                {header && <div className="cmdk-group eyebrow">{header}</div>}
                <button className="pop-item" data-active={i === idx} onMouseEnter={() => setIdx(i)} onClick={() => run(c)} style={{ width: '100%', alignItems: 'center' }}>
                  <span className="ico"><Icon /></span>
                  <span className="grow">
                    <span style={{ fontWeight: 700 }}>{c.label}</span>
                    {c.hint && <span className="muted small"> · {c.hint}</span>}
                  </span>
                  {i === idx && <CornerDownLeft size={15} className="muted" />}
                </button>
              </div>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}
