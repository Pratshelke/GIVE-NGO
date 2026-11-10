import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { DEMO_MODE, errorMessage } from '../lib/axios'
import { DEMO_ACCOUNTS } from '../lib/demo/store'
import { AuthSide } from '../components/AuthSide'
import { Logo } from '../components/ui'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(0)

  const go = async (e: string, p: string) => {
    setError('')
    setBusy(true)
    try {
      const u = await login(e, p)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : u.role === 'NGO' ? '/ngo' : '/donor', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Could not log in. Check your email and password.'))
      setShake((s) => s + 1)
    } finally {
      setBusy(false)
    }
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Enter your email and password.')
      setShake((s) => s + 1)
      return
    }
    go(email, password)
  }

  return (
    <div className="auth">
      <AuthSide title="Food is waiting. Let's move it." body="Log in to post surplus, or to see which pickups are waiting for your team." />
      <div className="auth-form">
        <motion.div className="inner" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 24 }}>
          <button className="brand" onClick={() => navigate('/')} style={{ alignSelf: 'flex-start' }}>
            <span className="brand-mark"><Logo /></span>GiveNGo
          </button>
          <div className="stack" style={{ gap: 8 }}>
            <h2>Welcome back</h2>
            <p className="muted">
              New here? <Link to="/register" style={{ fontWeight: 700 }}>Create an account</Link>
            </p>
          </div>

          {DEMO_MODE && (
            <div className="stack" style={{ gap: 10 }}>
              <span className="eyebrow">One-click sample accounts</span>
              <div className="demo-tiles">
                <button type="button" className="demo-tile" onClick={() => go(DEMO_ACCOUNTS.donor.email, DEMO_ACCOUNTS.donor.password)}>
                  <span className="avatar" style={{ background: 'linear-gradient(135deg, #ffad1f, #e5533c)' }}>AK</span>
                  <span className="grow">
                    <b className="small">Annapurna Kitchens</b>
                    <span className="tiny muted" style={{ display: 'block' }}>Donor · restaurant</span>
                  </span>
                </button>
                <button type="button" className="demo-tile" onClick={() => go(DEMO_ACCOUNTS.ngo.email, DEMO_ACCOUNTS.ngo.password)}>
                  <span className="avatar">SF</span>
                  <span className="grow">
                    <b className="small">Seva Food Bank</b>
                    <span className="tiny muted" style={{ display: 'block' }}>NGO · 1 request waiting</span>
                  </span>
                </button>
              </div>
              <div className="row nw small muted" style={{ gap: 12 }}>
                <hr className="hr grow" /> or use email <hr className="hr grow" />
              </div>
            </div>
          )}

          <motion.form key={shake} className="stack" style={{ gap: 14 }} onSubmit={submit} noValidate animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}>
            <AnimatePresence>
              {error && (
                <motion.div className="form-error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <AlertCircle /> {error}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="field">
              <label className="label" htmlFor="login-email">Email</label>
              <div className="input-group">
                <Mail />
                <input id="login-email" className="input" type="email" autoComplete="email" placeholder="you@kitchen.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="login-password">Password</label>
              <div className="input-group">
                <Lock />
                <input id="login-password" className="input" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingRight: 48 }} />
                <button type="button" className="icon-btn" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)} style={{ position: 'absolute', right: 5, top: 5, width: 38, height: 38, border: 0, background: 'transparent' }}>
                  {show ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>
            <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
              {busy ? 'Logging in…' : <>Log in <ArrowRight /></>}
            </button>
            {DEMO_MODE && <p className="tiny muted" style={{ textAlign: 'center' }}>Sample password: <span className="mono">demo123</span></p>}
          </motion.form>
        </motion.div>
      </div>
    </div>
  )
}
