/* eslint-disable react-refresh/only-export-components */
import type { Category, DonationStatus, RequestStatus } from '../lib/types'

export const STATUS_LABEL: Record<DonationStatus | RequestStatus, string> = {
  pending: 'Finding NGO',
  reserved: 'NGO assigned',
  in_transit: 'Picked up',
  completed: 'Delivered',
  expired: 'Expired',
  accepted: 'Accepted',
  rejected: 'Passed',
}

export function StatusBadge({ status, label }: { status: DonationStatus | RequestStatus; label?: string }) {
  const live = status === 'pending' || status === 'in_transit'
  return <span className={`badge badge-${status}${live ? ' live' : ''}`}>{label ?? STATUS_LABEL[status]}</span>
}

const STEPS: { key: DonationStatus; label: string }[] = [
  { key: 'pending', label: 'Posted' },
  { key: 'reserved', label: 'NGO assigned' },
  { key: 'in_transit', label: 'Picked up' },
  { key: 'completed', label: 'Delivered' },
]

export function StatusStepper({ status }: { status: DonationStatus }) {
  const idx = STEPS.findIndex((s) => s.key === status)
  return (
    <div className="stepper" aria-label={`Progress: ${STATUS_LABEL[status]}`}>
      {STEPS.map((s, i) => (
        <div key={s.key} className={`step ${i < idx || status === 'completed' ? 'done' : i === idx ? 'current' : ''}`}>
          <div className="bar" />
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

export const CATEGORIES: { key: Category; label: string; icon: string }[] = [
  { key: 'cooked', label: 'Cooked meals', icon: '🍛' },
  { key: 'produce', label: 'Fruit & veg', icon: '🥕' },
  { key: 'bakery', label: 'Bakery', icon: '🥖' },
  { key: 'packaged', label: 'Packaged', icon: '📦' },
  { key: 'dairy', label: 'Dairy', icon: '🥛' },
  { key: 'other', label: 'Other', icon: '🍱' },
]

export function CategoryIcon({ category }: { category?: Category }) {
  const c = CATEGORIES.find((x) => x.key === category) ?? CATEGORIES[5]
  return (
    <div className="cat-icon" aria-hidden="true" title={c.label}>
      {c.icon}
    </div>
  )
}

export function Countdown({ total, left, label }: { total: number; left: number; label: string }) {
  const p = Math.max(0, Math.min(100, (left / total) * 100))
  return (
    <div className="countdown-ring" style={{ ['--p' as string]: p }} title="Time left to respond">
      <span>{label}</span>
    </div>
  )
}

export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20.5s-7.5-4.4-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.7-7.5 10.1-7.5 10.1Z"
        fill="currentColor"
        opacity=".35"
      />
      <path d="M6 13.5h12M8 13.5c0 2.5 1.8 4 4 4s4-1.5 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 4v2.5M9.5 5l.8 1.8M14.5 5l-.8 1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Zm4 4a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
