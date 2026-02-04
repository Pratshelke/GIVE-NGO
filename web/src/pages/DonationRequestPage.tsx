import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/axios'
import { DonationMap } from '../components/DonationMap'

// Types
type Request = {
  _id: string
  donationId: string
  ngoId: string
  status: string
}

type Donation = {
  _id: string
  title: string
  description: string
  quantity: string
  status: string
  donorId: string
  location?: {
    type: string
    coordinates: [number, number] // [lng, lat]
  }
}

type User = {
  _id: string
  name: string
  email: string
  role: string
}

type EnrichedRequest = Request & {
  donation: Donation | null
}

export function DonationRequestPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<EnrichedRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [acceptedId, setAcceptedId] = useState<string | null>(null)
  const [acceptedDonorInfo, setAcceptedDonorInfo] = useState<User | null>(null)

  // Fetch pending requests
  const fetchRequests = async () => {
    try {
      setError('')
      const [requestsRes, donationsRes] = await Promise.all([
        api.get('/requests'),
        api.get('/donations')
      ])

      const allRequests: Request[] = requestsRes.data.requests || []
      const allDonations: Donation[] = donationsRes.data.donations || []
      const donationMap = new Map(allDonations.map(d => [d._id, d]))

      // Filter pending requests and enrich
      const pendingRequests = allRequests
        .filter(r => r.status === 'pending')
        .map(req => ({
          ...req,
          donation: donationMap.get(req.donationId) || null
        }))

      setRequests(pendingRequests)
    } catch (err) {
      console.error('Error fetching requests:', err)
      setError('Failed to load requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  // Handle actions
  const handleAccept = async (requestId: string, donorId?: string) => {
    setActionLoading(requestId)
    try {
      await api.post(`/requests/${requestId}/accept`)
      setAcceptedId(requestId)

      // Fetch donor info
      if (donorId) {
        try {
          const userRes = await api.get(`/users/${donorId}`)
          setAcceptedDonorInfo(userRes.data.user)
        } catch {
          // Ignore, show fallback
        }
      }

      // Redirect after delay
      setTimeout(() => {
        navigate('/ngo')
      }, 3000)
    } catch (err) {
      console.error('Error accepting request:', err)
      alert('Failed to accept. The donation may have expired.')
      await fetchRequests()
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId)
    try {
      await api.post(`/requests/${requestId}/reject`)
      await fetchRequests()
    } catch (err) {
      console.error('Error rejecting request:', err)
      alert('Failed to reject request.')
    } finally {
      setActionLoading(null)
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
              marginBottom: '6px',
            }}
          >
            Available Donations
          </h1>
          <p style={{ fontSize: '16px', color: '#4b5563' }}>
            Review and accept donations to pick up. You'll see full details after accepting.
          </p>
        </div>

        {/* ERROR STATE */}
        {error && (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              color: '#dc2626',
              marginBottom: '24px',
            }}
          >
            {error}
          </div>
        )}

        {/* REQUEST LIST */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading ? (
            <div
              style={{
                padding: '60px',
                textAlign: 'center',
                color: '#6b7280',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
              Loading available donations...
            </div>
          ) : requests.length === 0 ? (
            <div
              style={{
                padding: '60px',
                textAlign: 'center',
                color: '#6b7280',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
              <div style={{ fontSize: '16px', fontWeight: 500 }}>No available donations</div>
              <div style={{ fontSize: '14px', marginTop: '8px' }}>
                Check back later for new donation requests.
              </div>
            </div>
          ) : (
            requests.map((request) => (
              <RequestCard
                key={request._id}
                request={request}
                isLoading={actionLoading === request._id}
                isAccepted={acceptedId === request._id}
                donorInfo={acceptedId === request._id ? acceptedDonorInfo : null}
                onAccept={() => handleAccept(request._id, request.donation?.donorId)}
                onReject={() => handleReject(request._id)}
              />
            ))
          )}
        </div>

        {/* BACK BUTTON */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <button
            onClick={() => navigate('/ngo')}
            style={{
              padding: '12px 28px',
              fontSize: '15px',
              fontWeight: 500,
              backgroundColor: '#ffffff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Components ---------- */

function RequestCard({
  request,
  isLoading,
  isAccepted,
  donorInfo,
  onAccept,
  onReject,
}: {
  request: EnrichedRequest
  isLoading: boolean
  isAccepted: boolean
  donorInfo: User | null
  onAccept: () => void
  onReject: () => void
}) {
  const donation = request.donation

  // Accepted state - show full details
  if (isAccepted) {
    return (
      <div
        style={{
          backgroundColor: '#f0fdf4',
          border: '2px solid #16a34a',
          borderRadius: '16px',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ fontSize: '32px' }}>✅</div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#16a34a' }}>
              Request Accepted!
            </h3>
            <p style={{ fontSize: '14px', color: '#15803d' }}>
              Redirecting to dashboard...
            </p>
          </div>
        </div>

        {/* REVEALED DONOR INFO */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #bbf7d0',
          }}
        >
          <div style={{ fontSize: '14px', color: '#16a34a', fontWeight: 600, marginBottom: '12px' }}>
            🔓 Donor Contact (Now Visible)
          </div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f2933' }}>
            {donation?.title}
          </div>
          <div style={{ fontSize: '14px', color: '#374151', marginTop: '8px' }}>
            <strong>Donor:</strong> {donorInfo?.name || 'Loading...'}<br />
            <strong>Contact:</strong> {donorInfo?.email || 'N/A'}
          </div>
        </div>
      </div>
    )
  }

  // Soft Accept view - limited info
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        padding: '24px',
        opacity: isLoading ? 0.7 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* LEFT: Food Details */}
        <div>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#1f2933',
              marginBottom: '8px',
            }}
          >
            {donation?.title || 'Food Donation'}
          </h3>
          <p style={{ fontSize: '15px', color: '#4b5563', marginBottom: '8px' }}>
            {donation?.description || 'No description'}
          </p>
          <p style={{ fontSize: '14px', color: '#374151' }}>
            📦 <strong>Quantity:</strong> {donation?.quantity}
          </p>

          {/* Privacy Notice */}
          <div
            style={{
              marginTop: '16px',
              padding: '10px 14px',
              backgroundColor: '#fef3c7',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#92400e',
            }}
          >
            🔒 Donor contact details will be revealed after you accept.
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button
              onClick={onAccept}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                fontSize: '15px',
                fontWeight: 600,
                backgroundColor: isLoading ? '#d1d5db' : '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Processing...' : '✓ Accept & View Details'}
            </button>
            <button
              onClick={onReject}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                fontSize: '15px',
                fontWeight: 500,
                backgroundColor: '#ffffff',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              Skip
            </button>
          </div>
        </div>

        {/* RIGHT: Location Preview */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '12px' }}>
            📍 Pickup Location
          </div>
          {/* Show actual map if location data exists */}
          {donation?.location?.coordinates ? (
            <DonationMap
              latitude={donation.location.coordinates[1]}
              longitude={donation.location.coordinates[0]}
              label={donation.title}
              height={140}
            />
          ) : (
            <div
              style={{
                flex: 1,
                minHeight: '120px',
                backgroundColor: '#e2e8f0',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontSize: '14px',
              }}
            >
              🗺️ Location not available
            </div>
          )}
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '12px' }}>
            Exact address shown after acceptance
          </div>
        </div>
      </div>
    </div>
  )
}
