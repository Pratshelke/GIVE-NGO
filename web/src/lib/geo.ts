/** Distance in km between two [lng, lat] points (same formula as server/utils/haversine.js). */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export const MAX_DISTANCE_KM = 20

/** Default map centre: Pune, India. [lng, lat] */
export const CITY_CENTER: [number, number] = [73.8567, 18.5204]

/** Offline-friendly preset areas so location picking works with no geocoding service at all. */
export const PRESET_AREAS: { name: string; coords: [number, number] }[] = [
  { name: 'Shivajinagar, Pune', coords: [73.8478, 18.5308] },
  { name: 'Koregaon Park, Pune', coords: [73.8937, 18.5362] },
  { name: 'Kothrud, Pune', coords: [73.8077, 18.5074] },
  { name: 'Hadapsar, Pune', coords: [73.9259, 18.5089] },
  { name: 'Viman Nagar, Pune', coords: [73.9143, 18.5679] },
  { name: 'Baner, Pune', coords: [73.7868, 18.559] },
  { name: 'Hinjewadi, Pune', coords: [73.7389, 18.5913] },
  { name: 'Camp, Pune', coords: [73.8795, 18.5158] },
  { name: 'Aundh, Pune', coords: [73.8077, 18.558] },
  { name: 'Swargate, Pune', coords: [73.8567, 18.5018] },
]

export type PlaceResult = { label: string; coords: [number, number] }

/**
 * Free address search via OpenStreetMap Nominatim (no API key).
 * Falls back to the preset list when offline or blocked.
 */
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const q = query.trim()
  if (q.length < 3) return []
  const local = PRESET_AREAS.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).map((p) => ({
    label: p.name,
    coords: p.coords,
  }))
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&q=${encodeURIComponent(q)}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(String(res.status))
    const data: { display_name: string; lat: string; lon: string }[] = await res.json()
    const remote = data.map((d) => ({ label: d.display_name, coords: [Number(d.lon), Number(d.lat)] as [number, number] }))
    return [...local, ...remote].slice(0, 6)
  } catch {
    return local
  }
}

export async function reverseGeocode(coords: [number, number]): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=17&lat=${coords[1]}&lon=${coords[0]}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(String(res.status))
    const data: { display_name?: string } = await res.json()
    if (data.display_name) return data.display_name
  } catch {
    /* ignore — fall through to nearest preset */
  }
  let best = PRESET_AREAS[0]
  let bestD = Infinity
  for (const p of PRESET_AREAS) {
    const d = haversineKm(coords, p.coords)
    if (d < bestD) {
      best = p
      bestD = d
    }
  }
  return `Near ${best.name} (${coords[1].toFixed(4)}, ${coords[0].toFixed(4)})`
}

export function formatKm(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}
