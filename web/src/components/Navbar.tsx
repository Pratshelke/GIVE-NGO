import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)

  const hideUserInfo =
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/register'

  // Determine dashboard path from user role
  const dashboardPath = user?.role === 'NGO' ? '/ngo' : '/donor'

  const handleLogout = () => {
    logout()
    navigate('/')
    setShowDropdown(false)
  }

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          padding: '0 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* LEFT - Clickable Logo */}
        <div
          onClick={() => navigate(hideUserInfo ? '/' : dashboardPath)}
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#1f2933',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '24px' }}>🍽️</span>
          GiveNGo
        </div>

        {/* RIGHT - User Profile */}
        {!hideUserInfo && (
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: showDropdown ? '#f3f4f6' : 'transparent',
                transition: 'background-color 0.2s',
              }}
            >
              <span>{user?.name || 'User'}</span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: user?.role === 'NGO' ? '#16a34a' : '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#ffffff',
                }}
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span style={{ fontSize: '12px' }}>▼</span>
            </div>

            {/* Dropdown Menu */}
            {showDropdown && (
              <>
                {/* Overlay to close dropdown */}
                <div
                  onClick={() => setShowDropdown(false)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 99,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    minWidth: '200px',
                    overflow: 'hidden',
                    zIndex: 100,
                  }}
                >
                  {/* User Info Header */}
                  <div
                    style={{
                      padding: '16px',
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: '#f9fafb',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#1f2933' }}>{user?.name}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                      {user?.email}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: user?.role === 'NGO' ? '#16a34a' : '#2563eb',
                        fontWeight: 500,
                        marginTop: '4px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {user?.role === 'NGO' ? '🏢 NGO Account' : '🎁 Donor Account'}
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div style={{ padding: '8px' }}>
                    <DropdownItem
                      label="View Profile"
                      onClick={() => {
                        // TODO: Navigate to profile page when implemented
                        alert('Profile page coming soon!')
                        setShowDropdown(false)
                      }}
                    />
                    <DropdownItem
                      label="Edit Profile"
                      onClick={() => {
                        // TODO: Navigate to edit profile page when implemented
                        alert('Edit profile coming soon!')
                        setShowDropdown(false)
                      }}
                    />
                    <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '8px 0' }} />
                    <DropdownItem
                      label="Logout"
                      onClick={handleLogout}
                      isDestructive
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

function DropdownItem({
  label,
  onClick,
  isDestructive = false,
}: {
  label: string
  onClick: () => void
  isDestructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '10px 12px',
        textAlign: 'left',
        border: 'none',
        backgroundColor: 'transparent',
        color: isDestructive ? '#dc2626' : '#374151',
        fontSize: '14px',
        cursor: 'pointer',
        borderRadius: '6px',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {label}
    </button>
  )
}
