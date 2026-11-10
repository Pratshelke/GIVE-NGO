import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Crosshair, Loader2, MapPin, Search } from 'lucide-react'
import { MapCanvas } from './MapCanvas'
import { PRESET_AREAS, reverseGeocode, searchPlaces } from '../lib/geo'
import type { PlaceResult } from '../lib/geo'

export type PickedLocation = { address: string; coords: [number, number] }

/** Key-free location picker: OpenStreetMap search, quick areas, tap/drag on the map, or GPS. */
export function LocationPicker({ value, onChange, idPrefix = 'loc' }: { value: PickedLocation | null; onChange: (v: PickedLocation) => void; idPrefix?: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [geoMsg, setGeoMsg] = useState('')
  const debounce = useRef<number | undefined>(undefined)

  useEffect(() => {
    window.clearTimeout(debounce.current)
    if (query.trim().length < 3) {
      setResults([])
      return
    }
    debounce.current = window.setTimeout(async () => {
      setBusy(true)
      setResults(await searchPlaces(query))
      setBusy(false)
    }, 400)
  }, [query])

  const pick = async (coords: [number, number], label?: string) => {
    onChange({ coords, address: label ?? 'Finding address…' })
    if (!label) onChange({ coords, address: await reverseGeocode(coords) })
  }

  const gps = () => {
    setGeoMsg('')
    if (!navigator.geolocation) return setGeoMsg('Location isn’t available here. Tap the map instead.')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false)
        pick([p.coords.longitude, p.coords.latitude])
      },
      () => {
        setLocating(false)
        setGeoMsg('Location permission was blocked. Search or tap the map instead.')
      },
      { timeout: 8000 },
    )
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row nw" style={{ gap: 8, position: 'relative' }}>
        <div className="input-group grow">
          <Search />
          <input id={`${idPrefix}-search`} className="input" placeholder="Search address or area" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
        </div>
        <button type="button" className="icon-btn" style={{ width: 48, height: 48 }} onClick={gps} aria-label="Use my location" title="Use my location">
          {locating ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} /> : <Crosshair />}
        </button>
      </div>
      <AnimatePresence>
        {(results.length > 0 || busy) && (
          <motion.div className="suggestions" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            {busy && results.length === 0 && (
              <button type="button" disabled>
                <Loader2 style={{ animation: 'spin 1s linear infinite' }} /> Searching…
              </button>
            )}
            {results.map((r) => (
              <button type="button" key={r.label} onClick={() => (pick(r.coords, r.label), setQuery(''), setResults([]))}>
                <MapPin /> <span className="truncate">{r.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {geoMsg && <p className="small muted">{geoMsg}</p>}
      <div className="chips" aria-label="Quick areas">
        {PRESET_AREAS.slice(0, 7).map((a) => (
          <button type="button" key={a.name} className="chip" aria-pressed={value?.address === a.name} onClick={() => pick(a.coords, a.name)}>
            {a.name.replace(', Pune', '')}
          </button>
        ))}
      </div>
      <MapCanvas
        className="short"
        center={value?.coords ?? PRESET_AREAS[0].coords}
        zoom={value ? 14 : 12}
        markers={value ? [{ id: 'me', kind: 'food', coords: value.coords, draggable: true, pulse: true }] : []}
        onPick={(c) => pick(c)}
        onDrag={(_, c) => pick(c)}
      />
      <div className="field">
        <label className="label" htmlFor={`${idPrefix}-address`}>Address the driver will see</label>
        <input id={`${idPrefix}-address`} className="input" placeholder="Tap the map or pick an area above" value={value?.address ?? ''} onChange={(e) => value && onChange({ ...value, address: e.target.value })} disabled={!value} />
        <span className="hint">Drag the pin to fine-tune. Add a gate number or landmark.</span>
      </div>
    </div>
  )
}
