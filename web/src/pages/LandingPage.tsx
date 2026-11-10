import { useEffect, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { ArrowRight, ArrowUpRight, Check, Clock4, HandHeart, MapPinned, PauseCircle, Route, Smartphone, Soup, Truck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api, DEMO_MODE } from '../lib/axios'
import { DEMO_ACCOUNTS } from '../lib/demo/store'
import { useLiveQuery } from '../lib/hooks'
import type { Donation, NgoPin, PublicStats } from '../lib/types'
import { DispatchRadar } from '../components/DispatchRadar'
import { AnimatedNumber, CategoryIcon, Logo, Ring, spotlight } from '../components/ui'

const wordIn = {
  hidden: { opacity: 0, y: '0.5em', filter: 'blur(8px)' },
  show: (i: number) => ({ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: 0.08 * i, type: 'spring' as const, stiffness: 140, damping: 18 } }),
}

export function LandingPage() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const { data: stats } = useLiveQuery(async () => (await api.get('/stats')).data.stats as PublicStats)
  const { data: ngos } = useLiveQuery(async () => (await api.get('/ngos')).data.ngos as NgoPin[], [], 8000)
  const { data: live } = useLiveQuery(async () => (await api.get('/donations/public')).data.donations as Donation[], [], 6000)
  const online = (ngos ?? []).filter((n) => n.isAvailable).length

  const tryAs = async (role: 'donor' | 'ngo') => {
    await login(DEMO_ACCOUNTS[role].email, DEMO_ACCOUNTS[role].password)
    navigate(role === 'ngo' ? '/ngo' : '/donor')
  }
  const start = (role: 'Donor' | 'NGO') => (user ? navigate(user.role === 'NGO' ? '/ngo' : '/donor') : navigate(`/register?role=${role}`))

  const headline = ['Leftover', 'food,', 'to', 'the', 'nearest', 'NGO.', 'In', 'minutes.']

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="ink ink-glow hero">
        <div className="container hero-grid">
          <div className="stack" style={{ gap: 26 }}>
            <motion.div className="live-pill" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <b>LIVE</b>
              Pune · {online || '—'} NGOs ready to collect
            </motion.div>
            <h1 aria-label={headline.join(' ')}>
              {headline.map((w, i) => (
                <motion.span key={i} className={`word ${i === 4 || i === 5 ? 'hl' : ''}`} custom={i} variants={wordIn} initial="hidden" animate="show" aria-hidden="true">
                  {w}&nbsp;
                </motion.span>
              ))}
            </h1>
            <motion.p className="lede" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
              Kitchens post surplus food. GiveNGo offers it to the closest NGO that's free right now, then the next, until a van is on its way. Nobody gets spammed, nothing goes to waste.
            </motion.p>
            <motion.div className="row" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}>
              <button className="btn btn-accent btn-lg" onClick={() => start('Donor')}>
                <Soup /> Donate surplus food
              </button>
              <button className="btn btn-ink-ghost btn-lg" onClick={() => start('NGO')}>
                I run an NGO <ArrowRight />
              </button>
            </motion.div>
            {DEMO_MODE && !user && (
              <motion.div className="row small" style={{ color: 'var(--ink-muted)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
                Or jump in as
                <button className="btn btn-sm btn-ink-ghost" onClick={() => tryAs('donor')}>
                  a restaurant
                </button>
                <button className="btn btn-sm btn-ink-ghost" onClick={() => tryAs('ngo')}>
                  a food bank
                </button>
              </motion.div>
            )}
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.3, type: 'spring', stiffness: 90, damping: 20 }}>
            <DispatchRadar ngos={ngos ?? []} />
          </motion.div>
        </div>
        <Ticker live={live ?? []} />
      </section>

      {/* ---------------- NUMBERS ---------------- */}
      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Impact, counted live</span>
            <h2>Every plate is logged from kitchen to shelter.</h2>
          </div>
          <div className="bignums">
            <div>
              <span className="num"><AnimatedNumber value={stats?.mealsServed ?? 0} /></span>
              <span className="muted small">servings delivered</span>
            </div>
            <div>
              <span className="num"><AnimatedNumber value={stats?.kgSaved ?? 0} /><small>kg</small></span>
              <span className="muted small">food kept out of landfill</span>
            </div>
            <div>
              <span className="num"><AnimatedNumber value={stats?.donationsCompleted ?? 0} /></span>
              <span className="muted small">pickups completed</span>
            </div>
            <div>
              <span className="num" style={{ color: 'var(--accent-text)' }}><AnimatedNumber value={stats?.activeDonations ?? 0} /></span>
              <span className="muted small">moving right now</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- HOW ---------------- */}
      <section className="section" id="how">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">How a pickup happens</span>
            <h2>Four steps. Usually under fifteen minutes.</h2>
          </div>
          <HowItWorks />
        </div>
      </section>

      {/* ---------------- BENTO ---------------- */}
      <section className="section" style={{ background: 'var(--bg-2)', borderBlock: '1px solid var(--line)' }}>
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Built for real kitchens and real vans</span>
            <h2>Fair to NGOs. Fast for donors.</h2>
          </div>
          <Bento />
        </div>
      </section>

      {/* ---------------- ROLES ---------------- */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Get started</span>
            <h2>Which side of the plate are you on?</h2>
          </div>
          <div className="roles">
            <TiltCard onClick={() => (DEMO_MODE && !user ? tryAs('donor') : start('Donor'))}>
              <div className="stack" style={{ gap: 14 }}>
                <span className="eyebrow">Restaurants · caterers · homes</span>
                <h3>I have food to give</h3>
                <p className="muted" style={{ maxWidth: '30em' }}>Post in under a minute. See who's collecting, get their number, and a note when it's delivered.</p>
              </div>
              <div className="row between nw">
                <span className="small" style={{ fontWeight: 700 }}>{DEMO_MODE && !user ? 'Try as Annapurna Kitchens' : 'Start donating'}</span>
                <span className="go"><ArrowUpRight /></span>
              </div>
            </TiltCard>
            <TiltCard dark onClick={() => (DEMO_MODE && !user ? tryAs('ngo') : start('NGO'))}>
              <div className="stack" style={{ gap: 14 }}>
                <span className="eyebrow">Food banks · shelters · community kitchens</span>
                <h3>We feed people</h3>
                <p className="muted" style={{ maxWidth: '30em' }}>Get offers from donors near you with ten minutes to decide. Pause anytime your kitchen is full.</p>
              </div>
              <div className="row between nw">
                <span className="small" style={{ fontWeight: 700 }}>{DEMO_MODE && !user ? 'Try as Seva Food Bank' : 'Register your NGO'}</span>
                <span className="go"><ArrowUpRight /></span>
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      <footer className="footer-big">
        <div className="container stack" style={{ gap: 28 }}>
          <div className="row between">
            <div className="brand">
              <span className="brand-mark"><Logo /></span>GiveNGo
            </div>
            <div className="row small muted">
              <button className="btn btn-sm btn-ghost" onClick={() => navigate('/map')}><MapPinned /> Live map</button>
              <span>{DEMO_MODE ? 'Demo data lives in this browser only.' : 'Connected to GiveNGo server.'}</span>
              <span>Map data © OpenStreetMap</span>
            </div>
          </div>
          <div className="footer-word" aria-hidden="true">GiveNGo</div>
        </div>
      </footer>
    </>
  )
}

function Ticker({ live }: { live: Donation[] }) {
  const items = [
    ...live.map((d) => ({
      icon: d.status === 'pending' ? Clock4 : Truck,
      text: (
        <>
          <b>{typeof d.donorId === 'object' ? d.donorId.name : 'A donor'}</b> · {d.title} · {d.status === 'pending' ? 'finding an NGO' : `with ${d.currentNgoId?.name}`}
        </>
      ),
    })),
    { icon: Check, text: <><b>Annapurna Kitchens → Seva Food Bank</b> · rice, sambar &amp; sabzi · 48 servings</> },
    { icon: Check, text: <><b>Hotel Blue Lotus → Sahara Old Age Home</b> · pulao &amp; raita · 60 servings</> },
    { icon: Check, text: <><b>Daily Bread Bakery → Seva Food Bank</b> · 45 bread loaves</> },
    { icon: Check, text: <><b>Annapurna Kitchens → Little Hands Orphanage</b> · thali meals · 85 servings</> },
  ]
  const loop = [...items, ...items]
  return (
    <div className="ticker" aria-label="Recent activity">
      <div className="ticker-track">
        {loop.map((it, i) => {
          const Icon = it.icon
          return (
            <span className="ticker-item" key={i} aria-hidden={i >= items.length}>
              <Icon /> {it.text}
            </span>
          )
        })}
      </div>
    </div>
  )
}

const STEPS = [
  { title: 'Post the food', body: 'Pick the type, say how much, drop a pin. The form takes about 40 seconds.' },
  { title: 'Nearest NGO gets the offer', body: 'Available NGOs within 20 km are ranked by distance. Only the closest one is asked.' },
  { title: 'Ten minutes to answer', body: "They slide to accept or pass. Silence counts as a pass, so food never waits on someone who's busy." },
  { title: 'Picked up and delivered', body: "The donor sees who's coming and gets a note with how many people were fed." },
]
const STEP_MS = 5200

function HowItWorks() {
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    const t = window.setTimeout(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS)
    return () => window.clearTimeout(t)
  }, [step, paused])

  return (
    <div className="howto" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="howto-steps" role="tablist" aria-label="Steps">
        {STEPS.map((s, i) => (
          <button key={s.title} className="howto-step" role="tab" aria-selected={i === step} onClick={() => setStep(i)}>
            {i === step && <motion.span layoutId="howto-bg" className="s-bg" transition={{ type: 'spring', stiffness: 300, damping: 32 }} />}
            <span className="s-num">0{i + 1}</span>
            <span className="stack" style={{ gap: 6 }}>
              <h3>{s.title}</h3>
              <AnimatePresence initial={false}>
                {i === step && (
                  <motion.span initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                    <span className="muted" style={{ display: 'block' }}>{s.body}</span>
                    <span className="s-progress" style={{ display: 'block' }}>
                      <motion.span key={`${step}-${paused}`} initial={{ scaleX: 0 }} animate={{ scaleX: paused ? 0 : 1 }} transition={{ duration: paused ? 0 : STEP_MS / 1000, ease: 'linear' }} />
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </button>
        ))}
      </div>
      <div className="howto-stage">
        <div className="phone">
          <div className="phone-notch" />
          <AnimatePresence mode="wait">
            <motion.div key={step} className="stack" style={{ gap: 10, minHeight: 330 }} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
              {step === 0 && <PhonePost />}
              {step === 1 && <PhoneMatch />}
              {step === 2 && <PhoneRespond />}
              {step === 3 && <PhoneDone />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function PhonePost() {
  return (
    <>
      <span className="eyebrow">New donation</span>
      <div className="chips">
        <span className="chip" aria-pressed="true">Cooked meals</span>
        <span className="chip">Bakery</span>
        <span className="chip">Fruit &amp; veg</span>
      </div>
      <div className="input" style={{ fontWeight: 600 }}>Veg biryani &amp; dal</div>
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="input">18 kg</div>
        <div className="input">~70 people</div>
      </div>
      <div className="input muted">MG Road, Camp</div>
      <motion.div className="btn btn-primary btn-block" animate={{ scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}>
        Post donation
      </motion.div>
    </>
  )
}
function PhoneMatch() {
  const list = [
    ['Sahara Old Age Home', '0.8 km'],
    ['Seva Food Bank', '3.6 km'],
    ['Roti Ghar Trust', '4.4 km'],
  ]
  return (
    <>
      <span className="eyebrow">Who gets asked first</span>
      {list.map(([n, d], i) => (
        <motion.div key={n} className="contact" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 * i }} style={i === 0 ? { background: 'var(--accent-soft)' } : undefined}>
          <span className="row nw" style={{ gap: 10 }}>
            <span className="mono tiny" style={{ fontWeight: 700 }}>{i + 1}</span>
            <b className="small">{n}</b>
          </span>
          <span className="mono tiny">{d}</span>
        </motion.div>
      ))}
      <p className="small muted">Only #1 is notified. The rest wait their turn.</p>
    </>
  )
}
function PhoneRespond() {
  const [p, setP] = useState(1)
  useEffect(() => {
    const t = window.setInterval(() => setP((v) => (v <= 0.05 ? 1 : v - 0.05)), 250)
    return () => window.clearInterval(t)
  }, [])
  return (
    <>
      <div className="row between nw">
        <span className="eyebrow">New pickup request</span>
        <Ring progress={p} size={52} stroke={5}>
          <span className="mono tiny" style={{ fontWeight: 700 }}>{Math.ceil(p * 10)}m</span>
        </Ring>
      </div>
      <div className="row nw">
        <CategoryIcon category="cooked" size={42} />
        <div>
          <b>Veg biryani &amp; dal</b>
          <div className="small muted">18 kg · 3.6 km away</div>
        </div>
      </div>
      <div className="contact small">Hotel Blue Lotus · MG Road</div>
      <div className="slider-accept" style={{ flex: 'none' }}>
        <motion.div className="s-thumb" animate={{ x: [0, 180, 180, 0] }} transition={{ repeat: Infinity, duration: 2.6, times: [0, 0.5, 0.8, 1] }}>
          <ArrowRight />
        </motion.div>
        <div className="s-label"><span>Slide to accept</span></div>
      </div>
      <div className="btn btn-ghost btn-block btn-sm">Can't take it</div>
    </>
  )
}
function PhoneDone() {
  return (
    <div className="stack" style={{ alignItems: 'center', textAlign: 'center', gap: 14, paddingTop: 30 }}>
      <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} style={{ width: 76, height: 76, borderRadius: 24, background: 'var(--leaf)', color: '#fff', display: 'grid', placeItems: 'center' }}>
        <Check size={38} />
      </motion.div>
      <h3>Delivered</h3>
      <p className="small muted">Seva Food Bank delivered your biryani. About 70 people ate tonight.</p>
      <div className="track" style={{ width: '100%' }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="track-step done"><div className="track-bar"><span /></div></div>
        ))}
      </div>
    </div>
  )
}

function Bento() {
  const [paused, setPaused] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setTick((v) => v + 1), 1200)
    return () => window.clearInterval(t)
  }, [])
  const bars = [32, 48, 41, 66, 58, 80, 72]
  return (
    <div className="bento">
      <div className="panel spot b-4" onMouseMove={spotlight}>
        <div className="b-ico"><Route /></div>
        <h3>One NGO at a time, nearest first</h3>
        <p className="muted" style={{ maxWidth: '34em' }}>Broadcasting to everyone causes three vans for one tray. GiveNGo asks in order of distance, so the closest free team gets it and nobody else is disturbed.</p>
        <div className="row" style={{ gap: 8, marginTop: 'auto' }}>
          {['0.8 km', '3.6 km', '4.4 km', '5.7 km', '7.9 km'].map((d, i) => (
            <motion.span key={d} className="pill" animate={{ background: i === tick % 5 ? 'var(--accent)' : 'var(--surface-2)', color: i === tick % 5 ? 'var(--accent-ink)' : 'var(--muted)' }} transition={{ duration: 0.3 }}>
              <i />#{i + 1} · {d}
            </motion.span>
          ))}
        </div>
      </div>
      <div className="panel spot b-2" onMouseMove={spotlight}>
        <div className="row between nw">
          <div className="b-ico"><Clock4 /></div>
          <Ring progress={1 - (tick % 10) / 10} size={56}>
            <span className="mono tiny" style={{ fontWeight: 700 }}>{10 - (tick % 10)}m</span>
          </Ring>
        </div>
        <h3>Ten-minute window</h3>
        <p className="muted small">Hot food can't wait for an inbox. No answer means it moves on.</p>
      </div>
      <div className="panel spot b-2" onMouseMove={spotlight}>
        <div className="b-ico"><HandHeart /></div>
        <h3>Every serving counted</h3>
        <div className="bars" style={{ height: 80, marginTop: 'auto' }}>
          {bars.map((b, i) => (
            <div key={i} className="bar-col">
              <motion.div className="bar" style={{ height: `${b}%`, background: i === bars.length - 1 ? 'var(--accent)' : 'var(--surface-3)' }} initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06, type: 'spring', stiffness: 120, damping: 16 }} />
            </div>
          ))}
        </div>
      </div>
      <div className="panel spot b-2" onMouseMove={spotlight}>
        <div className="row between nw">
          <div className="b-ico"><PauseCircle /></div>
          <button className="switch" role="switch" aria-checked={!paused} aria-label="Try the availability switch" onClick={() => setPaused((p) => !p)} />
        </div>
        <h3>{paused ? 'Paused. Offers skip you.' : 'Accepting pickups'}</h3>
        <p className="muted small">Kitchen full or van out? NGOs flip one switch and the dispatcher routes around them.</p>
      </div>
      <div className="panel spot b-2" onMouseMove={spotlight}>
        <div className="b-ico"><Smartphone /></div>
        <h3>No app to install</h3>
        <p className="muted small">Works in any phone browser, on patchy data, in light or dark mode.</p>
      </div>
    </div>
  )
}

function TiltCard({ children, dark, onClick }: { children: React.ReactNode; dark?: boolean; onClick: () => void }) {
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const rx = useSpring(useTransform(my, [0, 1], [6, -6]), { stiffness: 200, damping: 20 })
  const ry = useSpring(useTransform(mx, [0, 1], [-8, 8]), { stiffness: 200, damping: 20 })
  const onMove = (e: ReactMouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width)
    my.set((e.clientY - r.top) / r.height)
    spotlight(e)
  }
  return (
    <motion.button
      className={`role-card spot ${dark ? 'dark' : ''}`}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onMouseMove={onMove}
      onMouseLeave={() => {
        mx.set(0.5)
        my.set(0.5)
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  )
}
