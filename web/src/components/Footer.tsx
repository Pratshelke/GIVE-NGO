import { DEMO_MODE } from '../lib/axios'

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <span>© {new Date().getFullYear()} GiveNGo · Surplus food, delivered to people who need it.</span>
        <span>
          {DEMO_MODE ? 'Demo mode: data is stored only in this browser.' : 'Connected to GiveNGo server.'} Maps © OpenStreetMap
          contributors.
        </span>
      </div>
    </footer>
  )
}
