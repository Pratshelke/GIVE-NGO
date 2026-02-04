import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { GooglePlacesInput } from '../components/GooglePlacesInput'

export function RegisterPage() {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [role, setRole] = useState<'Donor' | 'NGO'>('Donor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // NGO location fields
  const [address, setAddress] = useState('')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Handle place selection for NGO
  const handlePlaceSelect = (place: { lat: number; lng: number; formattedAddress: string }) => {
    setAddress(place.formattedAddress)
    setLocation({ lat: place.lat, lng: place.lng })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate fields
    if (!name.trim() || !email.trim() || !password.trim() || !phoneNumber.trim()) {
      setError('Please fill in all required fields')
      return
    }

    // NGO-specific validation
    if (role === 'NGO' && (!address || !location)) {
      setError('Please select your organization address from the suggestions')
      return
    }

    setLoading(true)

    try {
      // Build location data for NGO
      const locationData = role === 'NGO' && location ? {
        type: 'Point' as const,
        coordinates: [location.lng, location.lat] as [number, number]
      } : undefined

      // Call register from auth context
      await register(
        name.trim(),
        email.trim(),
        password.trim(),
        role,
        phoneNumber.trim(),
        role === 'NGO' ? address : undefined,
        locationData
      )

      // Navigation will be handled by App.tsx based on user role
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <section
        style={{
          width: '100%',
          padding: '80px 32px',
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '64px',
            alignItems: 'center',
          }}
        >
          {/* LEFT INFO */}
          <div>
            <h1
              style={{
                fontSize: '40px',
                fontWeight: 700,
                color: '#1f2933',
                marginBottom: '16px',
              }}
            >
              Create an Account
            </h1>

            <p
              style={{
                fontSize: '18px',
                color: '#4b5563',
                maxWidth: '420px',
                lineHeight: 1.6,
              }}
            >
              Register to start donating surplus resources or managing donation
              requests through the GiveNGo platform.
            </p>
          </div>

          {/* FORM */}
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              padding: '40px',
              backgroundColor: '#ffffff',
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

              {/* Name */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  style={inputStyle}
                  disabled={loading}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  style={inputStyle}
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  style={inputStyle}
                  disabled={loading}
                />
              </div>

              {/* Phone Number */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Phone Number *</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  style={inputStyle}
                  disabled={loading}
                />
              </div>

              {/* Role */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Register as *</label>
                <select
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value as 'Donor' | 'NGO')
                    // Clear NGO fields when switching to Donor
                    if (e.target.value === 'Donor') {
                      setAddress('')
                      setLocation(null)
                    }
                  }}
                  style={inputStyle}
                  disabled={loading}
                >
                  <option value="Donor">Donor</option>
                  <option value="NGO">NGO</option>
                </select>
              </div>

              {/* NGO Address (conditional) */}
              {role === 'NGO' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Organization Address *</label>
                  <GooglePlacesInput
                    placeholder="Search for your organization address..."
                    onPlaceSelect={handlePlaceSelect}
                  />
                  {address && (
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
                      Selected: {address}
                    </div>
                  )}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...primaryButton,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Creating Account...' : 'Register'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ---------- Styles ---------- */

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 500,
  marginBottom: '6px',
  color: '#374151',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  fontSize: '15px',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  boxSizing: 'border-box',
}

const primaryButton: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  fontSize: '16px',
  fontWeight: 600,
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
}
