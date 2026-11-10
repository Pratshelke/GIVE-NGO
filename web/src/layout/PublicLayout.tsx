import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Command, Moon, Sun } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../lib/theme'
import { Logo } from '../components/ui'
import { DemoDock } from '../components/DemoDock'
import { useCommandMenu } from '../components/CommandMenu'

export function PublicLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { theme, toggle } = useTheme()
  const openCmd = useCommandMenu()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const onInk = pathname === '/' && !scrolled

  return (
    <>
      <header className={`topnav ${scrolled || pathname !== '/' ? 'scrolled' : ''} ${onInk ? 'on-ink' : ''}`}>
        <div className="topnav-wrap">
          <div className="topnav-inner">
            <button className="brand" onClick={() => navigate('/')}>
              <span className="brand-mark"><Logo /></span>
              GiveNGo
            </button>
            <nav className="topnav-links" aria-label="Main">
              <button onClick={() => (pathname === '/' ? document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }) : navigate('/'))}>How it works</button>
              <button onClick={() => navigate('/map')}>Live map</button>
              <button onClick={openCmd} className="row nw" style={{ gap: 6 }}>
                <Command size={14} /> K
              </button>
            </nav>
            <div className="row nw" style={{ gap: 6 }}>
              <button className="icon-btn" onClick={toggle} aria-label="Toggle theme" style={onInk ? { background: 'transparent', borderColor: 'var(--ink-line)', color: 'var(--ink-fg)' } : undefined}>
                {theme === 'dark' ? <Sun /> : <Moon />}
              </button>
              {user ? (
                <button className="btn btn-sm btn-accent" onClick={() => navigate(user.role === 'NGO' ? '/ngo' : '/donor')}>
                  Open dashboard
                </button>
              ) : (
                <>
                  <button className={`btn btn-sm ${onInk ? 'btn-ink-ghost' : 'btn-ghost'}`} onClick={() => navigate('/login')}>
                    Log in
                  </button>
                  <button className="btn btn-sm btn-accent" onClick={() => navigate('/register')}>
                    Join
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
      <DemoDock />
    </>
  )
}
