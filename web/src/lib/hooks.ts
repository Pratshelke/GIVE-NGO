import { useCallback, useEffect, useRef, useState } from 'react'
import { DB_EVENT } from './demo/store'

/**
 * Fetch data and keep it fresh: re-runs whenever the demo database changes
 * (instant, including other tabs) and polls every `pollMs` for the real backend.
 */
export function useLiveQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = [], pollMs = 5000) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const reload = useCallback(async () => {
    try {
      const d = await fetcherRef.current()
      setData(d)
      setError(null)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
    const onChange = () => reload()
    window.addEventListener(DB_EVENT, onChange)
    const t = window.setInterval(reload, pollMs)
    return () => {
      window.removeEventListener(DB_EVENT, onChange)
      window.clearInterval(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, error, loading, reload }
}

/** Re-render every `ms` (for countdowns and "x min ago"). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(t)
  }, [ms])
  return now
}

export function timeAgo(isoDate: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - Date.parse(isoDate)) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'yesterday' : `${d} days ago`
}

export function timeLeft(isoDate: string, now = Date.now()) {
  const s = Math.max(0, Math.round((Date.parse(isoDate) - now) / 1000))
  const m = Math.floor(s / 60)
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`
  return `${m}:${String(s % 60).padStart(2, '0')}`
}
