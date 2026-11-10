import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, ArrowLeft, ArrowRight, Check, Minus, Plus, Send } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api, errorMessage } from '../lib/axios'
import { useLiveQuery } from '../lib/hooks'
import { formatKm, haversineKm, MAX_DISTANCE_KM } from '../lib/geo'
import type { Category, NgoPin } from '../lib/types'
import { LocationPicker } from '../components/LocationPicker'
import type { PickedLocation } from '../components/LocationPicker'
import { MapCanvas } from '../components/MapCanvas'
import { CATEGORIES, catOf, Segmented } from '../components/ui'
import { confetti } from '../lib/confetti'

const UNITS = ['kg', 'plates', 'boxes', 'pieces', 'litres'] as const
type Unit = (typeof UNITS)[number]
const PER_UNIT: Record<Unit, number> = { kg: 4, plates: 1, boxes: 1, pieces: 0.5, litres: 2 }
const WINDOWS = [
  { h: 1, label: '1 hr' },
  { h: 2, label: '2 hrs' },
  { h: 4, label: '4 hrs' },
  { h: 8, label: 'Today' },
]
const TAGS = ['Veg', 'Non-veg', 'Jain', 'Cooked within 2 hrs', 'Refrigerated', 'Bring containers', 'Sealed packs']
const STEP_LABELS = ['Food', 'Amount & time', 'Pickup']

export function CreateDonationPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [category, setCategory] = useState<Category>('cooked')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>(['Veg'])
  const [notes, setNotes] = useState('')
  const [amount, setAmount] = useState(10)
  const [unit, setUnit] = useState<Unit>('kg')
  const [servings, setServings] = useState(40)
  const [servingsTouched, setServingsTouched] = useState(false)
  const [windowH, setWindowH] = useState(2)
  const [safe, setSafe] = useState(false)
  const [loc, setLoc] = useState<PickedLocation | null>(user?.location ? { address: user.address ?? 'My saved location', coords: user.location.coordinates } : null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const { data: ngos } = useLiveQuery(async () => (await api.get('/ngos')).data.ngos as NgoPin[], [], 15000)

  useEffect(() => {
    if (!servingsTouched) setServings(Math.max(1, Math.round(amount * PER_UNIT[unit])))
  }, [amount, unit, servingsTouched])

  const ranked = useMemo(() => {
    if (!loc || !ngos) return []
    return ngos
      .filter((n) => n.isAvailable)
      .map((n) => ({ ...n, km: haversineKm(loc.coords, n.location.coordinates) }))
      .filter((n) => n.km <= MAX_DISTANCE_KM)
      .sort((a, b) => a.km - b.km)
  }, [loc, ngos])

  const cat = catOf(category)
  const effectiveTitle = title.trim() || `${cat.label}`
  const description = [tags.join(' · '), notes.trim()].filter(Boolean).join('. ') || `${cat.label} ready for pickup.`

  const validate = (s: number) => {
    if (s === 0 && !title.trim()) return 'Give it a short title, like “Veg pulao from lunch buffet”.'
    if (s === 1 && (!amount || amount <= 0)) return 'Enter how much food there is.'
    if (s === 2 && !loc) return 'Choose where the NGO should collect it.'
    if (s === 2 && !safe) return 'Please confirm the food is safe to eat.'
    return ''
  }
  const goto = (s: number) => {
    if (s > step) {
      for (let i = step; i < s; i++) {
        const e = validate(i)
        if (e) return setError(e)
      }
    }
    setError('')
    setDir(s > step ? 1 : -1)
    setStep(s)
  }

  const submit = async () => {
    const e = validate(2) || validate(0)
    if (e) return setError(e)
    setBusy(true)
    try {
      await api.post('/donations', {
        title: effectiveTitle,
        quantity: `${amount} ${unit}`,
        servings,
        category,
        description,
        address: loc!.address,
        location: { type: 'Point', coordinates: loc!.coords },
        expiresAt: new Date(Date.now() + windowH * 3600_000).toISOString(),
      })
      setDone(ranked[0]?.name ?? '')
      confetti(window.innerWidth / 2, window.innerHeight / 2.5)
    } catch (err) {
      setError(errorMessage(err, 'Could not post the donation.'))
    } finally {
      setBusy(false)
    }
  }

  if (done !== null) {
    return (
      <motion.div className="panel lift success" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
        <motion.div className="check-big" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 13 }}>
          <Check />
        </motion.div>
        <h2>Posted. Help is on the way.</h2>
        <p className="muted" style={{ maxWidth: '30em' }}>
          {done ? <>We’ve offered it to <b>{done}</b>, the nearest NGO with room right now. You’ll get a notification the moment they accept.</> : 'No NGO is free within 20 km at the moment. Your post stays open and the first one to come online gets it.'}
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/donor')}>Track it live <ArrowRight /></button>
          <button className="btn btn-ghost btn-lg" onClick={() => (setDone(null), setStep(0), setTitle(''), setNotes(''), setSafe(false))}>Post another</button>
        </div>
      </motion.div>
    )
  }

  return (
    <>
      <div className="page-title">
        <h2>What’s left over today?</h2>
        <span className="muted">Three quick steps. The nearest free NGO is offered it the moment you post.</span>
      </div>
      <div className="wizard">
        <div className="panel lift pad-lg stack" style={{ gap: 22 }}>
          <div className="steps-bar">
            {STEP_LABELS.map((l, i) => (
              <button key={l} type="button" aria-current={i === step ? 'step' : undefined} onClick={() => goto(i)}>
                <span className="bar"><motion.span initial={false} animate={{ scaleX: i <= step ? 1 : 0 }} transition={{ type: 'spring', stiffness: 160, damping: 22 }} /></span>
                <span className="lbl">{i + 1}. {l}</span>
              </button>
            ))}
          </div>

          <AnimatePresence>
            {error && (
              <motion.div className="form-error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <AlertCircle /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ position: 'relative', minHeight: 360 }}>
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div key={step} custom={dir} initial={{ opacity: 0, x: 40 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 * dir }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="stack" style={{ gap: 20 }}>
                {step === 0 && (
                  <>
                    <div className="field">
                      <span className="label">Type of food</span>
                      <div className="cat-grid">
                        {CATEGORIES.map((c) => {
                          const Icon = c.icon
                          return (
                            <motion.button type="button" key={c.key} className="cat-tile" aria-pressed={category === c.key} onClick={() => setCategory(c.key)} whileTap={{ scale: 0.96 }}>
                              <span className="cat-ico" style={{ width: 40, height: 40, background: `color-mix(in srgb, ${c.tint} 16%, transparent)`, color: c.tint }}><Icon /></span>
                              <span>
                                <b className="small">{c.label}</b>
                                <span className="tiny muted" style={{ display: 'block' }}>{c.hint}</span>
                              </span>
                              <AnimatePresence>
                                {category === c.key && (
                                  <motion.span className="tick" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check /></motion.span>
                                )}
                              </AnimatePresence>
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="don-title">Title</label>
                      <input id="don-title" className="input xl" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Veg pulao from lunch buffet" onKeyDown={(e) => e.key === 'Enter' && goto(1)} />
                    </div>
                    <div className="field">
                      <span className="label">Tags</span>
                      <div className="chips">
                        {TAGS.map((t) => (
                          <button type="button" key={t} className="chip" aria-pressed={tags.includes(t)} onClick={() => setTags((v) => (v.includes(t) ? v.filter((x) => x !== t) : [...v, t]))}>
                            {tags.includes(t) && <Check />}
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="don-notes">Anything else the NGO should know?</label>
                      <textarea id="don-notes" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ask for Ramesh at the back gate. Packed in 6 steel trays." />
                    </div>
                  </>
                )}

                {step === 1 && (
                  <>
                    <div className="field">
                      <span className="label">How much?</span>
                      <div className="grid-2" style={{ alignItems: 'center' }}>
                        <div className="qty">
                          <button type="button" aria-label="Less" onClick={() => setAmount((a) => Math.max(1, a - 1))}><Minus /></button>
                          <input id="don-amount" type="number" min={1} value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))} aria-label="Amount" />
                          <button type="button" aria-label="More" onClick={() => setAmount((a) => a + 1)}><Plus /></button>
                        </div>
                        <Segmented id="unit" label="Unit" value={unit} onChange={setUnit} options={UNITS.map((u) => ({ value: u, label: u }))} />
                      </div>
                    </div>
                    <div className="field">
                      <span className="label">Feeds about</span>
                      <div className="feeds">
                        <motion.span key={servings} className="big" initial={{ y: 6, opacity: 0.5 }} animate={{ y: 0, opacity: 1 }}>{servings}</motion.span>
                        <span className="muted">people</span>
                      </div>
                      <input
                        id="don-servings"
                        className="range"
                        type="range"
                        min={1}
                        max={300}
                        value={servings}
                        onChange={(e) => {
                          setServingsTouched(true)
                          setServings(Number(e.target.value))
                        }}
                        aria-label="Number of people it feeds"
                      />
                      <span className="hint">{servingsTouched ? 'Set by you.' : `Estimated from ${amount} ${unit}. Drag to adjust.`}</span>
                    </div>
                    <div className="field">
                      <span className="label">Must be collected within</span>
                      <Segmented id="win" label="Pickup window" value={windowH} onChange={setWindowH} options={WINDOWS.map((w) => ({ value: w.h, label: w.label }))} />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <LocationPicker value={loc} onChange={setLoc} idPrefix="don-loc" />
                    <label className="check">
                      <input id="don-safe" type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} />
                      <span className="small">The food is fresh, stored safely and fit to eat. I’ll hand it over within the pickup window.</span>
                    </label>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="row between">
            <button type="button" className="btn btn-ghost" onClick={() => (step ? goto(step - 1) : navigate('/donor'))}>
              <ArrowLeft /> {step ? 'Back' : 'Cancel'}
            </button>
            {step < 2 ? (
              <button type="button" className="btn btn-primary btn-lg" onClick={() => goto(step + 1)}>
                Continue <ArrowRight />
              </button>
            ) : (
              <button type="button" className="btn btn-accent btn-lg" onClick={submit} disabled={busy}>
                {busy ? 'Posting…' : <>Post donation <Send /></>}
              </button>
            )}
          </div>
        </div>

        <aside className="stack" style={{ gap: 14, position: 'sticky', top: 80 }}>
          <div className="preview-ticket">
            <div className="pt-top">
              <div className="row between nw">
                <span className="eyebrow">Live preview</span>
                <span className="pill pill-ink tiny">Not posted yet</span>
              </div>
              <div className="row nw" style={{ gap: 12 }}>
                <span className="cat-ico" style={{ background: `color-mix(in srgb, ${cat.tint} 25%, transparent)`, color: cat.tint }}><cat.icon /></span>
                <div style={{ minWidth: 0 }}>
                  <AnimatePresence mode="wait">
                    <motion.h3 key={effectiveTitle} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ overflowWrap: 'anywhere' }}>{effectiveTitle}</motion.h3>
                  </AnimatePresence>
                  <span className="small" style={{ color: 'var(--ink-muted)' }}>{user?.name}</span>
                </div>
              </div>
              {tags.length > 0 && (
                <div className="row" style={{ gap: 6 }}>
                  {tags.map((t) => <span key={t} className="pill pill-ink tiny">{t}</span>)}
                </div>
              )}
            </div>
            <div className="pt-cut" />
            <div className="pt-bot">
              <div className="pt-row"><span>Quantity</span><span className="mono">{amount} {unit}</span></div>
              <div className="pt-row"><span>Feeds</span><span className="mono">~{servings} people</span></div>
              <div className="pt-row"><span>Collect within</span><span className="mono">{WINDOWS.find((w) => w.h === windowH)?.label}</span></div>
              <div className="pt-row"><span>Pickup</span><span>{loc?.address ?? '—'}</span></div>
              <div className="pt-row"><span>First offer to</span><span style={{ color: 'var(--accent)' }}>{ranked[0] ? `${ranked[0].name} · ${formatKm(ranked[0].km)}` : loc ? 'No NGO free nearby' : '—'}</span></div>
            </div>
          </div>
          {loc && ranked.length > 0 && (
            <div className="panel stack" style={{ gap: 12 }}>
              <span className="eyebrow">Dispatch order</span>
              <ul className="log">
                {ranked.slice(0, 4).map((n, i) => (
                  <motion.li key={n._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <span className={`node ${i === 0 ? 'live' : ''}`}><span className="mono" style={{ fontSize: 10 }}>{i + 1}</span></span>
                    <span><b>{n.name}</b><br /><span className="tiny muted">{i === 0 ? 'Asked first · 10 min to reply' : `If #${i} passes`}</span></span>
                    <span className="mono tiny">{formatKm(n.km)}</span>
                  </motion.li>
                ))}
              </ul>
              {step === 2 && (
                <MapCanvas
                  className="short"
                  center={loc.coords}
                  fitToMarkers
                  lines={[[loc.coords, ranked[0].location.coordinates]]}
                  markers={[
                    { id: 'me', kind: 'food', coords: loc.coords },
                    ...ranked.slice(0, 4).map((n, i) => ({ id: n._id, kind: 'ngo' as const, pulse: i === 0, coords: n.location.coordinates, popup: <b>{n.name}</b> })),
                  ]}
                />
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
