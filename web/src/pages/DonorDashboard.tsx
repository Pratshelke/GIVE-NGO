import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, ArrowRight, Check, ChevronDown, Clock4, HandHeart, History, Loader2, MapPin, Package, Pencil, Plus, Scale, Search, Trash2, Users, UtensilsCrossed, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api, errorMessage } from '../lib/axios'
import { timeAgo, timeLeft, useLiveQuery, useNow } from '../lib/hooks'
import { formatKm } from '../lib/geo'
import type { Donation, DonationRequest } from '../lib/types'
import { AnimatedNumber, CategoryIcon, CopyChip, Empty, Segmented, StatusPill, Track } from '../components/ui'
import { useToast } from '../components/Toast'

const ACTIVE = ['pending', 'reserved', 'in_transit']

export function DonorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | 'completed' | 'expired'>('all')
  const [q, setQ] = useState('')
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
  const kg = completed.reduce((s, d) => s + (/kg/i.test(d.quantity) ? parseFloat(d.quantity) || 0 : 0), 0)

  const weeks = useMemo(() => {
    const out = Array.from({ length: 8 }, (_, i) => ({ label: i === 7 ? 'now' : `${7 - i}w`, v: 0 }))
    const now = Date.now()
    for (const d of completed) {
      const w = Math.floor((now - Date.parse(d.createdAt)) / (7 * 864e5))
      if (w < 8) out[7 - w].v += d.servings ?? 0
    }
    return out
  }, [completed])
  const maxW = Math.max(1, ...weeks.map((w) => w.v))
  const shownPast = past.filter((d) => (filter === 'all' || d.status === filter) && d.title.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <div className="row between">
        <div className="page-title">
          <h2>Namaste, {user?.name.split(' ')[0]}</h2>
          <span className="muted">{active.length ? `${active.length} donation${active.length > 1 ? 's' : ''} on the move right now.` : 'Nothing on the move. Got leftovers today?'}</span>
        </div>
        <button className="btn btn-accent" onClick={() => navigate('/donor/create')}>
          <Plus /> Donate food
        </button>
      </div>

      <section className="impact-hero ink ink-glow">
        <div className="stack" style={{ gap: 10 }}>
          <span className="eyebrow">Your impact</span>
          <div className="giant"><AnimatedNumber value={servings} /></div>
          <span style={{ color: 'var(--ink-muted)' }}>people fed through GiveNGo</span>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <span className="pill pill-ink"><Scale size={13} /> {Math.round(kg)} kg saved</span>
            <span className="pill pill-ink"><HandHeart size={13} /> {ngosHelped} NGOs supported</span>
            <span className="pill pill-ink"><Check size={13} /> {completed.length} delivered</span>
          </div>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <span className="eyebrow">Servings per week</span>
          <div className="bars" role="img" aria-label="Servings delivered per week, last 8 weeks">
            {weeks.map((w, i) => (
              <div key={i} className="bar-col" title={`${w.v} servings`}>
                <motion.div className={`bar ${i === 7 ? 'now' : ''}`} style={{ height: `${(w.v / maxW) * 100}%` }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.05 * i, type: 'spring', stiffness: 140, damping: 18 }} />
                <span>{w.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error ? <div className="form-error"><AlertCircle /> {errorMessage(error, 'Could not load donations.')}</div> : null}

      <section className="stack" style={{ gap: 14 }}>
        <div className="row between">
          <h3 className="row nw" style={{ gap: 10 }}>Live tracking <span className="count">{active.length}</span></h3>
        </div>
        {loading && <div className="skeleton" style={{ height: 220 }} />}
        {!loading && active.length === 0 && (
          <Empty icon={UtensilsCrossed} title="Nothing on the move" action={<button className="btn btn-primary" onClick={() => navigate('/donor/create')}>Post leftover food <ArrowRight /></button>}>
            Post leftovers and the nearest free NGO is offered them within seconds.
          </Empty>
        )}
        <motion.div layout className="stack" style={{ gap: 14 }}>
          <AnimatePresence initial={false}>
            {active.map((d) => (
              <LiveCard key={d._id} donation={d} onChanged={reload} />
            ))}
          </AnimatePresence>
        </motion.div>
      </section>

      <section className="stack" style={{ gap: 14 }}>
        <div className="row between">
          <h3 className="row nw" style={{ gap: 10 }}><History size={18} /> History</h3>
          <div className="row" style={{ gap: 8 }}>
            <div className="input-group" style={{ width: 200 }}>
              <Search />
              <input id="hist-q" className="input" style={{ padding: '9px 12px 9px 40px' }} placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Segmented id="hist" label="Filter history" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'completed', label: 'Delivered' }, { value: 'expired', label: 'Expired' }]} />
          </div>
        </div>
        <div className="panel" style={{ padding: 8 }}>
          {shownPast.length === 0 && <p className="muted small" style={{ padding: 16 }}>No past donations match.</p>}
          <motion.div layout className="list">
            <AnimatePresence initial={false}>
              {shownPast.map((d) => (
                <motion.div key={d._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="list-row">
                  <CategoryIcon category={d.category} size={40} />
                  <div style={{ minWidth: 0 }}>
                    <div className="truncate" style={{ fontWeight: 700 }}>{d.title}</div>
                    <div className="meta">
                      <span>{d.quantity}</span>
                      {d.servings ? <span><Users /> {d.servings}</span> : null}
                      {d.currentNgoId && <span><HandHeart /> {d.currentNgoId.name}</span>}
                      <span>{timeAgo(d.createdAt)}</span>
                    </div>
                  </div>
                  <StatusPill status={d.status} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>
    </>
  )
}

function LiveCard({ donation: d, onChanged }: { donation: Donation; onChanged: () => void }) {
  const toast = useToast()
  const now = useNow(1000)
  const [open, setOpen] = useState(d.status === 'pending')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [editing, setEditing] = useState(false)
  const { data: log } = useLiveQuery(async () => (await api.get(`/donations/${d._id}/requests`)).data.requests as DonationRequest[], [d._id, d.status], 4000)
  const ngo = d.currentNgoId
  const waiting = log?.find((r) => r.status === 'pending')

  const cancel = async () => {
    try {
      await api.delete(`/donations/${d._id}`)
      toast('Donation cancelled.')
      onChanged()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <motion.article layout className={`dcard ${d.status === 'pending' ? 'urgent' : ''}`} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 60, transition: { duration: 0.25 } }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
      <div className="dcard-head">
        <CategoryIcon category={d.category} />
        <div className="grow stack" style={{ gap: 6 }}>
          <div className="row between nw" style={{ alignItems: 'flex-start' }}>
            <h3>{d.title}</h3>
            <StatusPill status={d.status} />
          </div>
          <div className="meta">
            <span><Package /> {d.quantity}</span>
            {d.servings ? <span><Users /> ~{d.servings} people</span> : null}
            <span><Clock4 /> posted {timeAgo(d.createdAt, now)}</span>
            {d.status === 'pending' && <span className="mono" style={{ color: 'var(--accent-text)' }}>{timeLeft(d.expiresAt, now)} left to collect</span>}
          </div>
        </div>
      </div>

      <Track status={d.status} />

      <AnimatePresence mode="wait">
        {d.status === 'pending' && (
          <motion.div key="wait" className="contact" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ background: 'var(--accent-soft)' }}>
            <div className="row nw" style={{ gap: 10 }}>
              <Loader2 size={18} style={{ animation: 'spin 1.2s linear infinite', color: 'var(--accent-text)' }} />
              <span className="small" style={{ fontWeight: 700 }}>
                {waiting ? <>Offered to {waiting.ngoName} · waiting for a reply ({timeLeft(waiting.expiresAt, now)})</> : 'Finding the nearest available NGO…'}
              </span>
            </div>
          </motion.div>
        )}
        {ngo && d.status !== 'pending' && (
          <motion.div key="ngo" className="contact" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="row nw" style={{ gap: 12 }}>
              <span className="avatar">{ngo.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
              <div>
                <div className="eyebrow">{d.status === 'reserved' ? 'Coming to collect' : 'On the way to deliver'}</div>
                <b>{ngo.name}</b>
              </div>
            </div>
            {ngo.phoneNumber && <CopyChip text={ngo.phoneNumber} />}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="row between">
        <button className="btn btn-sm btn-soft" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          Dispatch log
          <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ display: 'grid' }}><ChevronDown /></motion.span>
        </button>
        {d.status === 'pending' && (
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-sm btn-ghost" onClick={() => setEditing(true)}><Pencil /> Edit</button>
            <AnimatePresence mode="wait" initial={false}>
              {confirmCancel ? (
                <motion.div key="c" className="row nw" style={{ gap: 6 }} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                  <button className="btn btn-sm btn-danger" onClick={cancel}>Yes, cancel</button>
                  <button className="icon-btn" style={{ width: 36, height: 36 }} aria-label="Keep donation" onClick={() => setConfirmCancel(false)}><X /></button>
                </motion.div>
              ) : (
                <motion.button key="b" className="btn btn-sm btn-danger" onClick={() => setConfirmCancel(true)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Trash2 /> Cancel
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <ul className="log" style={{ paddingTop: 4 }}>
              <li>
                <span className="node ok"><Check /></span>
                <span>Posted from <b>{d.address}</b></span>
                <span className="mono tiny muted">{new Date(d.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
              </li>
              {(log ?? []).map((r) => (
                <motion.li key={r._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
                  <span className={`node ${r.status === 'accepted' ? 'ok' : r.status === 'pending' ? 'live' : ''}`}>
                    {r.status === 'accepted' ? <Check /> : r.status === 'pending' ? <Clock4 /> : <X />}
                  </span>
                  <span>
                    Offered to <b>{r.ngoName}</b>
                    {r.distanceKm != null && <span className="muted"> · {formatKm(r.distanceKm)}</span>}
                    <br />
                    <span className="small muted">
                      {r.status === 'pending' ? `Deciding · ${timeLeft(r.expiresAt, now)} left` : r.status === 'accepted' ? 'Accepted the pickup' : r.status === 'expired' ? 'No reply in time, moved on' : 'Couldn’t take it, moved to the next nearest'}
                    </span>
                  </span>
                  <span className="mono tiny muted">{new Date(r.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                </motion.li>
              ))}
            </ul>
            <p className="tiny muted row nw" style={{ gap: 6, marginTop: 10 }}><MapPin size={13} /> {d.address}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{editing && <EditModal donation={d} onClose={() => setEditing(false)} onSaved={onChanged} />}</AnimatePresence>
    </motion.article>
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
    <motion.div className="scrim" style={{ placeItems: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-title" initial={{ y: 30, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="row between nw">
          <h3 id="edit-title">Edit donation</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        {error && <div className="form-error"><AlertCircle /> {error}</div>}
        <div className="field">
          <label className="label" htmlFor="edit-t">Title</label>
          <input id="edit-t" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid-2">
          <div className="field">
            <label className="label" htmlFor="edit-q">Quantity</label>
            <input id="edit-q" className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="edit-s">Feeds about</label>
            <input id="edit-s" className="input" type="number" value={servings} onChange={(e) => setServings(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="edit-d">Notes</label>
          <textarea id="edit-d" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </motion.div>
    </motion.div>
  )
}
