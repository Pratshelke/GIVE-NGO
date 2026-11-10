import { useEffect, useRef, useState } from 'react'
import { MapCanvas } from './MapCanvas'
import { PRESET_AREAS, reverseGeocode, searchPlaces } from '../lib/geo'
import type { PlaceResult } from '../lib/geo'

export type PickedLocation = { address: string; coords: [number, number] }

/**
 * Key-free location picker: search (OpenStreetMap), quick area chips, tap/drag on
 * the map, or the browser's own geolocation. The address stays editable.
 */
export function LocationPicker({
  value,
  onChange,
  idPrefix = 'loc',
}: {
  value: PickedLocation | null
  onChange: (v: PickedLocation) => void
  idPrefix?: string
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [busy, setBusy] = useState(false)
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
    }, 450)
  }, [query])

  const pickCoords = async (coords: [number, number], label?: string) => {
    onChange({ coords, address: label ?? value?.address ?? 'Locating…' })
    if (!label) {
      const addr = await reverseGeocode(coords)
      onChange({ coords, address: addr })
    }
  }

  const useMyLocation = () => {
    setGeoMsg('')
    if (!navigator.geolocation) {
      setGeoMsg('Location is not available in this browser. Tap the map instead.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => pickCoords([p.coords.longitude, p.coords.latitude]),
      () => setGeoMsg('Location permission was blocked. Search or tap the map instead.'),
      { timeout: 8000 },
    )
  }

  return (
    <div className="stack">
      <div className="row" style={{ gap: 8 }}>
        <input
          id={`${idPrefix}-search`}
          className="input"
          style={{ flex: '1 1 220px' }}
          placeholder="Search an address or area, e.g. Kothrud"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <button type="button" className="btn btn-ghost" onClick={useMyLocation}>
          📍 Use my location
        </button>
      </div>
      {geoMsg && <p className="small muted">{geoMsg}</p>}
      {(results.length > 0 || busy) && (
        <div className="suggestions">
          {busy && results.length === 0 && <button type="button" disabled>Searching…</button>}
          {results.map((r) => (
            <button
              type="button"
              key={r.label}
              onClick={() => {
                pickCoords(r.coords, r.label)
                setQuery('')
                setResults([])
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
      <div className="chips" aria-label="Quick areas">
        {PRESET_AREAS.slice(0, 6).map((a) => (
          <button
            type="button"
            key={a.name}
            className="chip"
            aria-pressed={value?.address === a.name}
            onClick={() => pickCoords(a.coords, a.name)}
          >
            {a.name.replace(', Pune', '')}
          </button>
        ))}
      </div>
      <MapCanvas
        className="short"
        center={value?.coords ?? PRESET_AREAS[0].coords}
        zoom={value ? 14 : 12}
        markers={value ? [{ id: 'me', kind: 'me', coords: value.coords, draggable: true }] : []}
        onPick={(c) => pickCoords(c)}
        onDrag={(_, c) => pickCoords(c)}
      />
      <div className="field">
        <label htmlFor={`${idPrefix}-address`}>Pickup address</label>
        <input
          id={`${idPrefix}-address`}
          className="input"
          placeholder="Tap the map or pick an area above"
          value={value?.address ?? ''}
          onChange={(e) => value && onChange({ ...value, address: e.target.value })}
          disabled={!value}
        />
        <span className="hint">Tap the map or drag the pin to fine-tune. Add a landmark or floor number in the address.</span>
      </div>
    </div>
  )
}
