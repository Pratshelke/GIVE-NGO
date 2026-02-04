import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect, useMemo } from 'react'
import type { Donation, Match, Recipient } from '../types'
import { AcceptModal } from './AcceptModal'
import { useState } from 'react'

// Create custom icons with different shapes and colors
const createDonationIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-donation-icon',
    html: `
      <div style="
        width: 30px;
        height: 30px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        color: white;
      ">
        📦
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  })
}

const createNGOIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-ngo-icon',
    html: `
      <div style="
        width: 30px;
        height: 30px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        color: white;
      ">
        🏢
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  })
}

// Icon sets
const blueDonationIcon = createDonationIcon('#3b82f6') // Blue
const greenDonationIcon = createDonationIcon('#10b981') // Green
const orangeNGOIcon = createNGOIcon('#f97316') // Orange
const greenNGOIcon = createNGOIcon('#10b981') // Green

type Point = { id: string; lat: number; lng: number; label: string; kind: 'donation' | 'recipient' }

function FitBounds({ points }: { points: Point[] }) {
  const map = useMap()
  const bounds = useMemo(() => {
    if (!points || points.length === 0) return null
    const latLngs = points.map((p) => L.latLng(p.lat, p.lng))
    return L.latLngBounds(latLngs)
  }, [points])
  useEffect(() => {
    if (bounds && points.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [40, 40] })
      } catch (e) {
        console.warn('FitBounds error:', e)
      }
    }
  }, [bounds, map, points.length])
  return null
}

export function MapView({
  points,
  donations,
  recipients,
  matches,
  onAccept,
}: {
  points: Point[]
  donations: Donation[]
  recipients: Recipient[]
  matches: Match[]
  onAccept: (donationId: string, recipientId: string) => void
}) {
  const [confirm, setConfirm] = useState<{ donationId: string; recipientId: string } | null>(null)

  const isAccepted = (donationId: string, recipientId: string) =>
    matches.some((m) => m.donationId === donationId && m.recipientId === recipientId && m.status === 'accepted')

  // Helper function to check if donation has any accepted match
  const donationHasAcceptedMatch = (donationId: string) => {
    return matches.some((m) => m.donationId === donationId && m.status === 'accepted')
  }

  // Helper function to check if recipient has any accepted match
  const recipientHasAcceptedMatch = (recipientId: string) => {
    return matches.some((m) => m.recipientId === recipientId && m.status === 'accepted')
  }

  // Helper function to get donation icon based on match status
  const getDonationIcon = (donationId: string) => {
    return donationHasAcceptedMatch(donationId) ? greenDonationIcon : blueDonationIcon
  }

  // Helper function to get recipient/NGO icon based on match status
  const getRecipientIcon = (recipientId: string) => {
    return recipientHasAcceptedMatch(recipientId) ? greenNGOIcon : orangeNGOIcon
  }

  console.log('MapView render - donations:', donations.length, 'recipients:', recipients.length, 'points:', points.length)
  
  // Calculate center from first marker if available
  const mapCenter = points.length > 0 ? [points[0].lat, points[0].lng] : [20.5937, 78.9629]
  const mapZoom = points.length > 0 ? 6 : 4

  return (
    <>
      <div style={{ position: 'absolute', top: 40, left: 8, zIndex: 1000, background: '#111', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: '12px' }}>
        Markers: {donations.length} donations, {recipients.length} recipients
      </div>
      <MapContainer style={{ height: '100%', width: '100%' }} zoom={mapZoom} center={mapCenter as [number, number]}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <FitBounds points={points} />
        {donations.map((d) => (
          <Marker key={d.id} position={[d.lat, d.lng]} icon={getDonationIcon(d.id)}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Donation</div>
                <div style={{ marginBottom: 6 }}>{d.title}</div>
                {recipients.map((r) => (
                  <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <span style={{ flex: 1 }}>{r.name}</span>
                    <button
                      disabled={isAccepted(d.id, r.id)}
                      onClick={() => setConfirm({ donationId: d.id, recipientId: r.id })}
                    >
                      {isAccepted(d.id, r.id) ? 'Accepted' : 'Accept'}
                    </button>
                  </div>
                ))}
              </div>
            </Popup>
          </Marker>
        ))}
        {recipients.map((r) => (
          <Marker key={r.id} position={[r.lat, r.lng]} icon={getRecipientIcon(r.id)}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Recipient / NGO</div>
                <div>{r.name}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <AcceptModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) onAccept(confirm.donationId, confirm.recipientId)
          setConfirm(null)
        }}
      />
    </>
  )
}


