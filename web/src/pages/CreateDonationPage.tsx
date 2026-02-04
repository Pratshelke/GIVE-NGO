import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/axios'
import { DonationMap } from '../components/DonationMap'
import { GooglePlacesInput } from '../components/GooglePlacesInput'

export function CreateDonationPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [locationName, setLocationName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Coordinates from Google Places selection
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)

  // Handle place selection from Google Places Autocomplete
  const handlePlaceSelect = (place: { lat: number; lng: number; formattedAddress: string }) => {
    setLocationName(place.formattedAddress)
    setCoordinates({ lat: place.lat, lng: place.lng })
  }

  // Validation
  const validateForm = () => {
    if (!title.trim()) return 'Donation title is required'
    if (!description.trim()) return 'Description is required'
    if (!quantity.trim()) return 'Quantity is required'
    if (!coordinates) return 'Please select a pickup location from the suggestions'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate form
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      // Backend will use req.user._id from JWT as donorId
      await api.post('/donations', {
        title: title.trim(),
        description: description.trim(),
        quantity: quantity.trim(),
        // Formatted pickup address for NGO display
        address: locationName,
        // Send actual geocoded coordinates in GeoJSON format [lng, lat]
        location: {
          type: 'Point',
          coordinates: [coordinates!.lng, coordinates!.lat]
        }
      })

      // Navigate to donor dashboard on success
      navigate('/donor')
    } catch (err) {
      console.error('Error creating donation:', err)
      setError('Failed to create donation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        padding: '40px 32px',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* HEADER */}
        <div style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#1f2933',
              marginBottom: '8px',
            }}
          >
            Create Donation
          </h1>
          <p style={{ fontSize: '16px', color: '#4b5563' }}>
            Share surplus food with NGOs in your area. Fill in the details below.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          {/* FORM CARD */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              padding: '32px',
            }}
          >
            <form onSubmit={handleSubmit}>
              {/* Error Message */}
              {error && (
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#dc2626',
                    fontSize: '14px',
                    marginBottom: '20px',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Title */}
              <FormField label="Donation Title" required>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Wedding Feast Leftovers"
                  style={inputStyle}
                />
              </FormField>

              {/* Description */}
              <FormField label="Food Description" required>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Cooked rice, dal, sabzi - freshly prepared today"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </FormField>

              {/* Quantity */}
              <FormField label="Quantity" required>
                <input
                  type="text"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 100 plates, 50 kg"
                  style={inputStyle}
                />
              </FormField>

              {/* Location */}
              <FormField label="Pickup Location" required>
                <GooglePlacesInput
                  placeholder="Search for pickup location (e.g., hotel name, address)..."
                  onPlaceSelect={handlePlaceSelect}
                />
                {coordinates && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '6px',
                      color: '#16a34a',
                      fontSize: '13px',
                    }}
                  >
                    ✓ Location selected: {locationName}
                  </div>
                )}
              </FormField>

              {/* ACTIONS */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '24px',
                }}
              >
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...primaryButton,
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    flex: 1,
                  }}
                >
                  {loading ? 'Creating...' : '🍽️ Create Donation'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/donor')}
                  disabled={loading}
                  style={{
                    ...secondaryButton,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* MAP PREVIEW */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#1f2933',
                marginBottom: '16px',
              }}
            >
              📍 Pickup Location Preview
            </h3>

            {/* Map Placeholder or Actual Map */}
            {coordinates ? (
              <DonationMap
                latitude={coordinates.lat}
                longitude={coordinates.lng}
                label={locationName || 'Pickup Location'}
                height={280}
              />
            ) : (
              <div
                style={{
                  flex: 1,
                  minHeight: '250px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '12px',
                  border: '2px dashed #d1d5db',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗺️</div>
                <div style={{ fontSize: '15px', fontWeight: 500 }}>Map Preview</div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                  Enter an address and click "Locate on Map"
                </div>
              </div>
            )}

            {/* Location Info */}
            {locationName && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '8px',
                  border: '1px solid #bbf7d0',
                }}
              >
                <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: 500 }}>
                  Selected Location
                </div>
                <div style={{ fontSize: '15px', color: '#1f2933', marginTop: '4px' }}>
                  {locationName}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Reusable Components & Styles ---------- */

function FormField({
  label,
  children,
  required = false,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label
        style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: 500,
          marginBottom: '6px',
          color: '#374151',
        }}
      >
        {label}
        {required && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  fontSize: '15px',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
}

const primaryButton: React.CSSProperties = {
  padding: '14px 24px',
  fontSize: '16px',
  fontWeight: 600,
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
}

const secondaryButton: React.CSSProperties = {
  padding: '14px 24px',
  fontSize: '16px',
  fontWeight: 600,
  backgroundColor: '#ffffff',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: '10px',
  cursor: 'pointer',
}
