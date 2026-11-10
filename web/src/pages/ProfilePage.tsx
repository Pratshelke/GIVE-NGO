import { useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'motion/react'
import { AlertCircle, Check, Phone, UserRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api, errorMessage } from '../lib/axios'
import { LocationPicker } from '../components/LocationPicker'
import type { PickedLocation } from '../components/LocationPicker'
import { initials } from '../components/ui'
import { useToast } from '../components/Toast'

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phoneNumber ?? '')
  const [loc, setLoc] = useState<PickedLocation | null>(user?.location ? { address: user.address ?? '', coords: user.location.coordinates } : null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  if (!user) return null

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.put(`/users/${user._id}`, { name: name.trim(), phoneNumber: phone.trim(), address: loc?.address, location: loc ? { type: 'Point', coordinates: loc.coords } : undefined })
      await refreshUser()
      toast('Profile saved.')
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1800)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack" style={{ gap: 22, maxWidth: 760 }}>
      <div className="row nw" style={{ gap: 16 }}>
        <span className="avatar" style={{ width: 64, height: 64, borderRadius: 20, fontSize: '1.2rem' }}>{initials(user.name)}</span>
        <div className="page-title">
          <h2>{user.name}</h2>
          <span className="muted small"><span className="mono">{user.email}</span> · {user.role === 'NGO' ? 'NGO partner' : 'Donor'}</span>
        </div>
      </div>
      <form className="panel lift pad-lg stack" style={{ gap: 18 }} onSubmit={save} noValidate>
        {error && <div className="form-error"><AlertCircle /> {error}</div>}
        <div className="grid-2">
          <div className="field">
            <label className="label" htmlFor="pf-name">Name</label>
            <div className="input-group"><UserRound /><input id="pf-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          </div>
          <div className="field">
            <label className="label" htmlFor="pf-phone">Phone</label>
            <div className="input-group"><Phone /><input id="pf-phone" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <span className="hint">Shared only with the other side of an accepted pickup.</span>
          </div>
        </div>
        <div className="field">
          <span className="label">{user.role === 'NGO' ? 'Operating location' : 'Default pickup spot'}</span>
          <span className="hint">{user.role === 'NGO' ? 'Donations within 20 km of here are offered to you.' : 'Pre-filled when you post a donation.'}</span>
        </div>
        <LocationPicker value={loc} onChange={setLoc} idPrefix="pf-loc" />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <motion.button className="btn btn-primary btn-lg" disabled={busy} animate={saved ? { scale: [1, 1.06, 1] } : {}}>
            {saved ? <><Check /> Saved</> : busy ? 'Saving…' : 'Save profile'}
          </motion.button>
        </div>
      </form>
    </div>
  )
}
