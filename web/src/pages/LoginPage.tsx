import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)

      // Navigation will be handled by App.tsx after login
      // User will be redirected based on their role
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.')
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
              Welcome Back
            </h1>

            <p
              style={{
                fontSize: '18px',
                color: '#4b5563',
                maxWidth: '420px',
                lineHeight: 1.6,
              }}
            >
              Login to continue managing donations and requests on the GiveNGo platform.
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
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {error && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '14px',
                  marginBottom: '20px'
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                style={{
                  ...primaryButton,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
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
