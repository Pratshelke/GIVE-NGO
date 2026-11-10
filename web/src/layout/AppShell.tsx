import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Home, LayoutDashboard, LogOut, MapPinned, Moon, Plus, Search, Sun, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../lib/theme'
import { api, DEMO_MODE } from '../lib/axios'
import { useLiveQuery } from '../lib/hooks'
import type { DonationRequest, Donation } from '../lib/types'
import { initials, Logo } from '../components/ui'
import { NotificationsBell } from '../components/Notifications'
import { DemoDock } from '../components/DemoDock'
import { useCommandMenu } from '../components/CommandMenu'

type NavItem = { to: string; label: string; icon: LucideIcon; badge?: number; fab?: boolean }

const TITLES: Record<string, string> = {
  '/donor': 'My donations',
  '/donor/create': 'Donate food',
  '/ngo': 'Pickups',
  '/map': 'Live map',
  '/profile': 'Profile',
}

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { theme, toggle } = useTheme()
  const openCmd = useCommandMenu()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  const isNgo = user?.role === 'NGO'
  const { data: counts } = useLiveQuery(
    async () => {
      if (isNgo) {
        const [r, d] = await Promise.all([api.get('/requests'), api.get('/donations')])
        const live = new Set((d.data.donations as Donation[]).filter((x) => x.status === 'pending').map((x) => x._id))
        return (r.data.requests as DonationRequest[]).filter((q) => q.status === 'pending' && live.has(q.donationId)).length
      }
      const d = await api.get('/donations')
      return (d.data.donations as Donation[]).filter((x) => ['pending', 'reserved', 'in_transit'].includes(x.status)).length
    },
    [user?._id],
    5000,
  )
  if (!user) return null

  const items: NavItem[] = isNgo
    ? [
        { to: '/ngo', label: 'Pickups', icon: LayoutDashboard, badge: counts ?? 0 },
        { to: '/map', label: 'Live map', icon: MapPinned },
        { to: '/profile', label: 'Profile', icon: UserRound },
      ]
    : [
        { to: '/donor', label: 'My donations', icon: LayoutDashboard, badge: counts ?? 0 },
        { to: '/donor/create', label: 'Donate food', icon: Plus, fab: true },
        { to: '/map', label: 'Live map', icon: MapPinned },
        { to: '/profile', label: 'Profile', icon: UserRound },
      ]

  return (
    <div className="shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('/')}>
          <span className="brand-mark"><Logo /></span>
          GiveNGo
        </button>
        <button className="side-search" onClick={openCmd}>
          <Search />
          <span className="grow">Search or jump to…</span>
          <span className="kbd">⌘K</span>
        </button>
        <nav className="side-nav" aria-label="Main">
          {items.map((it) => {
            const Icon = it.icon
            const active = pathname === it.to
            return (
              <button key={it.to} className="side-link" aria-current={active ? 'page' : undefined} onClick={() => navigate(it.to)} style={{ isolation: 'isolate' }}>
                {active && <motion.span layoutId="side-active" className="active-bg" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <Icon />
                {it.label}
                {!!it.badge && <span className="badge-n">{it.badge}</span>}
              </button>
            )
          })}
          <button className="side-link" onClick={() => navigate('/')}>
            <Home />
            Home page
          </button>
        </nav>
        {!isNgo && (
          <button className="btn btn-accent btn-block" onClick={() => navigate('/donor/create')}>
            <Plus /> Donate food
          </button>
        )}
        <div className="side-foot">
          <div className="me-card">
            <span className="avatar">{initials(user.name)}</span>
            <div className="grow">
              <div className="truncate" style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user.name}</div>
              <div className="muted tiny">{isNgo ? 'NGO partner' : 'Donor'}</div>
            </div>
            <button className="icon-btn" style={{ width: 34, height: 34 }} aria-label="Log out" onClick={() => (logout(), navigate('/'))}>
              <LogOut />
            </button>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className={`app-top ${scrolled ? 'scrolled' : ''}`}>
          <div className="row nw" style={{ gap: 10, minWidth: 0 }}>
            <AnimatePresence mode="wait">
              <motion.span key={pathname} className="eyebrow truncate" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                {TITLES[pathname] ?? ''}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="row nw" style={{ gap: 8 }}>
            <button className="icon-btn" onClick={openCmd} aria-label="Open command menu">
              <Search />
            </button>
            <button className="icon-btn" onClick={toggle} aria-label="Toggle theme">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} style={{ display: 'grid' }}>
                  {theme === 'dark' ? <Sun /> : <Moon />}
                </motion.span>
              </AnimatePresence>
            </button>
            {DEMO_MODE && <NotificationsBell key={user._id} />}
          </div>
        </header>
        <AnimatePresence mode="wait">
          <motion.main key={pathname} className="app-content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
            <FrozenOutlet />
          </motion.main>
        </AnimatePresence>
      </div>

      <nav className="tabbar glass" aria-label="Main">
        {items.map((it) => {
          const Icon = it.icon
          return (
            <button key={it.to} aria-current={pathname === it.to ? 'page' : undefined} className={it.fab ? 'fab' : ''} onClick={() => navigate(it.to)}>
              <Icon />
              {it.label.replace('My donations', 'Donations').replace('Donate food', 'Donate')}
              {!!it.badge && <span className="badge-n">{it.badge}</span>}
            </button>
          )
        })}
      </nav>
      <DemoDock inApp />
    </div>
  )
}

/** Keeps the old page rendered while it animates out. */
function FrozenOutlet() {
  const o = useOutlet()
  const [frozen] = useState(o)
  return frozen
}
