import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/axios'

// Types
type Request = {
  _id: string
  donationId: string
  ngoId: string
  status: string
  createdAt: string
}

type Donation = {
  _id: string
  title: string
  description: string
  quantity: string
  status: string
  donorId: string
  address?: string
}

type User = {
  _id: string
  name: string
  email: string
  role: string
  phoneNumber?: string
  address?: string
}

type EnrichedRequest = Request & {
  donation: Donation | null
  donorInfo?: User | null
}

export function NgoDashboard() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(true)
  const [requests, setRequests] = useState<EnrichedRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'past'>('pending')

  // Fetch data
  const fetchData = async () => {
    try {
      setError('')
      const [requestsRes, donationsRes] = await Promise.all([
        api.get('/requests'),
        api.get('/donations')
      ])

      const allRequests: Request[] = requestsRes.data.requests || []
      const allDonations: Donation[] = donationsRes.data.donations || []

      // Create donation lookup map
      const donationMap = new Map(allDonations.map(d => [d._id, d]))

      // Enrich requests with donation data
      const enriched: EnrichedRequest[] = allRequests.map(req => ({
        ...req,
        donation: donationMap.get(req.donationId) || null,
        donorInfo: null
      }))

      // For active requests, fetch donor info
      for (const req of enriched) {
        if (req.status === 'accepted' && req.donation?.donorId) {
          try {
            const userRes = await api.get(`/users/${req.donation.donorId}`)
            req.donorInfo = userRes.data.user
          } catch {
            // Ignore errors, keep donorInfo null
          }
        }
      }

      setRequests(enriched)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load data. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter requests by category
  const pendingRequests = requests.filter(r => r.status === 'pending')
  const activeRequests = requests.filter(r =>
    r.status === 'accepted' && r.donation &&
    ['reserved', 'in_transit'].includes(r.donation.status)
  )
  const pastRequests = requests.filter(r =>
    r.status === 'rejected' ||
    (r.donation && ['completed', 'expired'].includes(r.donation.status))
  )

  // Actions

  const handleConfirmPickup = async (donationId: string) => {
    setActionLoading(donationId)
    try {
      await api.post(`/donations/${donationId}/confirm-pickup`)
      await fetchData()
    } catch (err) {
      console.error('Error confirming pickup:', err)
      alert('Failed to confirm pickup.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkComplete = async (donationId: string) => {
    setActionLoading(donationId)
    try {
      await api.post(`/donations/${donationId}/complete`)
      await fetchData()
    } catch (err) {
      console.error('Error marking complete:', err)
      alert('Failed to mark as complete.')
    } finally {
      setActionLoading(null)
    }
  }

  const getCurrentTabData = () => {
    switch (activeTab) {
      case 'pending': return pendingRequests
      case 'active': return activeRequests
      case 'past': return pastRequests
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
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: '#1f2933',
                marginBottom: '6px',
              }}
            >
              NGO Dashboard
            </h1>
            <p style={{ color: '#4b5563', fontSize: '16px' }}>
              Manage donation requests and track pickups.
            </p>
          </div>

          {/* AVAILABILITY TOGGLE */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
            }}
          >
            <span style={{ fontSize: '14px', color: '#374151' }}>
              Availability
            </span>
            <label style={{ position: 'relative', width: '48px', height: '26px' }}>
              <input
                type="checkbox"
                checked={isOpen}
                onChange={() => setIsOpen(!isOpen)}
                style={{ display: 'none' }}
              />
              <span
                style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: isOpen ? '#16a34a' : '#d1d5db',
                  borderRadius: '999px',
                  transition: '0.2s',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  height: '20px',
                  width: '20px',
                  left: isOpen ? '24px' : '4px',
                  top: '3px',
                  backgroundColor: '#ffffff',
                  borderRadius: '50%',
                  transition: '0.2s',
                }}
              />
            </label>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: isOpen ? '#16a34a' : '#6b7280',
              }}
            >
              {isOpen ? 'Open' : 'Closed'}
            </span>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <TabButton active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} count={pendingRequests.length}>
            📬 Pending Requests
          </TabButton>
          <TabButton active={activeTab === 'active'} onClick={() => setActiveTab('active')} count={activeRequests.length}>
            🚗 Active Pickups
          </TabButton>
          <TabButton active={activeTab === 'past'} onClick={() => setActiveTab('past')} count={pastRequests.length}>
            📦 Past
          </TabButton>
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

        {/* CONTENT */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
              Loading...
            </div>
          ) : getCurrentTabData().length === 0 ? (
            <EmptyState tab={activeTab} onViewRequests={() => navigate('/ngo/request')} />
          ) : (
            getCurrentTabData().map((request) => (
              <RequestCard
                key={request._id}
                request={request}
                tab={activeTab}
                actionLoading={actionLoading}
                onViewDetails={() => navigate('/ngo/request')}
                onConfirmPickup={() => request.donation && handleConfirmPickup(request.donation._id)}
                onMarkComplete={() => request.donation && handleMarkComplete(request.donation._id)}
              />
            ))
          )}
        </div>

        {/* VIEW NEW REQUESTS BUTTON */}
        {activeTab !== 'pending' && (
          <div style={{ marginTop: '24px' }}>
            <button
              onClick={() => navigate('/ngo/request')}
              style={primaryButton}
            >
              View New Donation Requests
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- Components ---------- */

function RequestCard({
  request,
  tab,
  actionLoading,
  onViewDetails,
  onConfirmPickup,
  onMarkComplete,
}: {
  request: EnrichedRequest
  tab: 'pending' | 'active' | 'past'
  actionLoading: string | null
  onViewDetails: () => void
  onConfirmPickup: () => void
  onMarkComplete: () => void
}) {
  const isLoading = actionLoading === request._id || actionLoading === request.donation?._id
  const donationStatus = request.donation?.status || 'unknown'

  return (
    <div
      style={{
        padding: '20px 24px',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#1f2933' }}>
            {request.donation?.title || 'Unknown Donation'}
          </div>
          <div style={{ fontSize: '14px', color: '#4b5563', marginTop: '4px' }}>
            {request.donation?.description} · {request.donation?.quantity}
          </div>
          {tab === 'active' && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: 500 }}>
                Pickup: {request.donation?.address || 'Address not available'}
              </div>
              <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '4px' }}>
                Donor: {request.donorInfo?.name || 'Loading...'} | Phone: {request.donorInfo?.phoneNumber || 'N/A'}
              </div>
            </div>
          )}
          {tab === 'past' && (
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>
              Status: {request.status === 'rejected' ? '❌ Rejected' : `✅ ${donationStatus}`}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {tab === 'pending' && (
            <ActionButton
              label="View Details →"
              color="#2563eb"
              bgColor="#dbeafe"
              onClick={onViewDetails}
              disabled={false}
            />
          )}
          {tab === 'active' && donationStatus === 'reserved' && (
            <ActionButton
              label="Confirm Pickup"
              color="#1d4ed8"
              bgColor="#dbeafe"
              onClick={onConfirmPickup}
              disabled={isLoading}
              loading={isLoading}
            />
          )}
          {tab === 'active' && donationStatus === 'in_transit' && (
            <ActionButton
              label="Mark Completed"
              color="#16a34a"
              bgColor="#dcfce7"
              onClick={onMarkComplete}
              disabled={isLoading}
              loading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ActionButton({
  label,
  color,
  bgColor,
  onClick,
  disabled,
  loading,
}: {
  label: string
  color: string
  bgColor: string
  onClick: () => void
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: 500,
        backgroundColor: bgColor,
        color: color,
        border: 'none',
        borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {loading ? 'Processing...' : label}
    </button>
  )
}

function TabButton({
  children,
  active,
  onClick,
  count,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  count: number
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: 500,
        backgroundColor: active ? '#16a34a' : '#ffffff',
        color: active ? '#ffffff' : '#374151',
        border: active ? 'none' : '1px solid #e5e7eb',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {children}
      <span
        style={{
          backgroundColor: active ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
          padding: '2px 8px',
          borderRadius: '999px',
          fontSize: '12px',
        }}
      >
        {count}
      </span>
    </button>
  )
}

function EmptyState({ tab, onViewRequests }: { tab: string; onViewRequests: () => void }) {
  const config = {
    pending: {
      icon: '📬',
      title: 'No pending requests',
      subtitle: 'New donation requests will appear here',
    },
    active: {
      icon: '🚗',
      title: 'No active pickups',
      subtitle: 'Accept requests to start tracking pickups',
    },
    past: {
      icon: '📦',
      title: 'No past deliveries',
      subtitle: 'Your completed pickups will appear here',
    },
  }[tab] || { icon: '📦', title: 'Nothing here', subtitle: '' }

  return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>{config.icon}</div>
      <div style={{ fontSize: '16px', fontWeight: 500 }}>{config.title}</div>
      <div style={{ fontSize: '14px', marginTop: '8px' }}>{config.subtitle}</div>
      {tab === 'pending' && (
        <button onClick={onViewRequests} style={{ ...primaryButton, marginTop: '24px' }}>
          Browse Available Donations
        </button>
      )}
    </div>
  )
}

const primaryButton: React.CSSProperties = {
  padding: '14px 24px',
  fontSize: '16px',
  fontWeight: 600,
  backgroundColor: '#16a34a',
  color: '#ffffff',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
}
