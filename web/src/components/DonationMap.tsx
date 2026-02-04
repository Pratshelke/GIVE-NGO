/**
 * Reusable map component for displaying a single donation location
 */
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icon not showing in Leaflet with bundlers
const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
})

// Create a custom donation marker icon
const donationIcon = L.divIcon({
    className: 'donation-location-icon',
    html: `
    <div style="
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="
        transform: rotate(45deg);
        font-size: 16px;
      ">📍</span>
    </div>
  `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
})

type DonationMapProps = {
    latitude: number
    longitude: number
    label?: string
    height?: number
}

export function DonationMap({
    latitude,
    longitude,
    label,
    height = 250
}: DonationMapProps) {
    // Validate coordinates
    if (!isFinite(latitude) || !isFinite(longitude)) {
        return (
            <div
                style={{
                    height: `${height}px`,
                    backgroundColor: '#f3f4f6',
                    borderRadius: '12px',
                    border: '2px dashed #d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    fontSize: '14px',
                }}
            >
                📍 Invalid coordinates
            </div>
        )
    }

    return (
        <div
            style={{
                height: `${height}px`,
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
            }}
        >
            <MapContainer
                center={[latitude, longitude]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <Marker position={[latitude, longitude]} icon={donationIcon}>
                    {label && (
                        <Popup>
                            <div style={{ fontWeight: 500, fontSize: '14px' }}>
                                {label}
                            </div>
                        </Popup>
                    )}
                </Marker>
            </MapContainer>
        </div>
    )
}

export { defaultIcon }
