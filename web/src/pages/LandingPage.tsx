import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api, DEMO_MODE } from '../lib/axios'
import { DEMO_ACCOUNTS } from '../lib/demo/store'
import { useLiveQuery } from '../lib/hooks'
import type { NgoPin, PublicStats } from '../lib/types'
import { CITY_CENTER, MAX_DISTANCE_KM } from '../lib/geo'
import { MapCanvas } from '../components/MapCanvas'
import { StatusBadge } from '../components/ui'

export function LandingPage() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const { data: stats } = useLiveQuery(async () => (await api.get('/stats')).data.stats as PublicStats)
  const { data: ngos } = useLiveQuery(async () => (await api.get('/ngos')).data.ngos as NgoPin[])

  const tryAs = async (role: 'donor' | 'ngo') => {
    await login(DEMO_ACCOUNTS[role].email, DEMO_ACCOUNTS[role].password)
    navigate(role === 'ngo' ? '/ngo' : '/donor')
  }

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="stack" style={{ gap: 22 }}>
            <span className="eyebrow">Surplus food rescue · Pune</span>
            <h1>
              Good food shouldn't wait. <em>The nearest NGO</em> gets it in minutes.
            </h1>
            <p className="lede">
              Restaurants, caterers and households post leftover food. GiveNGo offers it to the closest available NGO
              first, then the next, until someone is on the way.
            </p>
            {user ? (
              <div className="row">
                <button className="btn btn-primary btn-lg" onClick={() => navigate(user.role === 'NGO' ? '/ngo' : '/donor')}>
                  Go to my dashboard
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => navigate('/map')}>
                  See the live map
                </button>
              </div>
            ) : (
              <div className="row">
                <button className="btn btn-primary btn-lg" onClick={() => navigate('/register?role=Donor')}>
                  Donate surplus food
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => navigate('/register?role=NGO')}>
                  I run an NGO
                </button>
              </div>
            )}
            {DEMO_MODE && !user && (
              <div className="stack" style={{ gap: 8 }}>
                <span className="small muted">Showing someone? Jump straight in with a sample account:</span>
                <div className="demo-pick">
                  <button onClick={() => tryAs('donor')}>
                    <strong>🍛 Annapurna Kitchens</strong>
                    <span className="small muted">Restaurant donating today's surplus</span>
                  </button>
                  <button onClick={() => tryAs('ngo')}>
                    <strong>🏠 Seva Food Bank</strong>
                    <span className="small muted">NGO with a pickup request waiting</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="ticket" aria-label="Example of how a donation is dispatched">
            <div className="ticket-head">
              <div>
                <div className="eyebrow">Example dispatch</div>
                <h3>Veg biryani & dal · 18 kg</h3>
              </div>
              <StatusBadge status="pending" label="Matching" />
            </div>
            <div className="ticket-body">
              <div className="meta">
                <span>📍 MG Road, Camp</span>
                <span>🍽️ ~70 servings</span>
                <span className="mono">Pickup by 3:30 pm</span>
              </div>
              <ul className="timeline">
                <li>
                  <span className="dot ok" />
                  <span>Posted by Hotel Blue Lotus</span>
                  <span className="mono small muted">1:04 pm</span>
                </li>
                <li>
                  <span className="dot" />
                  <span>
                    Offered to <b>Sahara Old Age Home</b> <span className="muted">· 0.8 km</span>
                    <br />
                    <span className="small muted">Kitchen full today, passed it on</span>
                  </span>
                  <span className="mono small muted">1:05 pm</span>
                </li>
                <li>
                  <span className="dot live" />
                  <span>
                    Offered to <b>Seva Food Bank</b> <span className="muted">· 3.6 km</span>
                    <br />
                    <span className="small muted">Deciding now, 10 minutes to respond</span>
                  </span>
                  <span className="mono small" style={{ color: 'var(--accent)' }}>
                    06:12
                  </span>
                </li>
                <li>
                  <span className="dot" />
                  <span className="muted">Next nearest: Roti Ghar Trust · 4.4 km</span>
                  <span />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="band alt">
        <div className="container stack" style={{ gap: 20 }}>
          <span className="eyebrow">Impact so far</span>
          <div className="stats-row">
            <div className="card stat">
              <span className="value">{stats?.mealsServed ?? '—'}</span>
              <span className="label">servings delivered</span>
            </div>
            <div className="card stat">
              <span className="value">{stats ? `${stats.kgSaved} kg` : '—'}</span>
              <span className="label">food kept out of landfill</span>
            </div>
            <div className="card stat">
              <span className="value">{stats?.ngos ?? '—'}</span>
              <span className="label">partner NGOs</span>
            </div>
            <div className="card stat">
              <span className="value" style={{ color: 'var(--accent)' }}>
                {stats?.activeDonations ?? '—'}
              </span>
              <span className="label">pickups in progress now</span>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="container stack" style={{ gap: 24 }}>
          <div className="stack" style={{ gap: 6 }}>
            <span className="eyebrow">How a pickup happens</span>
            <h2>From kitchen to plate in four steps</h2>
          </div>
          <div className="steps">
            <div className="card">
              <h3>Post the food</h3>
              <p className="muted">Say what it is, how much, and where to collect it. Takes under a minute.</p>
            </div>
            <div className="card">
              <h3>Nearest NGO is asked</h3>
              <p className="muted">We rank available NGOs within {MAX_DISTANCE_KM} km by distance and offer it to the closest one.</p>
            </div>
            <div className="card">
              <h3>10 minutes to respond</h3>
              <p className="muted">If they pass or don't answer, it moves to the next nearest. No one is spammed.</p>
            </div>
            <div className="card">
              <h3>Pickup and delivery</h3>
              <p className="muted">The donor sees who is coming, gets their number, and is told when food is delivered.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="band alt">
        <div className="container split">
          <div className="stack" style={{ gap: 14 }}>
            <span className="eyebrow">Coverage</span>
            <h2>{ngos ? `${ngos.filter((n) => n.isAvailable).length} NGOs ready to collect right now` : 'NGOs across the city'}</h2>
            <p className="muted">
              Each NGO sets its own availability. When a kitchen is full or a van is out, they switch off and the
              dispatcher skips them, so food goes to someone who can actually take it.
            </p>
            <div className="row">
              <button className="btn btn-primary" onClick={() => navigate('/map')}>
                Open the live map
              </button>
            </div>
          </div>
          <MapCanvas
            center={CITY_CENTER}
            zoom={11}
            markers={(ngos ?? []).map((n) => ({
              id: n._id,
              kind: 'ngo' as const,
              off: !n.isAvailable,
              coords: n.location.coordinates,
              popup: (
                <>
                  <b>{n.name}</b>
                  <br />
                  {n.address}
                </>
              ),
            }))}
            legend={
              <>
                <span>
                  <i style={{ background: 'var(--brand)' }} />
                  Available NGO
                </span>
                <span>
                  <i style={{ background: '#8a978e' }} />
                  Paused
                </span>
              </>
            }
          />
        </div>
      </section>
    </>
  )
}
