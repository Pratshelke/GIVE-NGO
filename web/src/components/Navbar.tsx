import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api, DEMO_MODE } from '../lib/axios'
import { timeAgo, useLiveQuery } from '../lib/hooks'
import type { Notification } from '../lib/types'
import { BellIcon, initials, Logo } from './ui'
import { useToast } from './Toast'

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onOutside])
  return ref
}

function Notifications() {
  const navigate = useNavigate()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  const seen = useRef<Set<string> | null>(null)
  const { data } = useLiveQuery(async () => {
    const r = await api.get('/notifications')
    return r.data.notifications as Notification[]
  }, [], 4000)
  const list = data ?? []
  const unread = list.filter((n) => !n.read).length

  // Surface brand-new notifications as toasts
  useEffect(() => {
    if (!data) return
    if (seen.current) {
      for (const n of data) if (!seen.current.has(n._id) && !n.read) toast(n.text, 'info')
    }
    seen.current = new Set(data.map((n) => n._id))
  }, [data, toast])

  const toggle = async () => {
    setOpen((o) => !o)
    if (!open && unread) await api.post('/notifications/read').catch(() => {})
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="icon-btn" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={toggle}>
        <BellIcon />
        {unread > 0 && <span className="dot-badge">{unread}</span>}
      </button>
      {open && (
        <div className="popover" role="menu">
          <div className="eyebrow" style={{ padding: '6px 12px' }}>
            Updates
          </div>
          {list.length === 0 && <p className="muted small" style={{ padding: '6px 12px 12px' }}>No updates yet.</p>}
          {list.slice(0, 8).map((n) => (
            <button
              key={n._id}
              className={`item ${n.read ? '' : 'unread'}`}
              onClick={() => {
                setOpen(false)
                if (n.link) navigate(n.link)
              }}
            >
              <span style={{ fontWeight: 600 }}>{n.text}</span>
              <span className="muted small">{timeAgo(n.createdAt)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useClickOutside(() => setOpen(false))
  if (!user) return null
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="avatar" aria-label="Account menu" onClick={() => setOpen((o) => !o)}>
        {initials(user.name)}
      </button>
      {open && (
        <div className="popover" role="menu" style={{ width: 240 }}>
          <div style={{ padding: '8px 12px' }}>
            <div style={{ fontWeight: 700 }}>{user.name}</div>
            <div className="muted small">
              {user.role === 'NGO' ? 'NGO partner' : 'Donor'} · {user.email}
            </div>
          </div>
          <hr className="divider" />
          <button className="item" onClick={() => (setOpen(false), navigate('/profile'))}>
            Profile & location
          </button>
          <button
            className="item"
            onClick={() => {
              setOpen(false)
              logout()
              navigate('/')
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

export function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const links = !user
    ? [
        { to: '/', label: 'How it works' },
        { to: '/map', label: 'Live map' },
      ]
    : user.role === 'Donor'
      ? [
          { to: '/donor', label: 'My donations' },
          { to: '/donor/create', label: 'Donate food' },
          { to: '/map', label: 'Live map' },
        ]
      : [
          { to: '/ngo', label: 'Pickups' },
          { to: '/map', label: 'Live map' },
        ]

  return (
    <header className="nav">
      <div className="container nav-inner">
        <button className="brand" onClick={() => navigate(user ? (user.role === 'NGO' ? '/ngo' : '/donor') : '/')}>
          <span className="brand-mark">
            <Logo />
          </span>
          GiveNGo
        </button>
        <nav className="nav-links" aria-label="Main">
          {links.map((l) => (
            <button key={l.to} className={`nav-link ${pathname === l.to ? 'active' : ''}`} onClick={() => navigate(l.to)}>
              {l.label}
            </button>
          ))}
        </nav>
        <div className="nav-right">
          {user ? (
            <>
              {user.role === 'Donor' && pathname !== '/donor/create' && (
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/donor/create')}>
                  + Donate
                </button>
              )}
              {DEMO_MODE && <Notifications key={user._id} />}
              <UserMenu />
            </>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>
                Log in
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>
                Join
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
