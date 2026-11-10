import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { PRESET_AREAS } from '../lib/geo'

export type MapMarker = {
  id: string
  coords: [number, number] // [lng, lat]
  kind: 'ngo' | 'food' | 'me'
  off?: boolean
  pulse?: boolean
  popup?: ReactNode
  draggable?: boolean
}

type Props = {
  center: [number, number]
  zoom?: number
  markers?: MapMarker[]
  circles?: { center: [number, number]; radiusKm: number }[]
  lines?: [number, number][][]
  onPick?: (coords: [number, number]) => void
  onDrag?: (id: string, coords: [number, number]) => void
  className?: string
  fitToMarkers?: boolean
  legend?: ReactNode
}

const glyph = { ngo: '🏠', food: '🍲', me: '📍' }
const iconCache = new Map<string, L.DivIcon>()
function pinIcon(kind: MapMarker['kind'], off?: boolean, pulse?: boolean) {
  const key = `${kind}-${off}-${pulse}`
  if (!iconCache.has(key)) {
    iconCache.set(
      key,
      L.divIcon({
        className: '',
        html: `<div class="pin ${kind}${off ? ' off' : ''}${pulse ? ' pulse' : ''}"><span>${glyph[kind]}</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -28],
      }),
    )
  }
  return iconCache.get(key)!
}

const ll = (c: [number, number]): [number, number] => [c[1], c[0]]

function prefersDark() {
  const forced = document.documentElement.getAttribute('data-theme')
  if (forced) return forced === 'dark'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

/** Street tiles when the network allows; a clean schematic grid with area names when it does not. */
function BaseLayer({ onFallback }: { onFallback: () => void }) {
  const dark = useMemo(prefersDark, [])
  const [failed, setFailed] = useState(false)
  const loaded = useRef(0)
  const errors = useRef(0)
  if (failed) return null
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
    map.setView(ll(center), zoom ?? map.getZoom(), { animate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]])
  return null
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  const key = points.map((p) => p.join(',')).join('|')
  useEffect(() => {
    if (points.length < 2) return
    map.fitBounds(L.latLngBounds(points.map(ll)), { padding: [36, 36], maxZoom: 14 })
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
  legend,
}: Props) {
  const [schematic, setSchematic] = useState(false)
  return (
    <div className={`map ${schematic ? 'schematic' : ''} ${className}`}>
      <MapContainer center={ll(center)} zoom={zoom} scrollWheelZoom={false} style={{ height: '100%' }}>
        <BaseLayer onFallback={() => setSchematic(true)} />
        {schematic &&
          PRESET_AREAS.map((a) => (
            <Marker key={a.name} position={ll(a.coords)} icon={L.divIcon({ className: '', html: '', iconSize: [0, 0] })}>
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
            pathOptions={{ color: '#1d6b45', weight: 1.5, dashArray: '6 6', fillOpacity: 0.05 }}
          />
        ))}
        {lines.map((l, i) => (
          <Polyline key={i} positions={l.map(ll)} pathOptions={{ color: '#d98e04', weight: 3, dashArray: '2 8', lineCap: 'round' }} />
        ))}
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={ll(m.coords)}
            icon={pinIcon(m.kind, m.off, m.pulse)}
            draggable={m.draggable}
            eventHandlers={
              m.draggable && onDrag
                ? {
                    dragend: (e) => {
                      const p = (e.target as L.Marker).getLatLng()
                      onDrag(m.id, [p.lng, p.lat])
                    },
                  }
                : undefined
            }
          >
            {m.popup && <Popup>{m.popup}</Popup>}
          </Marker>
        ))}
        {onPick && <ClickHandler onPick={onPick} />}
        {fitToMarkers ? <FitBounds points={markers.map((m) => m.coords)} /> : <Recenter center={center} zoom={zoom} />}
      </MapContainer>
      {legend && <div className="map-legend">{legend}</div>}
    </div>
  )
}
