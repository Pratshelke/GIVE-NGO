/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { animate, motion, useInView } from 'motion/react'
import { Apple, Check, Copy, Croissant, Milk, Package, Soup, Truck, UtensilsCrossed, HandHeart, Flag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Category, DonationStatus, RequestStatus } from '../lib/types'

export const STATUS_LABEL: Record<DonationStatus | RequestStatus, string> = {
  pending: 'Finding NGO',
  reserved: 'NGO assigned',
  in_transit: 'On the way',
  completed: 'Delivered',
  expired: 'Expired',
  accepted: 'Accepted',
  rejected: 'Passed',
}

export function StatusPill({ status, label }: { status: DonationStatus | RequestStatus; label?: string }) {
  const live = status === 'pending' || status === 'in_transit'
  return (
    <span className={`pill pill-${status}${live ? ' live' : ''}`}>
      <i />
      {label ?? STATUS_LABEL[status]}
    </span>
  )
}

const STEPS: { key: DonationStatus; label: string; icon: LucideIcon }[] = [
  { key: 'pending', label: 'Posted', icon: Flag },
  { key: 'reserved', label: 'NGO assigned', icon: HandHeart },
  { key: 'in_transit', label: 'Picked up', icon: Truck },
  { key: 'completed', label: 'Delivered', icon: Check },
]

export function Track({ status }: { status: DonationStatus }) {
  const idx = status === 'completed' ? 4 : STEPS.findIndex((s) => s.key === status)
  return (
    <div className="track" aria-label={`Progress: ${STATUS_LABEL[status]}`}>
      {STEPS.map((s, i) => {
        const done = i < idx
        const current = i === idx
        const Icon = s.icon
        return (
          <div key={s.key} className={`track-step ${done ? 'done' : current ? 'current' : ''}`}>
            <div className={`track-bar ${current ? 'live' : ''}`}>
              <motion.span
                initial={false}
                animate={{ scaleX: done ? 1 : current ? 0.5 : 0 }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
            <span className="t-label">
              <Icon />
              {s.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export const CATEGORIES: { key: Category; label: string; icon: LucideIcon; tint: string; hint: string }[] = [
  { key: 'cooked', label: 'Cooked meals', icon: Soup, tint: '#ffad1f', hint: 'Rice, curries, thalis' },
  { key: 'produce', label: 'Fruit & veg', icon: Apple, tint: '#22b573', hint: 'Fresh, uncooked' },
  { key: 'bakery', label: 'Bakery', icon: Croissant, tint: '#d9822b', hint: 'Breads, buns, cakes' },
  { key: 'packaged', label: 'Packaged', icon: Package, tint: '#2f6fd6', hint: 'Sealed, long shelf life' },
  { key: 'dairy', label: 'Dairy', icon: Milk, tint: '#7c8cff', hint: 'Milk, curd, paneer' },
  { key: 'other', label: 'Other', icon: UtensilsCrossed, tint: '#8a978e', hint: 'Sweets, mixed items' },
]
export const catOf = (c?: Category) => CATEGORIES.find((x) => x.key === c) ?? CATEGORIES[5]

export function CategoryIcon({ category, size = 48 }: { category?: Category; size?: number }) {
  const c = catOf(category)
  const Icon = c.icon
  return (
    <div
      className="cat-ico"
      aria-hidden="true"
      style={{ width: size, height: size, background: `color-mix(in srgb, ${c.tint} 16%, transparent)`, color: c.tint }}
    >
      <Icon />
    </div>
  )
}

export function Ring({
  progress,
  size = 64,
  stroke = 6,
  color = 'var(--accent)',
  children,
}: {
  progress: number
  size?: number
  stroke?: number
  color?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, progress))
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="r-label">{children}</div>
    </div>
  )
}

/** Number that counts up when it scrolls into view and animates between updates. */
export function AnimatedNumber({ value, format = (n: number) => Math.round(n).toLocaleString('en-IN') }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const from = useRef(0)
  useEffect(() => {
    if (!inView || !ref.current) return
    const el = ref.current
    const ctl = animate(from.current, value, {
      duration: from.current === 0 ? 1.4 : 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (el.textContent = format(v)),
    })
    from.current = value
    return () => ctl.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView])
  return <span ref={ref}>{format(0)}</span>
}

export function spotlight(e: ReactMouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  id,
  label,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  id: string
  label: string
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Empty({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="e-ico">
        <Icon />
      </div>
      <b>{title}</b>
      {children && <span className="small">{children}</span>}
      {action}
    </div>
  )
}

export function CopyChip({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      window.setTimeout(() => setDone(false), 1400)
    } catch {
      /* clipboard blocked: text stays selectable */
    }
  }
  return (
    <button type="button" className="copy-chip" onClick={copy} title="Copy">
      <span style={{ userSelect: 'all' }}>{text}</span>
      {done ? <Check /> : <Copy />}
    </button>
  )
}

export function Logo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12.5h16c0 4.4-3.6 7.5-8 7.5s-8-3.1-8-7.5Z" fill="currentColor" />
      <path d="M8.5 9.5c0-1.5 1-2 1-3.5M12 9.5c0-1.5 1-2 1-3.5M15.5 9.5c0-1.5 1-2 1-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { type: 'spring' as const, stiffness: 260, damping: 28 },
}
