import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api, errorMessage } from '../lib/axios'
import { timeAgo, timeLeft, useLiveQuery, useNow } from '../lib/hooks'
import { formatKm, haversineKm } from '../lib/geo'
import type { Donation, DonationRequest, PublicUser } from '../lib/types'
import { MapCanvas } from '../components/MapCanvas'
import { CategoryIcon, Countdown, StatusBadge, StatusStepper } from '../components/ui'
import { useToast } from '../components/Toast'
import { REQUEST_WINDOW_MS } from '../lib/demo/store'

type Data = { requests: DonationRequest[]; donations: Donation[] }

const donorOf = (d: Donation): PublicUser | null => (typeof d.donorId === 'object' ? d.donorId : null)
const directions = (d: Donation) =>
  `https://www.openstreetmap.org/directions?route=;${d.location.coordinates[1]},${d.location.coordinates[0]}`

export function NgoDashboard() {
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState<'now' | 'history'>('now')
  const { data, reload, loading } = useLiveQuery<Data>(async () => {
    const [r, d] = await Promise.all([api.get('/requests'), api.get('/donations')])
    return { requests: r.data.requests, donations: d.data.donations }
  }, [], 4000)

  const byId = new Map((data?.donations ?? []).map((d) => [d._id, d]))
  const pending = (data?.requests ?? [])
    .filter((r) => r.status === 'pending' && byId.get(r.donationId)?.status === 'pending')
    .map((r) => ({ r, d: byId.get(r.donationId)! }))
  const mine = (data?.donations ?? []).filter((d) => d.currentNgoId?._id === user?._id)
  const pickups = mine.filter((d) => d.status === 'reserved' || d.status === 'in_transit')
  const delivered = mine.filter((d) => d.status === 'completed').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const passed = (data?.requests ?? []).filter((r) => r.status === 'rejected' || r.status === 'expired')
  const servings = delivered.reduce((s, d) => s + (d.servings ?? 0), 0)
  const available = user?.isAvailable !== false

  const toggleAvailable = async () => {
    if (!user) return
    try {
      await api.put(`/users/${user._id}`, { isAvailable: !available })
      await refreshUser()
      toast(!available ? 'You are accepting pickups again.' : 'Paused. New donations will skip you until you switch back on.', 'info')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <span className="eyebrow">NGO dashboard</span>
          <h2>{user?.name}</h2>
          <span className="small muted">📍 {user?.address ?? 'Set your location in Profile'}</span>
        </div>
        <div className="card" style={{ padding: '10px 14px', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700 }}>{available ? 'Accepting pickups' : 'Paused'}</div>
            <div className="small muted">{available ? 'Nearby donations come to you' : 'Donations skip you'}</div>
          </div>
          <button className="switch" role="switch" aria-checked={available} aria-label="Accepting pickups" onClick={toggleAvailable} />
        </div>
      </div>

      <div className="stats-row">
        <div className="card stat">
          <span className="value" style={{ color: pending.length ? 'var(--accent)' : undefined }}>
            {pending.length}
          </span>
          <span className="label">waiting for your answer</span>
        </div>
        <div className="card stat">
          <span className="value">{pickups.length}</span>
          <span className="label">pickups in progress</span>
        </div>
        <div className="card stat">
          <span className="value">{delivered.length}</span>
          <span className="label">donations collected</span>
        </div>
        <div className="card stat">
          <span className="value">{servings}</span>
          <span className="label">servings distributed</span>
        </div>
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'now'} onClick={() => setTab('now')}>
          Today <span className="count">{pending.length + pickups.length}</span>
        </button>
        <button role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}>
          History <span className="count">{delivered.length}</span>
        </button>
      </div>

      {loading && <p className="muted">Loading…</p>}

      {tab === 'now' && !loading && (
        <>
          <section className="stack" style={{ gap: 14 }}>
            <h3>New requests</h3>
            {pending.length === 0 && (
              <div className="card empty">
                <span className="big" aria-hidden="true">
                  📭
                </span>
                <b>No requests right now</b>
                <span>
                  {available
                    ? 'When a donor near you posts food, it shows up here with 10 minutes to respond.'
                    : 'You are paused. Switch on “Accepting pickups” to receive requests.'}
                </span>
              </div>
            )}
            {pending.map(({ r, d }) => (
              <RequestCard key={r._id} req={r} donation={d} onDone={reload} />
            ))}
          </section>

          <section className="stack" style={{ gap: 14 }}>
            <h3>Your pickups</h3>
            {pickups.length === 0 && <p className="muted">Accepted donations appear here until they're delivered.</p>}
            {pickups.map((d) => (
              <PickupCard key={d._id} donation={d} onDone={reload} />
            ))}
          </section>
        </>
      )}

      {tab === 'history' && (
        <section className="stack" style={{ gap: 12 }}>
          {delivered.length === 0 && <p className="muted">Delivered donations will be listed here.</p>}
          {delivered.map((d) => (
            <div key={d._id} className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <CategoryIcon category={d.category} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{d.title}</b>
                <div className="meta">
                  <span>{donorOf(d)?.name}</span>
                  <span>{d.quantity}</span>
                  <span>{timeAgo(d.createdAt)}</span>
                </div>
              </div>
              <StatusBadge status="completed" />
            </div>
          ))}
          {passed.length > 0 && <p className="small muted">You passed on or missed {passed.length} request(s). They were offered to the next nearest NGO.</p>}
        </section>
      )}
    </div>
  )
}

function RequestCard({ req, donation: d, onDone }: { req: DonationRequest; donation: Donation; onDone: () => void }) {
  const { user } = useAuth()
  const toast = useToast()
  const now = useNow(1000)
  const [busy, setBusy] = useState<'' | 'accept' | 'reject'>('')
  const donor = donorOf(d)
  const km = req.distanceKm ?? (user?.location ? haversineKm(user.location.coordinates, d.location.coordinates) : undefined)
  const left = Math.max(0, Date.parse(req.expiresAt) - now)

  const act = async (kind: 'accept' | 'reject') => {
    setBusy(kind)
    try {
      await api.post(`/requests/${req._id}/${kind}`)
      toast(kind === 'accept' ? `Accepted. Call ${donor?.name ?? 'the donor'} to arrange pickup.` : 'Passed. Offering it to the next nearest NGO.', kind === 'accept' ? 'success' : 'info')
      onDone()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy('')
    }
  }

  return (
    <article className="card urgent">
      <div className="split" style={{ gap: 18 }}>
        <div className="stack" style={{ gap: 14 }}>
          <div className="dcard-head">
            <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', minWidth: 0 }}>
              <CategoryIcon category={d.category} />
              <div className="stack" style={{ gap: 4, minWidth: 0 }}>
                <h3>{d.title}</h3>
                <div className="meta">
                  <span>⚖️ {d.quantity}</span>
                  {d.servings ? <span>🍽️ ~{d.servings} servings</span> : null}
                  {km != null && <span>🚐 {formatKm(km)} away</span>}
                </div>
              </div>
            </div>
            <Countdown total={REQUEST_WINDOW_MS} left={left} label={timeLeft(req.expiresAt, now)} />
          </div>
          <p>{d.description}</p>
          <div className="contact">
            <div style={{ minWidth: 0 }}>
              <div className="eyebrow">From</div>
              <b>{donor?.name ?? 'Donor'}</b>
              <div className="small muted">📍 {d.address}</div>
            </div>
            <span className="small muted">Collect within {timeLeft(d.expiresAt, now)}</span>
          </div>
          <div className="row">
            <button className="btn btn-primary btn-lg" onClick={() => act('accept')} disabled={!!busy}>
              {busy === 'accept' ? 'Accepting…' : 'Accept pickup'}
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => act('reject')} disabled={!!busy}>
              {busy === 'reject' ? 'Passing…' : "Can't take it"}
            </button>
          </div>
        </div>
        <MapCanvas
          className="short"
          center={d.location.coordinates}
          fitToMarkers={!!user?.location}
          lines={user?.location ? [[user.location.coordinates, d.location.coordinates]] : []}
          markers={[
            { id: 'food', kind: 'food', coords: d.location.coordinates, pulse: true, popup: d.address },
            ...(user?.location ? [{ id: 'me', kind: 'ngo' as const, coords: user.location.coordinates, popup: 'You' }] : []),
          ]}
        />
      </div>
    </article>
  )
}

function PickupCard({ donation: d, onDone }: { donation: Donation; onDone: () => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const donor = donorOf(d)
  const next = d.status === 'reserved' ? 'confirm-pickup' : 'complete'

  const act = async () => {
    setBusy(true)
    try {
      await api.post(`/donations/${d._id}/${next}`)
      toast(next === 'complete' ? `Delivered! ~${d.servings ?? ''} people fed. The donor has been told.` : 'Pickup confirmed. Drive safe!')
      onDone()
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="card raised">
      <div className="dcard-head">
        <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', minWidth: 0 }}>
          <CategoryIcon category={d.category} />
          <div className="stack" style={{ gap: 4, minWidth: 0 }}>
            <h3>{d.title}</h3>
            <div className="meta">
              <span>⚖️ {d.quantity}</span>
              {d.servings ? <span>🍽️ ~{d.servings} servings</span> : null}
            </div>
          </div>
        </div>
        <StatusBadge status={d.status} label={d.status === 'reserved' ? 'Go collect' : 'On the way'} />
      </div>
      <StatusStepper status={d.status} />
      <div className="contact">
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow">Donor</div>
          <b>{donor?.name}</b>
          <div className="small muted">📍 {d.address}</div>
        </div>
        {donor?.phoneNumber && <span className="mono">{donor.phoneNumber}</span>}
      </div>
      <div className="row">
        <button className="btn btn-primary" onClick={act} disabled={busy}>
          {busy ? 'Saving…' : d.status === 'reserved' ? 'I have collected it' : 'Mark as delivered'}
        </button>
        <a className="btn btn-ghost" href={directions(d)} target="_blank" rel="noreferrer">
          Directions ↗
        </a>
      </div>
    </article>
  )
}
