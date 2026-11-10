import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Building2, Radar } from 'lucide-react'
import { api } from '../lib/axios'
import { timeAgo, useLiveQuery } from '../lib/hooks'
import { CITY_CENTER, MAX_DISTANCE_KM } from '../lib/geo'
import type { Donation, NgoPin } from '../lib/types'
import { MapCanvas } from '../components/MapCanvas'
import type { MapMarker } from '../components/MapCanvas'
import { CategoryIcon, Segmented, StatusPill } from '../components/ui'

type F = 'all' | 'food' | 'ngos'

export function LiveMapPage() {
  const [filter, setFilter] = useState<F>('all')
  const [reach, setReach] = useState(false)
  const [focus, setFocus] = useState<{ id: string; c: [number, number] } | null>(null)
  const { data } = useLiveQuery(async () => {
    const [n, d] = await Promise.all([api.get('/ngos'), api.get('/donations/public')])
    return { ngos: n.data.ngos as NgoPin[], donations: d.data.donations as Donation[] }
  }, [], 4000)
  const ngos = data?.ngos ?? []
  const donations = data?.donations ?? []
  const showFood = filter !== 'ngos'
  const showNgos = filter !== 'food'

  const markers: MapMarker[] = [
    ...(showNgos ? ngos : []).map((n) => ({
      id: n._id,
      kind: 'ngo' as const,
      off: !n.isAvailable,
      coords: n.location.coordinates,
      onClick: () => setFocus({ id: n._id, c: n.location.coordinates }),
      popup: (<><b>{n.name}</b><br />{n.address}<br />{n.isAvailable ? 'Accepting pickups' : 'Paused'}</>),
    })),
    ...(showFood ? donations : []).map((d) => ({
      id: d._id,
      kind: 'food' as const,
      pulse: d.status === 'pending',
      coords: d.location.coordinates,
      onClick: () => setFocus({ id: d._id, c: d.location.coordinates }),
      popup: (<><b>{d.title}</b><br />{d.quantity} · {d.status === 'pending' ? 'finding an NGO' : d.currentNgoId?.name}</>),
    })),
  ]

  return (
    <>
      <div className="row between">
        <div className="page-title">
          <span className="eyebrow row nw" style={{ gap: 8 }}><span className="avail-dot on" /> Live · refreshes every few seconds</span>
          <h2>Food on the move in Pune</h2>
        </div>
        <label className="row nw small" style={{ gap: 10, cursor: 'pointer', fontWeight: 700 }}>
          <button className="switch" role="switch" aria-checked={reach} onClick={() => setReach((r) => !r)} aria-label={`Show ${MAX_DISTANCE_KM} km reach`} />
          Show {MAX_DISTANCE_KM} km reach
        </label>
      </div>
      <div className="mapstage">
        <MapCanvas
          className="fill"
          center={CITY_CENTER}
          zoom={12}
          scrollZoom
          focus={focus?.c}
          markers={markers}
          circles={reach ? ngos.filter((n) => n.isAvailable).map((n) => ({ center: n.location.coordinates, radiusKm: MAX_DISTANCE_KM })) : []}
          legend={<><span><i style={{ background: 'var(--accent)' }} />Food</span><span><i style={{ background: 'var(--brand)' }} />NGO</span><span><i style={{ background: '#7d8b82' }} />Paused</span></>}
        />
        <motion.div className="map-panel glass" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 24 }}>
          <div className="mp-head">
            <div className="row between nw">
              <b>{donations.length} donations · {ngos.filter((n) => n.isAvailable).length} NGOs free</b>
            </div>
            <Segmented id="mapf" label="Filter" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'food', label: 'Food' }, { value: 'ngos', label: 'NGOs' }]} />
          </div>
          <div className="mp-list">
            <AnimatePresence initial={false}>
              {showFood && donations.length === 0 && <p className="muted small" style={{ padding: 10 }}>No food waiting. Everything recent has been collected.</p>}
              {showFood &&
                donations.map((d) => (
                  <motion.button key={d._id} layout className="mp-item" data-active={focus?.id === d._id} onClick={() => setFocus({ id: d._id, c: d.location.coordinates })} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <CategoryIcon category={d.category} size={36} />
                    <span style={{ minWidth: 0 }}>
                      <b className="small truncate" style={{ display: 'block' }}>{d.title}</b>
                      <span className="tiny muted">{typeof d.donorId === 'object' ? d.donorId.name : ''} · {timeAgo(d.createdAt)}</span>
                    </span>
                    <StatusPill status={d.status} />
                  </motion.button>
                ))}
              {showNgos &&
                ngos.map((n) => (
                  <motion.button key={n._id} layout className="mp-item" data-active={focus?.id === n._id} onClick={() => setFocus({ id: n._id, c: n.location.coordinates })} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <span className="cat-ico" style={{ width: 36, height: 36, background: n.isAvailable ? 'var(--brand-soft)' : 'var(--surface-3)', color: n.isAvailable ? 'var(--brand)' : 'var(--muted)' }}><Building2 /></span>
                    <span style={{ minWidth: 0 }}>
                      <b className="small truncate" style={{ display: 'block' }}>{n.name}</b>
                      <span className="tiny muted truncate" style={{ display: 'block' }}>{n.address}</span>
                    </span>
                    <span className={`pill ${n.isAvailable ? 'pill-in_transit' : 'pill-expired'}`}><i />{n.isAvailable ? 'Free' : 'Paused'}</span>
                  </motion.button>
                ))}
            </AnimatePresence>
          </div>
          <div className="tiny muted row nw" style={{ gap: 6, padding: '10px 16px', borderTop: '1px solid var(--glass-line)' }}><Radar size={13} /> Tap a row to fly to it</div>
        </motion.div>
      </div>
    </>
  )
}
