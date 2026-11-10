import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { PRESET_AREAS } from '../lib/geo'
import { useTheme } from '../lib/theme'

export type MapMarker = {
  id: string
  coords: [number, number] // [lng, lat]
  kind: 'ngo' | 'food' | 'me'
  off?: boolean
  pulse?: boolean
  popup?: ReactNode
  draggable?: boolean
  onClick?: () => void
}

type Props = {
  center: [number, number]
  zoom?: number
  markers?: MapMarker[]
  circles?: { center: [number, number]; radiusKm: number; color?: string }[]
  lines?: [number, number][][]
  onPick?: (coords: [number, number]) => void
  onDrag?: (id: string, coords: [number, number]) => void
  className?: string
  fitToMarkers?: boolean
  focus?: [number, number] | null
  legend?: ReactNode
  scrollZoom?: boolean
}

const svg = (inner: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
const GLYPH = {
  ngo: svg(
    '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  ),
  food: svg('<path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M7 21h10"/><path d="M19.5 12 22 6"/><path d="M8 3c0 1.5-1 2-1 3.5M12 3c0 1.5-1 2-1 3.5M16 3c0 1.5-1 2-1 3.5"/>'),
  me: svg('<circle cx="12" cy="12" r="4" fill="currentColor"/>'),
}
const iconCache = new Map<string, L.DivIcon>()
function pinIcon(kind: MapMarker['kind'], off?: boolean, pulse?: boolean) {
  const key = `${kind}-${off}-${pulse}`
  if (!iconCache.has(key)) {
    iconCache.set(
      key,
      L.divIcon({
        className: '',
        html: `<div class="mk ${kind}${off ? ' off' : ''}${pulse ? ' pulse' : ''}">${GLYPH[kind]}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18],
      }),
    )
  }
  return iconCache.get(key)!
}
const blank = L.divIcon({ className: '', html: '', iconSize: [0, 0] })
const ll = (c: [number, number]): [number, number] => [c[1], c[0]]

/** OpenStreetMap tiles when reachable; a clean schematic grid with area names when not. */
function BaseLayer({ onFallback, dark }: { onFallback: () => void; dark: boolean }) {
  const [failed, setFailed] = useState(false)
  const loaded = useRef(0)
  const errors = useRef(0)
  if (failed) return null
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      className={dark ? 'tiles-dark' : ''}
      eventHandlers={{
        tileload: () => {
          loaded.current++
        },
        tileerror: () => {
          errors.current++
          if (errors.current >= 3 && loaded.current === 0) {
            setFailed(true)
            onFallback()
          }
        },
      }}
    />
  )
}

function ClickHandler({ onPick }: { onPick: (c: [number, number]) => void }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lng, e.latlng.lat]) })
  return null
}

function Recenter({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(ll(center), zoom ?? map.getZoom(), { duration: 0.6 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]])
  return null
}

function Focus({ focus }: { focus?: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (focus) map.flyTo(ll(focus), 14, { duration: 0.8 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.[0], focus?.[1]])
  return null
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  const key = points.map((p) => p.join(',')).join('|')
  useEffect(() => {
    if (points.length < 2) return
    map.flyToBounds(L.latLngBounds(points.map(ll)), { padding: [40, 40], maxZoom: 14, duration: 0.7 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return null
}

export function MapCanvas({
  center,
  zoom = 12,
  markers = [],
  circles = [],
  lines = [],
  onPick,
  onDrag,
  className = '',
  fitToMarkers,
  focus,
  legend,
  scrollZoom = false,
}: Props) {
  const [schematic, setSchematic] = useState(false)
  const { theme } = useTheme()
  const dark = theme === 'dark'
  return (
    <div className={`map ${schematic ? 'schematic' : ''} ${className}`}>
      <MapContainer center={ll(center)} zoom={zoom} scrollWheelZoom={scrollZoom} style={{ height: '100%' }}>
        <BaseLayer key={String(dark)} dark={dark} onFallback={() => setSchematic(true)} />
        {schematic &&
          PRESET_AREAS.map((a) => (
            <Marker key={a.name} position={ll(a.coords)} icon={blank} interactive={false}>
              <Tooltip permanent direction="center" className="area-label">
                {a.name.replace(', Pune', '')}
              </Tooltip>
            </Marker>
          ))}
        {circles.map((c, i) => (
          <Circle
            key={i}
            center={ll(c.center)}
            radius={c.radiusKm * 1000}
            pathOptions={{ color: c.color ?? '#22b573', weight: 1.5, dashArray: '4 6', fillOpacity: 0.06 }}
          />
        ))}
        {lines.map((l, i) => (
          <Polyline key={i} positions={l.map(ll)} pathOptions={{ color: '#ffad1f', weight: 3, dashArray: '1 9', lineCap: 'round' }} />
        ))}
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={ll(m.coords)}
            icon={pinIcon(m.kind, m.off, m.pulse)}
            draggable={m.draggable}
            eventHandlers={{
              click: () => m.onClick?.(),
              ...(m.draggable && onDrag
                ? {
                    dragend: (e: L.LeafletEvent) => {
                      const p = (e.target as L.Marker).getLatLng()
                      onDrag(m.id, [p.lng, p.lat])
                    },
                  }
                : {}),
            }}
          >
            {m.popup && <Popup>{m.popup}</Popup>}
          </Marker>
        ))}
        {onPick && <ClickHandler onPick={onPick} />}
        {fitToMarkers ? <FitBounds points={markers.map((m) => m.coords)} /> : <Recenter center={center} zoom={zoom} />}
        <Focus focus={focus} />
      </MapContainer>
      {legend && <div className="map-legend glass">{legend}</div>}
    </div>
  )
}
