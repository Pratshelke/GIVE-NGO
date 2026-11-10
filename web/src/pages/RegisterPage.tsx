import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, ArrowRight, Building2, Lock, Mail, Phone, Store, UserRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { errorMessage } from '../lib/axios'
import type { Role } from '../lib/types'
import { AuthSide } from '../components/AuthSide'
import { LocationPicker } from '../components/LocationPicker'
import type { PickedLocation } from '../components/LocationPicker'
import { Logo } from '../components/ui'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [role, setRole] = useState<Role>(params.get('role') === 'NGO' ? 'NGO' : 'Donor')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loc, setLoc] = useState<PickedLocation | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const strength = Math.min(4, [password.length >= 6, password.length >= 10, /\d/.test(password), /[^a-z0-9]/i.test(password)].filter(Boolean).length)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim() || !email.trim() || !phone.trim() || !password) return setError('Fill in every field to continue.')
    if (password.length < 6) return setError('Use at least 6 characters for the password.')
    if (role === 'NGO' && !loc) return setError('Pick your location so nearby donations can reach you.')
    setBusy(true)
    try {
      const u = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        phoneNumber: phone.trim(),
        address: loc?.address,
        location: loc ? { type: 'Point', coordinates: loc.coords } : undefined,
      })
      navigate(u.role === 'NGO' ? '/ngo' : '/donor/create', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Could not create the account.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <AuthSide
        title={role === 'NGO' ? 'Get food offered to you first.' : 'Your surplus, someone’s dinner.'}
        body={role === 'NGO' ? 'Register your location. When a kitchen near you posts food, you’ll get it before anyone farther away.' : 'Post leftovers in under a minute. We find the nearest NGO with room and a van.'}
      />
      <div className="auth-form">
        <motion.form className="inner" onSubmit={submit} noValidate initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <button type="button" className="brand" onClick={() => navigate('/')} style={{ alignSelf: 'flex-start' }}>
            <span className="brand-mark"><Logo /></span>GiveNGo
          </button>
          <div className="stack" style={{ gap: 8 }}>
            <h2>Create your account</h2>
            <p className="muted">
              Already registered? <Link to="/login" style={{ fontWeight: 700 }}>Log in</Link>
            </p>
          </div>
          <div className="role-pick" role="group" aria-label="Account type">
            <button type="button" aria-pressed={role === 'Donor'} onClick={() => setRole('Donor')}>
              <Store />
              <b>I have food to give</b>
              <span className="tiny muted">Restaurant, caterer, home</span>
            </button>
            <button type="button" aria-pressed={role === 'NGO'} onClick={() => setRole('NGO')}>
              <Building2 />
              <b>We’re an NGO</b>
              <span className="tiny muted">Food bank, shelter, kitchen</span>
            </button>
          </div>
          <AnimatePresence>
            {error && (
              <motion.div className="form-error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <AlertCircle /> {error}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="field">
            <label className="label" htmlFor="reg-name">{role === 'NGO' ? 'Organisation name' : 'Name or business'}</label>
            <div className="input-group">
              <UserRound />
              <input id="reg-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={role === 'NGO' ? 'Seva Food Bank' : 'Annapurna Kitchens'} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="label" htmlFor="reg-email">Email</label>
              <div className="input-group">
                <Mail />
                <input id="reg-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="reg-phone">Phone</label>
              <div className="input-group">
                <Phone />
                <input id="reg-phone" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxx xxxxx" />
              </div>
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="reg-password">Password</label>
            <div className="input-group">
              <Lock />
              <input id="reg-password" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="row nw" style={{ gap: 6 }}>
              {[0, 1, 2, 3].map((i) => (
                <motion.span key={i} style={{ height: 4, flex: 1, borderRadius: 4 }} animate={{ background: i < strength ? (strength < 2 ? 'var(--coral)' : strength < 3 ? 'var(--accent)' : 'var(--leaf)') : 'var(--surface-3)' }} />
              ))}
            </div>
          </div>
          <div className="field">
            <span className="label">{role === 'NGO' ? 'Where do you operate from?' : 'Usual pickup spot (optional)'}</span>
            <span className="hint">{role === 'NGO' ? 'Donations within 20 km of this point are offered to you.' : 'Pre-fills each donation. You can change it every time.'}</span>
          </div>
          <LocationPicker value={loc} onChange={setLoc} idPrefix="reg-loc" />
          <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy ? 'Creating account…' : <>{role === 'NGO' ? 'Register NGO' : 'Create account'} <ArrowRight /></>}
          </button>
        </motion.form>
      </div>
    </div>
  )
}
