import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, Clock4, Inbox, MapPin, Navigation, Package, PackageCheck, Truck, Users, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api, errorMessage } from '../lib/axios'
import { timeAgo, timeLeft, useLiveQuery, useNow } from '../lib/hooks'
import { formatKm, haversineKm } from '../lib/geo'
import type { Donation, DonationRequest, PublicUser } from '../lib/types'
import { MapCanvas } from '../components/MapCanvas'
import { AnimatedNumber, CategoryIcon, CopyChip, Empty, Ring, StatusPill, Track } from '../components/ui'
import { SlideToAccept } from '../components/SlideToAccept'
import { useToast } from '../components/Toast'
import { REQUEST_WINDOW_MS } from '../lib/demo/store'
import { confetti } from '../lib/confetti'

type Data = { requests: DonationRequest[]; donations: Donation[] }
const donorOf = (d: Donation): PublicUser | null => (typeof d.donorId === 'object' ? d.donorId : null)
const directions = (d: Donation) => `https://www.openstreetmap.org/directions?route=;${d.location.coordinates[1]},${d.location.coordinates[0]}`
const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export function NgoDashboard() {
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const { data, reload, loading } = useLiveQuery<Data>(async () => {
    const [r, d] = await Promise.all([api.get('/requests'), api.get('/donations')])
    return { requests: r.data.requests, donations: d.data.donations }
  }, [], 3000)

  const byId = new Map((data?.donations ?? []).map((d) => [d._id, d]))
  const pending = (data?.requests ?? []).filter((r) => r.status === 'pending' && byId.get(r.donationId)?.status === 'pending').map((r) => ({ r, d: byId.get(r.donationId)! }))
  const mine = (data?.donations ?? []).filter((d) => d.currentNgoId?._id === user?._id)
  const toCollect = mine.filter((d) => d.status === 'reserved')
  const onWay = mine.filter((d) => d.status === 'in_transit')
  const delivered = mine.filter((d) => d.status === 'completed').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const servings = delivered.reduce((s, d) => s + (d.servings ?? 0), 0)
  const available = user?.isAvailable !== false

  const toggleAvailable = async () => {
    if (!user) return
    try {
      await api.put(`/users/${user._id}`, { isAvailable: !available })
      await refreshUser()
      toast(!available ? 'You’re accepting pickups again.' : 'Paused. New donations will skip you.', 'info')
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <>
      <div className="row between">
        <div className="page-title">
          <h2>{greeting()}, {user?.name}</h2>
          <span className="muted row nw" style={{ gap: 6 }}><MapPin size={15} /> {user?.address ?? 'Set your location in Profile'}</span>
        </div>
        <div className="avail-card">
          <span className={`avail-dot ${available ? 'on' : ''}`} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{available ? 'Accepting pickups' : 'Paused'}</div>
            <div className="tiny muted">{available ? 'Nearby offers come to you' : 'Offers skip you'}</div>
          </div>
          <button className="switch" role="switch" aria-checked={available} aria-label="Accepting pickups" onClick={toggleAvailable} />
        </div>
      </div>

      <div className="kpis">
        <div className={`kpi ${pending.length ? 'hot' : ''}`}>
          <div className="k-top"><span className="k-label">Waiting for you</span><span className="k-ico"><Inbox /></span></div>
          <span className="k-val"><AnimatedNumber value={pending.length} /></span>
        </div>
        <div className="kpi">
          <div className="k-top"><span className="k-label">Pickups in progress</span><span className="k-ico"><Truck /></span></div>
          <span className="k-val"><AnimatedNumber value={toCollect.length + onWay.length} /></span>
        </div>
        <div className="kpi">
          <div className="k-top"><span className="k-label">Donations collected</span><span className="k-ico"><PackageCheck /></span></div>
          <span className="k-val"><AnimatedNumber value={delivered.length} /></span>
        </div>
        <div className="kpi">
          <div className="k-top"><span className="k-label">People served</span><span className="k-ico"><Users /></span></div>
          <span className="k-val"><AnimatedNumber value={servings} /></span>
        </div>
      </div>

      <section className="stack" style={{ gap: 14 }}>
        <h3 className="row nw" style={{ gap: 10 }}>New offers <span className="count">{pending.length}</span></h3>
        {loading && <div className="skeleton" style={{ height: 280 }} />}
        {!loading && pending.length === 0 && (
          <Empty icon={Inbox} title={available ? 'All caught up' : 'You’re paused'}>
            {available ? 'When a kitchen near you posts food, it lands here with 10 minutes to decide.' : 'Switch on “Accepting pickups” to start receiving offers.'}
          </Empty>
        )}
        <AnimatePresence initial={false}>
          {pending.map(({ r, d }) => (
            <RequestCard key={r._id} req={r} donation={d} onDone={reload} />
          ))}
        </AnimatePresence>
      </section>

      <section className="stack" style={{ gap: 14 }}>
        <h3>Your pickups</h3>
        <div className="board">
          <div className="board-col">
            <header>
              <span className="row nw" style={{ gap: 8, fontWeight: 800 }}><Package size={17} /> To collect</span>
              <span className="count">{toCollect.length}</span>
            </header>
            <AnimatePresence initial={false} mode="popLayout">
              {toCollect.map((d) => <PickupCard key={d._id} donation={d} onDone={reload} />)}
            </AnimatePresence>
            {toCollect.length === 0 && <p className="small muted" style={{ padding: '4px 6px 10px' }}>Accepted offers show up here.</p>}
          </div>
          <div className="board-col">
            <header>
              <span className="row nw" style={{ gap: 8, fontWeight: 800 }}><Truck size={17} /> On the way</span>
              <span className="count">{onWay.length}</span>
            </header>
            <AnimatePresence initial={false} mode="popLayout">
              {onWay.map((d) => <PickupCard key={d._id} donation={d} onDone={reload} />)}
            </AnimatePresence>
            {onWay.length === 0 && <p className="small muted" style={{ padding: '4px 6px 10px' }}>Food you’ve collected and are delivering.</p>}
          </div>
        </div>
      </section>

      <section className="stack" style={{ gap: 14 }}>
        <h3 className="row nw" style={{ gap: 10 }}>Delivered <span className="count">{delivered.length}</span></h3>
        <div className="panel" style={{ padding: 8 }}>
          {delivered.length === 0 && <p className="muted small" style={{ padding: 16 }}>Delivered donations are listed here.</p>}
          <motion.div layout className="list">
            <AnimatePresence initial={false}>
              {delivered.map((d) => (
                <motion.div key={d._id} layout initial={{ opacity: 0, backgroundColor: 'var(--brand-soft)' }} animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }} transition={{ duration: 1.2 }} className="list-row">
                  <CategoryIcon category={d.category} size={40} />
                  <div style={{ minWidth: 0 }}>
                    <div className="truncate" style={{ fontWeight: 700 }}>{d.title}</div>
                    <div className="meta"><span>{donorOf(d)?.name}</span><span>{d.quantity}</span>{d.servings ? <span><Users /> {d.servings}</span> : null}<span>{timeAgo(d.createdAt)}</span></div>
                  </div>
                  <StatusPill status="completed" />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>
    </>
  )
}

function RequestCard({ req, donation: d, onDone }: { req: DonationRequest; donation: Donation; onDone: () => void }) {
  const { user } = useAuth()
  const toast = useToast()
  const now = useNow(1000)
  const [passing, setPassing] = useState(false)
  const donor = donorOf(d)
  const km = req.distanceKm ?? (user?.location ? haversineKm(user.location.coordinates, d.location.coordinates) : undefined)
  const left = Math.max(0, Date.parse(req.expiresAt) - now)

  const accept = async () => {
    try {
      await api.post(`/requests/${req._id}/accept`)
      toast(`Accepted. Call ${donor?.name ?? 'the donor'} to arrange pickup.`)
      onDone()
    } catch (e) {
      toast(errorMessage(e), 'error')
      throw e
    }
  }
  const pass = async () => {
    setPassing(true)
    try {
      await api.post(`/requests/${req._id}/reject`)
      toast('Passed. Offering it to the next nearest NGO.', 'info')
      onDone()
    } catch (e) {
      toast(errorMessage(e), 'error')
      setPassing(false)
    }
  }

  return (
    <motion.article layout className="dcard urgent" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30, scale: 0.95, transition: { duration: 0.3 } }} transition={{ type: 'spring', stiffness: 240, damping: 24 }}>
      <div className="req-grid">
        <div className="stack" style={{ gap: 16 }}>
          <div className="dcard-head">
            <CategoryIcon category={d.category} size={56} />
            <div className="grow stack" style={{ gap: 6 }}>
              <span className="pill pill-pending live" style={{ width: 'fit-content' }}><i />New offer · {formatKm(km ?? 0)} away</span>
              <h3 style={{ fontSize: '1.3rem' }}>{d.title}</h3>
              <div className="meta">
                <span><Package /> {d.quantity}</span>
                {d.servings ? <span><Users /> ~{d.servings} people</span> : null}
                <span><Clock4 /> collect within {timeLeft(d.expiresAt, now)}</span>
              </div>
            </div>
            <Ring progress={left / REQUEST_WINDOW_MS} size={78} stroke={7}>
              <span className="mono" style={{ fontWeight: 800, fontSize: '0.92rem' }}>{timeLeft(req.expiresAt, now)}</span>
              <span className="tiny muted">to reply</span>
            </Ring>
          </div>
          <p style={{ color: 'var(--fg-2)' }}>{d.description}</p>
          <div className="contact">
            <div style={{ minWidth: 0 }}>
              <div className="eyebrow">From</div>
              <b>{donor?.name ?? 'Donor'}</b>
              <div className="small muted row nw" style={{ gap: 5 }}><MapPin size={13} /> <span className="truncate">{d.address}</span></div>
            </div>
          </div>
          <div className="row" style={{ marginTop: 'auto' }}>
            <SlideToAccept onAccept={accept} label="Slide to accept pickup" disabled={passing} />
            <button className="btn btn-ghost btn-lg" onClick={pass} disabled={passing}>
              <X /> {passing ? 'Passing…' : 'Can’t take it'}
            </button>
          </div>
        </div>
        <MapCanvas
          className="tall-req"
          center={d.location.coordinates}
          fitToMarkers={!!user?.location}
          lines={user?.location ? [[user.location.coordinates, d.location.coordinates]] : []}
          markers={[
            { id: 'food', kind: 'food', coords: d.location.coordinates, pulse: true, popup: d.address },
            ...(user?.location ? [{ id: 'me', kind: 'ngo' as const, coords: user.location.coordinates, popup: 'You' }] : []),
          ]}
        />
      </div>
    </motion.article>
  )
}

function PickupCard({ donation: d, onDone }: { donation: Donation; onDone: () => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const donor = donorOf(d)
  const next = d.status === 'reserved' ? 'confirm-pickup' : 'complete'

  const act = async (e: React.MouseEvent) => {
    setBusy(true)
    const { clientX, clientY } = e
    try {
      await api.post(`/donations/${d._id}/${next}`)
      if (next === 'complete') {
        confetti(clientX, clientY)
        toast(`Delivered! ~${d.servings ?? ''} people fed. The donor has been told.`)
      } else toast('Pickup confirmed. Drive safe!')
      onDone()
    } catch (err) {
      toast(errorMessage(err), 'error')
      setBusy(false)
    }
  }

  return (
    <motion.article layout layoutId={`pickup-${d._id}`} className="dcard" style={{ padding: 16, gap: 14 }} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
      <div className="dcard-head">
        <CategoryIcon category={d.category} size={42} />
        <div className="grow" style={{ minWidth: 0 }}>
          <h3 className="truncate" style={{ fontSize: '1rem' }}>{d.title}</h3>
          <div className="meta"><span>{d.quantity}</span>{d.servings ? <span><Users /> {d.servings}</span> : null}</div>
        </div>
      </div>
      <Track status={d.status} />
      <div className="contact" style={{ padding: 10 }}>
        <div style={{ minWidth: 0 }}>
          <b className="small">{donor?.name}</b>
          <div className="tiny muted truncate">{d.address}</div>
        </div>
        {donor?.phoneNumber && <CopyChip text={donor.phoneNumber} />}
      </div>
      <div className="row nw" style={{ gap: 8 }}>
        <button className={`btn ${d.status === 'reserved' ? 'btn-primary' : 'btn-brand'} grow`} onClick={act} disabled={busy}>
          {d.status === 'reserved' ? <><Truck /> {busy ? 'Saving…' : 'Collected it'}</> : <><CheckCircle2 /> {busy ? 'Saving…' : 'Mark delivered'}</>}
        </button>
        <a className="icon-btn" style={{ width: 44, height: 44 }} href={directions(d)} target="_blank" rel="noreferrer" aria-label="Directions">
          <Navigation />
        </a>
      </div>
    </motion.article>
  )
}
