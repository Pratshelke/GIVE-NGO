import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api, errorMessage } from '../lib/axios'
import { useLiveQuery } from '../lib/hooks'
import { formatKm, haversineKm, MAX_DISTANCE_KM } from '../lib/geo'
import type { Category, NgoPin } from '../lib/types'
import { LocationPicker } from '../components/LocationPicker'
import type { PickedLocation } from '../components/LocationPicker'
import { MapCanvas } from '../components/MapCanvas'
import { CATEGORIES } from '../components/ui'
import { useToast } from '../components/Toast'

const WINDOWS = [
  { h: 1, label: '1 hour' },
  { h: 2, label: '2 hours' },
  { h: 4, label: '4 hours' },
  { h: 8, label: 'Today' },
]

export function CreateDonationPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [category, setCategory] = useState<Category>('cooked')
  const [title, setTitle] = useState('')
  const [quantity, setQuantity] = useState('')
  const [servings, setServings] = useState('')
  const [description, setDescription] = useState('')
  const [windowH, setWindowH] = useState(2)
  const [safe, setSafe] = useState(false)
  const [loc, setLoc] = useState<PickedLocation | null>(
    user?.location ? { address: user.address ?? 'My saved location', coords: user.location.coordinates } : null,
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const { data: ngos } = useLiveQuery(async () => (await api.get('/ngos')).data.ngos as NgoPin[], [], 15000)

  const ranked = useMemo(() => {
    if (!loc || !ngos) return []
    return ngos
      .filter((n) => n.isAvailable)
      .map((n) => ({ ...n, km: haversineKm(loc.coords, n.location.coordinates) }))
      .filter((n) => n.km <= MAX_DISTANCE_KM)
      .sort((a, b) => a.km - b.km)
  }, [loc, ngos])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim() || !quantity.trim()) return setError('Add a short title and the quantity.')
    if (!loc) return setError('Choose where the NGO should collect the food.')
    if (!safe) return setError('Please confirm the food is safe to eat.')
    setBusy(true)
    try {
      await api.post('/donations', {
        title: title.trim(),
        quantity: quantity.trim(),
        servings: servings ? Number(servings) : undefined,
        category,
        description: description.trim() || `${CATEGORIES.find((c) => c.key === category)?.label} ready for pickup.`,
        address: loc.address,
        location: { type: 'Point', coordinates: loc.coords },
        expiresAt: new Date(Date.now() + windowH * 3600_000).toISOString(),
      })
      toast(ranked[0] ? `Posted! Offering it to ${ranked[0].name} first.` : 'Posted! We will notify NGOs as they come online.')
      navigate('/donor')
    } catch (err) {
      setError(errorMessage(err, 'Could not post the donation.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <span className="eyebrow">New donation</span>
          <h2>What food do you have?</h2>
        </div>
      </div>
      <form className="split" onSubmit={submit} noValidate>
        <div className="card raised">
          {error && <div className="form-error">{error}</div>}
          <div className="field">
            <label>Type of food</label>
            <div className="chips">
              {CATEGORIES.map((c) => (
                <button type="button" key={c.key} className="chip" aria-pressed={category === c.key} onClick={() => setCategory(c.key)}>
                  <span aria-hidden="true">{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="don-title">Title</label>
            <input id="don-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Veg pulao and dal from lunch buffet" />
          </div>
          <div className="grid-2" style={{ gap: 14 }}>
            <div className="field">
              <label htmlFor="don-qty">Quantity</label>
              <input id="don-qty" className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 12 kg, 40 boxes" />
            </div>
            <div className="field">
              <label htmlFor="don-serv">Feeds about</label>
              <input id="don-serv" className="input" type="number" min={1} value={servings} onChange={(e) => setServings(e.target.value)} placeholder="people" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="don-desc">Notes for the NGO</label>
            <textarea id="don-desc" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="When was it cooked? Veg / non-veg? Do they need to bring containers?" />
          </div>
          <div className="field">
            <label>Collect within</label>
            <div className="segmented" role="group" aria-label="Pickup window">
              {WINDOWS.map((w) => (
                <button type="button" key={w.h} aria-pressed={windowH === w.h} onClick={() => setWindowH(w.h)}>
                  {w.label}
                </button>
              ))}
            </div>
          </div>
          <hr className="divider" />
          <div className="field">
            <label>Pickup location</label>
          </div>
          <LocationPicker value={loc} onChange={setLoc} idPrefix="don-loc" />
          <label className="row" style={{ gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input id="don-safe" type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} style={{ marginTop: 4 }} />
            <span className="small">The food is fresh, stored safely, and fit to eat. I'll hand it over within the pickup window.</span>
          </label>
          <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy ? 'Posting…' : 'Post donation'}
          </button>
        </div>

        <div className="stack" style={{ position: 'sticky', top: 84 }}>
          <div className="card">
            <span className="eyebrow">Who gets asked first</span>
            {!loc && <p className="muted">Pick a location to see the NGOs nearby.</p>}
            {loc && ranked.length === 0 && (
              <p className="muted">No available NGOs within {MAX_DISTANCE_KM} km. Your post stays open in case one comes online.</p>
            )}
            {ranked.length > 0 && (
              <ol className="timeline">
                {ranked.slice(0, 4).map((n, i) => (
                  <li key={n._id}>
                    <span className={`dot ${i === 0 ? 'live' : ''}`} />
                    <span>
                      <b>{n.name}</b>
                      <br />
                      <span className="small muted">{i === 0 ? 'Offered first, 10 min to respond' : `Next if #${i} passes`}</span>
                    </span>
                    <span className="mono small">{formatKm(n.km)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {loc && (
            <MapCanvas
              center={loc.coords}
              zoom={12}
              fitToMarkers={ranked.length > 0}
              circles={[{ center: loc.coords, radiusKm: Math.min(MAX_DISTANCE_KM, Math.max(3, (ranked[3]?.km ?? ranked.at(-1)?.km ?? 5) + 1)) }]}
              lines={ranked[0] ? [[loc.coords, ranked[0].location.coordinates]] : []}
              markers={[
                { id: 'me', kind: 'food', coords: loc.coords, popup: 'Your pickup point' },
                ...ranked.slice(0, 6).map((n, i) => ({
                  id: n._id,
                  kind: 'ngo' as const,
                  pulse: i === 0,
                  coords: n.location.coordinates,
                  popup: (
                    <>
                      <b>{n.name}</b>
                      <br />
                      {formatKm(n.km)} away
                    </>
                  ),
                })),
              ]}
            />
          )}
        </div>
      </form>
    </div>
  )
}
