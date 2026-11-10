import { useState } from 'react'
import { api } from '../lib/axios'
import { timeAgo, useLiveQuery } from '../lib/hooks'
import { CITY_CENTER, MAX_DISTANCE_KM } from '../lib/geo'
import type { Donation, NgoPin } from '../lib/types'
import { MapCanvas } from '../components/MapCanvas'
import type { MapMarker } from '../components/MapCanvas'
import { CategoryIcon, StatusBadge } from '../components/ui'

export function LiveMapPage() {
  const [showRadius, setShowRadius] = useState(false)
  const { data } = useLiveQuery(async () => {
    const [n, d] = await Promise.all([api.get('/ngos'), api.get('/donations/public')])
    return { ngos: n.data.ngos as NgoPin[], donations: d.data.donations as Donation[] }
  }, [], 5000)
  const ngos = data?.ngos ?? []
  const donations = data?.donations ?? []

  const markers: MapMarker[] = [
    ...ngos.map((n) => ({
      id: n._id,
      kind: 'ngo' as const,
      off: !n.isAvailable,
      coords: n.location.coordinates,
      popup: (
        <>
          <b>{n.name}</b>
          <br />
          {n.address}
          <br />
          {n.isAvailable ? 'Accepting pickups' : 'Paused'}
        </>
      ),
    })),
    ...donations.map((d) => ({
      id: d._id,
      kind: 'food' as const,
      pulse: d.status === 'pending',
      coords: d.location.coordinates,
      popup: (
        <>
          <b>{d.title}</b>
          <br />
          {d.quantity} · {d.status === 'pending' ? 'finding an NGO' : d.currentNgoId?.name}
        </>
      ),
    })),
  ]

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Live map · updates every few seconds</span>
          <h2>Food on the move in Pune</h2>
        </div>
        <label className="row small" style={{ gap: 8, cursor: 'pointer' }}>
          <input id="map-radius" type="checkbox" checked={showRadius} onChange={(e) => setShowRadius(e.target.checked)} />
          Show each NGO's {MAX_DISTANCE_KM} km reach
        </label>
      </div>
      <div className="split">
        <MapCanvas
          className="tall"
          center={CITY_CENTER}
          zoom={12}
          markers={markers}
          circles={showRadius ? ngos.filter((n) => n.isAvailable).map((n) => ({ center: n.location.coordinates, radiusKm: MAX_DISTANCE_KM })) : []}
          legend={
            <>
              <span>
                <i style={{ background: 'var(--accent)' }} />
                Donation
              </span>
              <span>
                <i style={{ background: 'var(--brand)' }} />
                NGO
              </span>
              <span>
                <i style={{ background: '#8a978e' }} />
                Paused NGO
              </span>
            </>
          }
        />
        <div className="stack">
          <div className="card">
            <div className="eyebrow">Active donations · {donations.length}</div>
            {donations.length === 0 && <p className="muted">No food waiting right now. Every recent post has been collected.</p>}
            {donations.map((d) => (
              <div key={d._id} className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <CategoryIcon category={d.category} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{d.title}</b>
                  <div className="small muted">
                    {typeof d.donorId === 'object' ? d.donorId.name : ''} · {timeAgo(d.createdAt)}
                  </div>
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))}
          </div>
          <div className="card">
            <div className="eyebrow">NGO partners · {ngos.length}</div>
            {ngos.map((n) => (
              <div key={n._id} className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                <div style={{ minWidth: 0 }}>
                  <b>{n.name}</b>
                  <div className="small muted">{n.address}</div>
                </div>
                <span className={`badge ${n.isAvailable ? 'badge-accepted' : 'badge-expired'}`}>{n.isAvailable ? 'Available' : 'Paused'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
