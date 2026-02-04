export function Footer() {
    return (
      <footer
        style={{
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e5e7eb',
          marginTop: 'auto',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '16px 32px',
            fontSize: '14px',
            color: '#6b7280',
            textAlign: 'center',
          }}
        >
          © {new Date().getFullYear()} GiveNGo — Surplus Food Donation Platform
        </div>
      </footer>
    )
  }
  