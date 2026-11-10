import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { DEMO_MODE, errorMessage } from '../lib/axios'
import { DEMO_ACCOUNTS } from '../lib/demo/store'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const go = async (e: string, p: string) => {
    setError('')
    setBusy(true)
    try {
      const u = await login(e, p)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : u.role === 'NGO' ? '/ngo' : '/donor', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Could not log in. Check your email and password.'))
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    go(email, password)
  }

  return (
    <div className="container page" style={{ maxWidth: 460 }}>
      <div className="stack" style={{ gap: 6 }}>
        <h2>Welcome back</h2>
        <p className="muted">Log in to post food or manage pickups.</p>
      </div>
      <form className="card raised" onSubmit={submit} noValidate>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input id="login-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input id="login-password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn btn-primary btn-block btn-lg" disabled={busy || !email || !password}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        <p className="small muted" style={{ textAlign: 'center' }}>
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
      {DEMO_MODE && (
        <div className="card">
          <div className="eyebrow">Sample accounts</div>
          <div className="demo-pick">
            <button type="button" onClick={() => go(DEMO_ACCOUNTS.donor.email, DEMO_ACCOUNTS.donor.password)}>
              <strong>Donor</strong>
              <span className="small muted mono">{DEMO_ACCOUNTS.donor.email}</span>
            </button>
            <button type="button" onClick={() => go(DEMO_ACCOUNTS.ngo.email, DEMO_ACCOUNTS.ngo.password)}>
              <strong>NGO</strong>
              <span className="small muted mono">{DEMO_ACCOUNTS.ngo.email}</span>
            </button>
          </div>
          <p className="small muted">
            Password for both: <span className="mono">demo123</span>
          </p>
        </div>
      )}
    </div>
  )
}
