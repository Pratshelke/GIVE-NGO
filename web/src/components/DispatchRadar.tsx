import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, MousePointerClick, X } from 'lucide-react'
import { formatKm, haversineKm, PRESET_AREAS } from '../lib/geo'
import type { NgoPin } from '../lib/types'

/*
 * Interactive, to-scale schematic of Pune. Tap anywhere to "post" food and watch
 * the real dispatch rule play out: nearest available NGO first, one at a time.
 */
const W = 1000
const H = 700
const LNG0 = 73.7
const LNG1 = 74.0
const LAT0 = 18.45
const LAT1 = 18.65
const KM_PER_UNIT = ((LNG1 - LNG0) * 111.32 * Math.cos((18.55 * Math.PI) / 180)) / W

const toXY = ([lng, lat]: [number, number]) => ({ x: ((lng - LNG0) / (LNG1 - LNG0)) * W, y: ((LAT1 - lat) / (LAT1 - LAT0)) * H })
const toLngLat = (x: number, y: number): [number, number] => [LNG0 + (x / W) * (LNG1 - LNG0), LAT1 - (y / H) * (LAT1 - LAT0)]

const RIVER: [number, number][] = [
  [73.7, 18.548], [73.75, 18.545], [73.785, 18.54], [73.81, 18.534], [73.835, 18.531], [73.852, 18.527],
  [73.866, 18.532], [73.885, 18.54], [73.905, 18.545], [73.93, 18.538], [73.96, 18.532], [74.0, 18.526],
]
const RIVER_PATH = RIVER.map((c, i) => {
  const p = toXY(c)
  return `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`
}).join(' ')
const ROADS = [
  [[73.72, 18.6], [73.8, 18.56], [73.856, 18.52], [73.93, 18.48], [74.0, 18.46]],
  [[73.75, 18.47], [73.83, 18.5], [73.856, 18.52], [73.9, 18.57], [73.96, 18.62]],
  [[73.7, 18.52], [73.856, 18.52], [74.0, 18.51]],
  [[73.856, 18.45], [73.856, 18.52], [73.86, 18.65]],
].map((road) =>
  road
    .map((c, i) => {
      const p = toXY(c as [number, number])
      return `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`
    })
    .join(' '),
)

type QState = 'queued' | 'offering' | 'passed' | 'accepted'
type QItem = { ngo: NgoPin; km: number; state: QState }
type Drop = { x: number; y: number; coords: [number, number]; label: string; id: number }

const OFFER_MS = 1700
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function nearestArea(c: [number, number]) {
  let best = PRESET_AREAS[0]
  let d = Infinity
  for (const a of PRESET_AREAS) {
    const k = haversineKm(c, a.coords)
    if (k < d) {
      d = k
      best = a
    }
  }
  return best.name.replace(', Pune', '')
}

export function DispatchRadar({ ngos }: { ngos: NgoPin[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drop, setDrop] = useState<Drop | null>(null)
  const [queue, setQueue] = useState<QItem[]>([])
  const [touched, setTouched] = useState(false)
  const runId = useRef(0)

  const points = useMemo(() => ngos.map((n) => ({ n, ...toXY(n.location.coordinates) })), [ngos])

  const run = useCallback(
    async (coords: [number, number]) => {
      const id = ++runId.current
      const p = toXY(coords)
      setDrop({ ...p, coords, label: nearestArea(coords), id })
      const ranked: QItem[] = ngos
        .filter((n) => n.isAvailable)
        .map((n) => ({ ngo: n, km: haversineKm(coords, n.location.coordinates), state: 'queued' as QState }))
        .filter((q) => q.km <= 20)
        .sort((a, b) => a.km - b.km)
        .slice(0, 4)
      setQueue(ranked)
      await sleep(700)
      for (let i = 0; i < ranked.length; i++) {
        if (runId.current !== id) return
        setQueue((q) => q.map((x, j) => (j === i ? { ...x, state: 'offering' } : x)))
        await sleep(OFFER_MS)
        if (runId.current !== id) return
        const accept = i === ranked.length - 1 || (i === 0 ? Math.random() < 0.35 : Math.random() < 0.7)
        setQueue((q) => q.map((x, j) => (j === i ? { ...x, state: accept ? 'accepted' : 'passed' } : x)))
        if (accept) break
        await sleep(350)
      }
    },
    [ngos],
  )

  // Autoplay until the visitor taps
  useEffect(() => {
    if (touched || ngos.length === 0) return
    let i = 0
    const spots = [PRESET_AREAS[7], PRESET_AREAS[2], PRESET_AREAS[4], PRESET_AREAS[0], PRESET_AREAS[3]]
    const go = () => run(spots[i++ % spots.length].coords)
    go()
    const t = window.setInterval(go, 7000)
    return () => window.clearInterval(t)
  }, [touched, ngos.length, run])

  const onClick = (e: ReactMouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const m = svg.getScreenCTM()
    if (!m) return
    const p = pt.matrixTransform(m.inverse())
    setTouched(true)
    run(toLngLat(p.x, p.y))
  }

  const active = queue.find((q) => q.state === 'offering' || q.state === 'accepted')
  const accepted = queue.find((q) => q.state === 'accepted')
  const ringKm = active ? active.km : queue.length ? 0.6 : 0
  const center = toXY([73.856, 18.52])

  return (
    <div className="radar">
      <svg ref={svgRef} className="radar-map" viewBox={`0 0 ${W} ${H}`} onClick={onClick} role="img" aria-label="Map of Pune. Tap to drop a donation and watch the nearest NGOs get offered the food.">
        <defs>
          <pattern id="dots" width="25" height="25" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.3" fill="var(--ink-grid)" />
          </pattern>
          <radialGradient id="sweep" cx="0" cy="0" r="1">
            <stop offset="0" stopColor="#22b573" stopOpacity="0.35" />
            <stop offset="1" stopColor="#22b573" stopOpacity="0" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <rect width={W} height={H} fill="url(#dots)" />
        {[5, 10, 15].map((km) => (
          <circle key={km} cx={center.x} cy={center.y} r={km / KM_PER_UNIT} fill="none" stroke="var(--ink-line)" strokeDasharray="2 8" />
        ))}
        <g style={{ transformOrigin: `${center.x}px ${center.y}px`, animation: 'spin 9s linear infinite' }}>
          <path d={`M${center.x},${center.y} L${center.x + 520},${center.y} A520,520 0 0 0 ${center.x + 520 * Math.cos(-0.5)},${center.y + 520 * Math.sin(-0.5)} Z`} fill="url(#sweep)" opacity="0.5" />
        </g>
        {ROADS.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="rgba(214,255,230,0.07)" strokeWidth="6" strokeLinecap="round" />
        ))}
        <path d={RIVER_PATH} fill="none" stroke="rgba(80,150,255,0.22)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        {PRESET_AREAS.map((a) => {
          const p = toXY(a.coords)
          return (
            <text key={a.name} x={p.x} y={p.y + 30} textAnchor="middle" fill="rgba(214,255,230,0.32)" fontSize="13" fontFamily="var(--font-mono)" letterSpacing="1.5">
              {a.name.replace(', Pune', '').toUpperCase()}
            </text>
          )
        })}

        {/* search ring */}
        <AnimatePresence>
          {drop && ringKm > 0 && (
            <motion.circle
              key={`ring-${drop.id}`}
              cx={drop.x}
              cy={drop.y}
              fill="rgba(255,173,31,0.06)"
              stroke="rgba(255,173,31,0.55)"
              strokeWidth="1.5"
              strokeDasharray="5 6"
              initial={{ r: 0, opacity: 0 }}
              animate={{ r: Math.max(18, ringKm / KM_PER_UNIT), opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 60, damping: 16 }}
            />
          )}
        </AnimatePresence>

        {/* offer line */}
        {drop &&
          queue.map((q) => {
            if (q.state === 'queued') return null
            const p = toXY(q.ngo.location.coordinates)
            const color = q.state === 'accepted' ? '#22b573' : q.state === 'offering' ? '#ffad1f' : 'rgba(255,255,255,0.18)'
            return (
              <motion.line
                key={`${drop.id}-${q.ngo._id}`}
                x1={drop.x}
                y1={drop.y}
                x2={p.x}
                y2={p.y}
                stroke={color}
                strokeWidth={q.state === 'accepted' ? 3.5 : 2}
                strokeDasharray={q.state === 'accepted' ? undefined : '3 7'}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            )
          })}

        {/* van travelling to the pickup */}
        {drop && accepted && (
          <motion.circle
            key={`van-${drop.id}`}
            r="7"
            fill="#22b573"
            stroke="#07130d"
            strokeWidth="3"
            initial={{ cx: toXY(accepted.ngo.location.coordinates).x, cy: toXY(accepted.ngo.location.coordinates).y }}
            animate={{ cx: drop.x, cy: drop.y }}
            transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse', repeatDelay: 0.4 }}
          />
        )}

        {/* NGOs */}
        {points.map(({ n, x, y }) => {
          const q = queue.find((i) => i.ngo._id === n._id)
          const st = q?.state
          const fill = !n.isAvailable ? '#4b5a51' : st === 'accepted' ? '#22b573' : st === 'offering' ? '#ffad1f' : '#1a7a50'
          return (
            <g key={n._id} transform={`translate(${x},${y})`}>
              {(st === 'offering' || st === 'accepted') && <circle r="26" fill={fill} opacity="0.35" filter="url(#glow)" />}
              {st === 'offering' && (
                <motion.circle r="14" fill="none" stroke="#ffad1f" strokeWidth="2" initial={{ scale: 1, opacity: 0.9 }} animate={{ scale: 2.4, opacity: 0 }} transition={{ duration: 1.1, repeat: Infinity }} />
              )}
              <rect x="-13" y="-13" width="26" height="26" rx="8" fill={fill} stroke="#07130d" strokeWidth="3" />
              <path d="M-5 5v-5h10v5M-7 -1l7-6 7 6" stroke="#07130d" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {st === 'passed' && (
                <g transform="translate(13,-13)">
                  <circle r="9" fill="#e5533c" />
                  <path d="M-3.5 -3.5l7 7M3.5 -3.5l-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </g>
              )}
            </g>
          )
        })}

        {/* drop point */}
        <AnimatePresence>
          {drop && (
            <motion.g key={`drop-${drop.id}`} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }} style={{ transformOrigin: `${drop.x}px ${drop.y}px` }}>
              <motion.circle cx={drop.x} cy={drop.y} r="16" fill="none" stroke="#ffad1f" strokeWidth="2" initial={{ scale: 1, opacity: 1 }} animate={{ scale: 3, opacity: 0 }} transition={{ duration: 1.6, repeat: Infinity }} style={{ transformOrigin: `${drop.x}px ${drop.y}px` }} />
              <circle cx={drop.x} cy={drop.y} r="15" fill="#ffad1f" stroke="#07130d" strokeWidth="4" />
              <circle cx={drop.x} cy={drop.y} r="4" fill="#07130d" />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      <div className="radar-hud">
        <div className="row between nw">
          <span className="eyebrow">Dispatch{drop ? ` · ${drop.label}` : ''}</span>
          {accepted ? <span className="pill pill-completed tiny"><i />Matched</span> : queue.length ? <span className="pill pill-pending live tiny"><i />Offering</span> : null}
        </div>
        {queue.length === 0 && <span className="small muted">Waiting for food to be posted…</span>}
        <AnimatePresence mode="popLayout">
          {queue.map((q, i) => (
            <motion.div
              key={`${drop?.id}-${q.ngo._id}`}
              className={`q ${q.state}`}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: q.state === 'passed' ? 0.45 : 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <span className="n">{q.state === 'accepted' ? <Check size={12} /> : q.state === 'passed' ? <X size={12} /> : i + 1}</span>
              <span className="truncate" style={{ fontWeight: 650 }}>{q.ngo.name}</span>
              <span className="mono tiny" style={{ color: 'var(--ink-muted)' }}>{formatKm(q.km)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {!touched && (
          <motion.div className="radar-hint" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 1.2 }}>
            <MousePointerClick /> Tap anywhere to post food here
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
