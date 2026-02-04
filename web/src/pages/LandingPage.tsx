import { useNavigate } from 'react-router-dom'

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ backgroundColor: '#ffffff' }}>
      {/* HERO SECTION */}
      <section
        style={{
          padding: '140px 32px 96px', // extra top space for future navbar
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '72px',
            alignItems: 'center',
          }}
        >
          {/* LEFT CONTENT */}
          <div>
            <h1
              style={{
                fontSize: '52px',
                fontWeight: 700,
                color: '#1f2933',
                lineHeight: 1.1,
                marginBottom: '24px',
              }}
            >
              GiveNGo
            </h1>

            <p
              style={{
                fontSize: '20px',
                color: '#4b5563',
                maxWidth: '560px',
                lineHeight: 1.6,
                marginBottom: '40px',
              }}
            >
              A donation coordination platform that connects donors with nearby NGOs
              to ensure resources reach the right hands efficiently.
            </p>

            <div style={{ display: 'flex', gap: '20px' }}>
              <button onClick={() => navigate('/login')} style={primaryButton}>
                Login
              </button>

              <button onClick={() => navigate('/register')} style={secondaryButton}>
                Register
              </button>
            </div>
          </div>

          {/* RIGHT IMAGE */}
          <div
            style={{
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1593113598332-cd288d649433"
              alt="Platform overview illustration"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section
        style={{
          padding: '96px 32px',
          backgroundColor: '#f9fafb',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '40px',
          }}
        >
          <FeatureCard
            title="For Donors"
            description="Create donations and track their status as NGOs respond and accept requests."
          />

          <FeatureCard
            title="For NGOs"
            description="Receive nearby donation requests and manage accepted donations efficiently."
          />

          <FeatureCard
            title="Smart Coordination"
            description="Designed to support sequential notifications and fair resource distribution."
          />
        </div>
      </section>
    </div>
  )
}

/* ---------- Styles ---------- */

const primaryButton: React.CSSProperties = {
  padding: '16px 40px',
  fontSize: '16px',
  fontWeight: 600,
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
}

const secondaryButton: React.CSSProperties = {
  padding: '16px 40px',
  fontSize: '16px',
  fontWeight: 600,
  backgroundColor: '#ffffff',
  color: '#2563eb',
  border: '1px solid #2563eb',
  borderRadius: '10px',
  cursor: 'pointer',
}

function FeatureCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        padding: '40px',
        borderRadius: '14px',
        border: '1px solid #e5e7eb',
      }}
    >
      <h3
        style={{
          fontSize: '22px',
          fontWeight: 600,
          marginBottom: '16px',
          color: '#1f2933',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '16px',
          color: '#4b5563',
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>
    </div>
  )
}
