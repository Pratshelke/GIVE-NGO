import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/axios'

// Type for donation from API
type Donation = {
  _id: string
  title: string
  quantity: string
  status: string
  description?: string
  createdAt: string
  expiresAt?: string
  currentNgoId?: { _id: string; name: string }
}

// Active statuses (donations in progress)
const ACTIVE_STATUSES = ['pending', 'reserved', 'in_transit']
// Past statuses (donations finished)
const PAST_STATUSES = ['completed', 'expired']

export function DonorDashboard() {
  const navigate = useNavigate()
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active')
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  // Edit modal state
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  // Fetch donations on mount
  const fetchDonations = async () => {
    try {
      setError('')
      const response = await api.get('/donations')
      setDonations(response.data.donations || [])
    } catch (err) {
      console.error('Error fetching donations:', err)
      setError('Failed to load donations. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDonations()
  }, [])

  // Filter donations by status
  const activeDonations = donations.filter(d => ACTIVE_STATUSES.includes(d.status))
  const pastDonations = donations.filter(d => PAST_STATUSES.includes(d.status))

  const displayedDonations = activeTab === 'active' ? activeDonations : pastDonations

  // Handle cancel donation (only for pending)
  const handleCancel = async (donationId: string) => {
    if (!confirm('Are you sure you want to cancel this donation?')) return

    setCancellingId(donationId)
    try {
      await api.delete(`/donations/${donationId}`)
      await fetchDonations()
    } catch (err: any) {
      console.error('Error cancelling donation:', err)
      alert(err.response?.data?.message || 'Failed to cancel donation.')
    } finally {
      setCancellingId(null)
    }
  }

  // Open edit modal
  const handleEditOpen = (donation: Donation) => {
    setEditingDonation(donation)
    setEditTitle(donation.title)
    setEditDescription(donation.description || '')
    setEditQuantity(donation.quantity)
  }

  // Close edit modal
  const handleEditClose = () => {
    setEditingDonation(null)
    setEditTitle('')
    setEditDescription('')
    setEditQuantity('')
  }

  // Save edit
  const handleEditSave = async () => {
    if (!editingDonation) return

    setEditLoading(true)
    try {
      await api.put(`/donations/${editingDonation._id}`, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        quantity: editQuantity.trim(),
      })
      await fetchDonations()
      handleEditClose()
    } catch (err: any) {
      console.error('Error updating donation:', err)
      alert(err.response?.data?.message || 'Failed to update donation.')
    } finally {
      setEditLoading(false)
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
              Donor Dashboard
            </h1>
            <p style={{ color: '#4b5563', fontSize: '16px' }}>
              Manage your donations and track their status.
            </p>
          </div>

          <button
            onClick={() => navigate('/donor/create')}
            style={primaryButton}
          >
            + Create Donation
          </button>
        </div>

        {/* TABS */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
          }}
        >
          <TabButton
            active={activeTab === 'active'}
            onClick={() => setActiveTab('active')}
            count={activeDonations.length}
          >
            Active Donations
          </TabButton>
          <TabButton
            active={activeTab === 'past'}
            onClick={() => setActiveTab('past')}
            count={pastDonations.length}
          >
            Past Donations
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

        {/* DONATIONS LIST */}
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
              Loading donations...
            </div>
          ) : displayedDonations.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                {activeTab === 'active' ? '📦' : '📂'}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 500 }}>
                {activeTab === 'active'
                  ? 'No active donations'
                  : 'No past donations'}
              </div>
              <div style={{ fontSize: '14px', marginTop: '8px' }}>
                {activeTab === 'active'
                  ? 'Create your first donation to get started!'
                  : 'Your completed and expired donations will appear here.'}
              </div>
              {activeTab === 'active' && (
                <button
                  onClick={() => navigate('/donor/create')}
                  style={{ ...primaryButton, marginTop: '24px' }}
                >
                  Create Donation
                </button>
              )}
            </div>
          ) : (
            displayedDonations.map((donation) => (
              <DonationCard
                key={donation._id}
                donation={donation}
                onCancel={() => handleCancel(donation._id)}
                onEdit={() => handleEditOpen(donation)}
                isCancelling={cancellingId === donation._id}
              />
            ))
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingDonation && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleEditClose}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '32px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>
              Edit Donation
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={inputStyle}
                disabled={editLoading}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                disabled={editLoading}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Quantity</label>
              <input
                type="text"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                style={inputStyle}
                disabled={editLoading}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleEditSave}
                disabled={editLoading}
                style={{
                  ...primaryButton,
                  flex: 1,
                  opacity: editLoading ? 0.7 : 1,
                }}
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleEditClose}
                disabled={editLoading}
                style={{
                  ...secondaryButton,
                  flex: 1,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Components ---------- */

function DonationCard({
  donation,
  onCancel,
  onEdit,
  isCancelling,
}: {
  donation: Donation
  onCancel: () => void
  onEdit: () => void
  isCancelling: boolean
}) {
  const statusInfo = getStatusInfo(donation.status)
  const isPending = donation.status === 'pending'

  return (
    <div
      style={{
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      {/* Left: Info */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#1f2933' }}>
            {donation.title}
          </span>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: statusInfo.bgColor,
              color: statusInfo.color,
            }}
          >
            {statusInfo.label}
          </span>
        </div>
        <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '6px' }}>
          {donation.description && `${donation.description} · `}
          Quantity: {donation.quantity}
        </div>
        <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>
          {statusInfo.helpText}
        </div>
        {['reserved', 'in_transit', 'completed'].includes(donation.status) && donation.currentNgoId && (
          <div style={{ fontSize: '13px', color: '#16a34a', marginTop: '4px', fontWeight: 500 }}>
            Pick up accepted by: {donation.currentNgoId.name}
          </div>
        )}
      </div>

      {/* Right: Actions (only for pending) */}
      {isPending && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onEdit}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            ✏️ Edit
          </button>
          <button
            onClick={onCancel}
            disabled={isCancelling}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '8px',
              cursor: isCancelling ? 'not-allowed' : 'pointer',
              opacity: isCancelling ? 0.7 : 1,
            }}
          >
            {isCancelling ? 'Cancelling...' : '✕ Cancel'}
          </button>
        </div>
      )}
    </div>
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
        backgroundColor: active ? '#2563eb' : '#ffffff',
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

/* ---------- Helpers ---------- */

function getStatusInfo(status: string) {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending',
        color: '#b45309',
        bgColor: '#fef3c7',
        helpText: '⏳ Waiting for an NGO to accept',
      }
    case 'reserved':
      return {
        label: 'Reserved',
        color: '#1d4ed8',
        bgColor: '#dbeafe',
        helpText: '✅ NGO has accepted. Waiting for pickup.',
      }
    case 'in_transit':
      return {
        label: 'Pickup in Progress',
        color: '#7c3aed',
        bgColor: '#ede9fe',
        helpText: '🚗 NGO is on the way for pickup',
      }
    case 'completed':
      return {
        label: 'Completed',
        color: '#16a34a',
        bgColor: '#dcfce7',
        helpText: 'Successfully donated',
      }
    case 'expired':
      return {
        label: 'Expired',
        color: '#6b7280',
        bgColor: '#f3f4f6',
        helpText: 'Donation expired or cancelled',
      }
    default:
      return {
        label: status,
        color: '#6b7280',
        bgColor: '#f3f4f6',
        helpText: '',
      }
  }
}

/* ---------- Styles ---------- */

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
