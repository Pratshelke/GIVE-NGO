import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api, errorMessage } from '../lib/axios'
import { timeAgo, timeLeft, useLiveQuery, useNow } from '../lib/hooks'
import { formatKm } from '../lib/geo'
import type { Donation, DonationRequest } from '../lib/types'
import { CategoryIcon, StatusBadge, StatusStepper, STATUS_LABEL } from '../components/ui'
import { useToast } from '../components/Toast'

const ACTIVE = ['pending', 'reserved', 'in_transit']

export function DonorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'active' | 'past'>('active')
  const { data, loading, error, reload } = useLiveQuery(async () => {
    const r = await api.get('/donations')
    return (r.data.donations as Donation[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })
  const donations = data ?? []
  const active = donations.filter((d) => ACTIVE.includes(d.status))
  const past = donations.filter((d) => !ACTIVE.includes(d.status))
  const completed = donations.filter((d) => d.status === 'completed')
  const servings = completed.reduce((s, d) => s + (d.servings ?? 0), 0)
  const ngosHelped = new Set(completed.map((d) => d.currentNgoId?._id).filter(Boolean)).size
  const shown = tab === 'active' ? active : past

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Donor dashboard</span>
          <h2>Hi, {user?.name}</h2>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/donor/create')}>
          + Donate food
        </button>
      </div>

      <div className="stats-row">
        <div className="card stat">
          <span className="value">{servings}</span>
          <span className="label">people fed</span>
        </div>
        <div className="card stat">
          <span className="value">{completed.length}</span>
          <span className="label">donations delivered</span>
        </div>
        <div className="card stat">
          <span className="value">{ngosHelped}</span>
          <span className="label">NGOs supported</span>
        </div>
        <div className="card stat">
          <span className="value" style={{ color: active.length ? 'var(--accent)' : undefined }}>
            {active.length}
          </span>
          <span className="label">in progress</span>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'active'} onClick={() => setTab('active')}>
          In progress <span className="count">{active.length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'past'} onClick={() => setTab('past')}>
          History <span className="count">{past.length}</span>
        </button>
      </div>

      {error ? <div className="form-error">{errorMessage(error, 'Could not load donations.')}</div> : null}
      {loading && <p className="muted">Loading donations…</p>}
      {!loading && shown.length === 0 && (
        <div className="card empty">
          <span className="big" aria-hidden="true">
            {tab === 'active' ? '🍲' : '📜'}
          </span>
          <b>{tab === 'active' ? 'Nothing in progress' : 'No past donations yet'}</b>
          <span>Have leftover food? Post it and we'll find the nearest NGO.</span>
          <button className="btn btn-primary" onClick={() => navigate('/donor/create')}>
            Donate food
          </button>
        </div>
      )}
      <div className="stack" style={{ gap: 16 }}>
        {shown.map((d) => (
          <DonorDonationCard key={d._id} donation={d} onChanged={reload} />
        ))}
      </div>
    </div>
  )
}

function DonorDonationCard({ donation: d, onChanged }: { donation: Donation; onChanged: () => void }) {
  const toast = useToast()
  const now = useNow(1000)
  const [showLog, setShowLog] = useState(d.status === 'pending')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [editing, setEditing] = useState(false)
  const { data: log } = useLiveQuery(
    async () => (showLog ? ((await api.get(`/donations/${d._id}/requests`)).data.requests as DonationRequest[]) : []),
    [showLog, d._id, d.status],
    5000,
  )
  const ngo = d.currentNgoId

  const cancel = async () => {
    try {
      await api.delete(`/donations/${d._id}`)
      toast('Donation cancelled.')
      onChanged()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
    setConfirmCancel(false)
  }

  return (
    <article className={`card ${d.status === 'pending' ? 'raised' : ''}`}>
      <div className="dcard-head">
        <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', minWidth: 0 }}>
          <CategoryIcon category={d.category} />
          <div className="stack" style={{ gap: 4, minWidth: 0 }}>
            <h3>{d.title}</h3>
            <div className="meta">
              <span>⚖️ {d.quantity}</span>
              {d.servings ? <span>🍽️ ~{d.servings} servings</span> : null}
              <span>🕒 {timeAgo(d.createdAt, now)}</span>
              {d.status === 'pending' && <span className="mono">⏳ {timeLeft(d.expiresAt, now)} left</span>}
            </div>
          </div>
        </div>
        <StatusBadge status={d.status} />
      </div>

      {d.status !== 'expired' && <StatusStepper status={d.status} />}

      {ngo && d.status !== 'expired' && (
        <div className="contact">
          <div>
            <div className="eyebrow">{d.status === 'completed' ? 'Delivered by' : 'Collecting NGO'}</div>
            <b>{ngo.name}</b>
          </div>
          {ngo.phoneNumber && d.status !== 'completed' && <span className="mono">{ngo.phoneNumber}</span>}
        </div>
      )}

      {showLog && log && log.length > 0 && (
        <ul className="timeline" aria-label="Dispatch log">
          {log.map((r) => (
            <li key={r._id}>
              <span className={`dot ${r.status === 'accepted' ? 'ok' : r.status === 'pending' ? 'live' : ''}`} />
              <span>
                Offered to <b>{r.ngoName}</b>
                {r.distanceKm != null && <span className="muted"> · {formatKm(r.distanceKm)}</span>}
                <br />
                <span className="small muted">
                  {r.status === 'pending'
                    ? `Waiting for a reply · ${timeLeft(r.expiresAt, now)} left`
                    : r.status === 'accepted'
                      ? 'Accepted the pickup'
                      : r.status === 'expired'
                        ? 'No reply in time, moved on'
                        : 'Could not take it, moved to the next nearest'}
                </span>
              </span>
              <span className="mono small muted">{new Date(r.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            </li>
          ))}
        </ul>
      )}
      {showLog && log && log.length === 0 && d.status === 'pending' && (
        <p className="small muted">Looking for the nearest available NGO…</p>
      )}

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="small muted" style={{ minWidth: 0 }}>
          📍 {d.address}
        </span>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowLog((s) => !s)}>
            {showLog ? 'Hide dispatch log' : 'Dispatch log'}
          </button>
          {d.status === 'pending' && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                Edit
              </button>
              {confirmCancel ? (
                <>
                  <button className="btn btn-danger btn-sm" onClick={cancel}>
                    Yes, cancel it
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmCancel(false)}>
                    Keep
                  </button>
                </>
              ) : (
                <button className="btn btn-danger btn-sm" onClick={() => setConfirmCancel(true)}>
                  Cancel
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {editing && <EditModal donation={d} onClose={() => setEditing(false)} onSaved={onChanged} />}
    </article>
  )
}

function EditModal({ donation, onClose, onSaved }: { donation: Donation; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [title, setTitle] = useState(donation.title)
  const [quantity, setQuantity] = useState(donation.quantity)
  const [servings, setServings] = useState(String(donation.servings ?? ''))
  const [description, setDescription] = useState(donation.description)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await api.put(`/donations/${donation._id}`, { title, quantity, description, servings: servings || undefined })
      toast('Donation updated.')
      onSaved()
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card raised modal" role="dialog" aria-modal="true" aria-labelledby="edit-title" onClick={(e) => e.stopPropagation()}>
        <h3 id="edit-title">Edit donation</h3>
        <p className="small muted">You can edit while the status is “{STATUS_LABEL.pending}”.</p>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label htmlFor="edit-t">Title</label>
          <input id="edit-t" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="field">
            <label htmlFor="edit-q">Quantity</label>
            <input id="edit-q" className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="edit-s">Feeds about</label>
            <input id="edit-s" className="input" type="number" value={servings} onChange={(e) => setServings(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="edit-d">Notes</label>
          <textarea id="edit-d" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
