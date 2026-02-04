import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/axios'
import { GooglePlacesInput } from '../components/GooglePlacesInput'

export function ProfilePage() {
    const { user, refreshUser } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isEditing, setIsEditing] = useState(false)

    // Editable fields
    const [phoneNumber, setPhoneNumber] = useState('')
    const [address, setAddress] = useState('')
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

    // Load user data
    useEffect(() => {
        if (user) {
            setPhoneNumber(user.phoneNumber || '')
            setAddress(user.address || '')
        }
    }, [user])

    // Handle place selection for NGO address
    const handlePlaceSelect = (place: { lat: number; lng: number; formattedAddress: string }) => {
        setAddress(place.formattedAddress)
        setLocation({ lat: place.lat, lng: place.lng })
    }

    const handleSave = async () => {
        if (!user) return

        setLoading(true)
        setError('')
        setSuccess('')

        try {
            const payload: any = { phoneNumber }

            // Add location fields for NGO
            if (user.role === 'NGO' && address) {
                payload.address = address
                if (location) {
                    payload.location = {
                        type: 'Point',
                        coordinates: [location.lng, location.lat]
                    }
                }
            }

            await api.put(`/users/${user._id}`, payload)
            await refreshUser()
            setSuccess('Profile updated successfully')
            setIsEditing(false)
        } catch (err: any) {
            console.error('Error updating profile:', err)
            setError(err.response?.data?.message || 'Failed to update profile')
        } finally {
            setLoading(false)
        }
    }

    if (!user) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                Loading...
            </div>
        )
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                backgroundColor: '#f9fafb',
                padding: '40px 32px',
            }}
        >
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
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
                        My Profile
                    </h1>
                    <p style={{ fontSize: '16px', color: '#4b5563' }}>
                        View and update your account information
                    </p>
                </div>

                {/* PROFILE CARD */}
                <div
                    style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #e5e7eb',
                        padding: '32px',
                    }}
                >
                    {/* Messages */}
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
                    {success && (
                        <div
                            style={{
                                padding: '12px 16px',
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: '8px',
                                color: '#16a34a',
                                fontSize: '14px',
                                marginBottom: '20px',
                            }}
                        >
                            {success}
                        </div>
                    )}

                    {/* Name (read-only) */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Name</label>
                        <div style={valueStyle}>{user.name}</div>
                    </div>

                    {/* Email (read-only) */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Email</label>
                        <div style={valueStyle}>{user.email}</div>
                    </div>

                    {/* Role (read-only) */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Role</label>
                        <div style={valueStyle}>{user.role}</div>
                    </div>

                    {/* Phone Number (editable) */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Phone Number</label>
                        {isEditing ? (
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                style={inputStyle}
                                placeholder="Enter phone number"
                            />
                        ) : (
                            <div style={valueStyle}>{user.phoneNumber || 'Not set'}</div>
                        )}
                    </div>

                    {/* Address (NGO only, editable) */}
                    {user.role === 'NGO' && (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Organization Address</label>
                            {isEditing ? (
                                <>
                                    <GooglePlacesInput
                                        placeholder="Search for address..."
                                        onPlaceSelect={handlePlaceSelect}
                                        defaultValue={address}
                                    />
                                    {address && (
                                        <div
                                            style={{
                                                marginTop: '8px',
                                                fontSize: '13px',
                                                color: '#16a34a',
                                            }}
                                        >
                                            Current: {address}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={valueStyle}>{user.address || 'Not set'}</div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    style={{
                                        ...primaryButton,
                                        opacity: loading ? 0.7 : 1,
                                    }}
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false)
                                        setPhoneNumber(user.phoneNumber || '')
                                        setAddress(user.address || '')
                                        setError('')
                                        setSuccess('')
                                    }}
                                    style={secondaryButton}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                style={primaryButton}
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ---------- Styles ---------- */

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '6px',
    color: '#6b7280',
}

const valueStyle: React.CSSProperties = {
    fontSize: '16px',
    color: '#1f2933',
    padding: '12px 0',
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
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 600,
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
}

const secondaryButton: React.CSSProperties = {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 600,
    backgroundColor: '#ffffff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    cursor: 'pointer',
}
