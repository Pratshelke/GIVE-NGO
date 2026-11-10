import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api, errorMessage } from '../lib/axios'
import { LocationPicker } from '../components/LocationPicker'
import type { PickedLocation } from '../components/LocationPicker'
import { useToast } from '../components/Toast'

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phoneNumber ?? '')
  const [loc, setLoc] = useState<PickedLocation | null>(
    user?.location ? { address: user.address ?? '', coords: user.location.coordinates } : null,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!user) return null

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.put(`/users/${user._id}`, {
        name: name.trim(),
        phoneNumber: phone.trim(),
        address: loc?.address,
        location: loc ? { type: 'Point', coordinates: loc.coords } : undefined,
      })
      await refreshUser()
      toast('Profile saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container page" style={{ maxWidth: 680 }}>
      <div className="page-head">
        <div>
          <span className="eyebrow">{user.role === 'NGO' ? 'NGO partner' : 'Donor'} profile</span>
          <h2>{user.name}</h2>
          <span className="small muted mono">{user.email}</span>
        </div>
      </div>
      <form className="card raised" onSubmit={save} noValidate>
        {error && <div className="form-error">{error}</div>}
        <div className="grid-2" style={{ gap: 14 }}>
          <div className="field">
            <label htmlFor="pf-name">Name</label>
            <input id="pf-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pf-phone">Phone</label>
            <input id="pf-phone" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <span className="hint">Shared only with the other side of an accepted pickup.</span>
          </div>
        </div>
        <div className="field">
          <label>{user.role === 'NGO' ? 'Operating location' : 'Default pickup location'}</label>
          <span className="hint">
            {user.role === 'NGO' ? 'Donations within 20 km of here are offered to you.' : 'Pre-filled when you post a donation.'}
          </span>
        </div>
        <LocationPicker value={loc} onChange={setLoc} idPrefix="pf-loc" />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  )
}
