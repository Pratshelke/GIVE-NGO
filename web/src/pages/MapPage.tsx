import { useEffect, useMemo, useState } from 'react'
import { MapView } from '../components/MapView'
import type { Donation, Recipient, Match, SeedData } from '../types'
import { api } from '../lib/axios'

export function MapPage() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)

      const base = import.meta.env.VITE_API_URL || ''

      const setDataIfMounted = (data: SeedData) => {
        if (!cancelled) {
          console.log('Loaded data:', data)
          setDonations(data.donations || [])
          setRecipients(data.recipients || [])
          setMatches(data.matches || [])
          console.log('Set donations:', data.donations?.length, 'recipients:', data.recipients?.length)
          setLoading(false)
        }
      }

      try {
        // Try axios wrapper first
        try {
          console.log('Attempting axios request to:', api.defaults.baseURL + '/matches')
          const { data } = await api.get<SeedData>('/matches')
          console.log('Axios success, data:', data)
          setDataIfMounted(data)
          return
        } catch (axiosErr: unknown) {
          // If axios fails, fall through to fetch
          const message = axiosErr instanceof Error ? axiosErr.message : String(axiosErr)
          console.warn('Axios request failed, trying fetch:', message)
        }

        // Fallback: use fetch to call the backend
        const apiUrl = base || 'http://localhost:3000'
        console.log('Attempting fetch to:', `${apiUrl.replace(/\/$/, '')}/matches`)
        try {
          const res = await fetch(`${apiUrl.replace(/\/$/, '')}/matches`)
          if (!res.ok) throw new Error(`API returned ${res.status}`)
          const data = (await res.json()) as SeedData
          console.log('Fetch success, data:', data)
          setDataIfMounted(data)
          return
        } catch (fetchErr: unknown) {
          const message = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
          console.warn('Fetch failed, trying seed file:', message)
        }

        // Last fallback: load the local seed JSON
        console.log('Attempting to load seed file: /seed/matches.json')
        const seedRes = await fetch('/seed/matches.json')
        if (!seedRes.ok) throw new Error(`Failed to load seed: ${seedRes.status}`)
        const seedData = (await seedRes.json()) as SeedData
        console.log('Seed file loaded, data:', seedData)
        setDataIfMounted(seedData)
      } catch (err: unknown) {
        // On error, fallback to seed JSON if possible
        console.error('Failed to load items from API:', err)
        try {
          const seedRes = await fetch('/seed/matches.json')
          const seedData = (await seedRes.json()) as SeedData
          setDataIfMounted(seedData)
          setError('Loaded seed data (backend fetch failed). See console for details.')
        } catch {
          if (!cancelled) {
            setError('Failed to load items from API and seed file. See console for details.')
            setLoading(false)
          }
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const points = useMemo(() => {
    return [
      ...donations.map((d) => ({ id: d.id, lat: d.lat, lng: d.lng, label: `Donation: ${d.title}`, kind: 'donation' as const })),
      ...recipients.map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, label: `Recipient: ${r.name}`, kind: 'recipient' as const })),
    ]
  }, [donations, recipients])

  const onAccept = (donationId: string, recipientId: string) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.donationId === donationId && m.recipientId === recipientId ? { ...m, status: 'accepted' } : m,
      ),
    )
  }

  if (loading) return <div style={{ padding: 16 }}>Loading map data…</div>
  if (error)
    return (
      <div style={{ padding: 16 }}>
        <strong>Error:</strong> {error}
        <div style={{ marginTop: 8 }}>
          Make sure your backend is running and VITE_API_URL in web/.env.local points to it.
        </div>
      </div>
    )

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1000, background: '#111', color: '#fff', padding: '4px 8px', borderRadius: 4 }}>
        GiveNGo · Map
      </div>
      <MapView points={points} donations={donations} recipients={recipients} matches={matches} onAccept={onAccept} />
    </div>
  )
}


