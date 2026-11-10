import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { errorMessage } from '../lib/axios'
import type { Role } from '../lib/types'
import { LocationPicker } from '../components/LocationPicker'
import type { PickedLocation } from '../components/LocationPicker'

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

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim() || !email.trim() || !phone.trim() || !password) return setError('Please fill in every field.')
    if (password.length < 6) return setError('Use at least 6 characters for the password.')
    if (role === 'NGO' && !loc) return setError('NGOs need a location so nearby donations can reach you. Pick one on the map.')
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
    <div className="container page" style={{ maxWidth: 640 }}>
      <div className="stack" style={{ gap: 6 }}>
        <h2>Join GiveNGo</h2>
        <p className="muted">
          {role === 'Donor'
            ? 'Post surplus food in a minute. We find the nearest NGO for you.'
            : 'Get pickup requests from donors near you, one at a time.'}
        </p>
      </div>
      <form className="card raised" onSubmit={submit} noValidate>
        <div className="segmented" role="group" aria-label="Account type">
          <button type="button" aria-pressed={role === 'Donor'} onClick={() => setRole('Donor')}>
            I have food to give
          </button>
          <button type="button" aria-pressed={role === 'NGO'} onClick={() => setRole('NGO')}>
            We're an NGO
          </button>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="grid-2" style={{ gap: 14 }}>
          <div className="field">
            <label htmlFor="reg-name">{role === 'NGO' ? 'Organisation name' : 'Name or business'}</label>
            <input id="reg-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={role === 'NGO' ? 'e.g. Seva Food Bank' : 'e.g. Annapurna Kitchens'} />
          </div>
          <div className="field">
            <label htmlFor="reg-phone">Phone</label>
            <input id="reg-phone" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxx xxxxx" />
          </div>
          <div className="field">
            <label htmlFor="reg-email">Email</label>
            <input id="reg-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="reg-password">Password</label>
            <input id="reg-password" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <span className="hint">At least 6 characters</span>
          </div>
        </div>
        <div className="field">
          <label>{role === 'NGO' ? 'Where do you operate from?' : 'Usual pickup location (optional)'}</label>
          <span className="hint">
            {role === 'NGO'
              ? 'Donations within 20 km of this point are offered to you.'
              : 'Saves time when you post. You can change it on each donation.'}
          </span>
        </div>
        <LocationPicker value={loc} onChange={setLoc} idPrefix="reg-loc" />
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? 'Creating account…' : role === 'NGO' ? 'Register NGO' : 'Create account'}
        </button>
        <p className="small muted" style={{ textAlign: 'center' }}>
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  )
}
