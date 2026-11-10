import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { api } from '../lib/axios'
import { useLiveQuery } from '../lib/hooks'
import type { NgoPin, PublicStats } from '../lib/types'
import { DispatchRadar } from './DispatchRadar'
import { AnimatedNumber, Logo } from './ui'

export function AuthSide({ title, body }: { title: string; body: string }) {
  const navigate = useNavigate()
  const { data: ngos } = useLiveQuery(async () => (await api.get('/ngos')).data.ngos as NgoPin[], [], 10000)
  const { data: stats } = useLiveQuery(async () => (await api.get('/stats')).data.stats as PublicStats, [], 10000)
  return (
    <aside className="auth-side ink ink-glow">
      <button className="brand" onClick={() => navigate('/')} style={{ color: 'var(--ink-fg)' }}>
        <span className="brand-mark"><Logo /></span>
        GiveNGo
      </button>
      <motion.div className="stack" style={{ gap: 18 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)' }}>{title}</h2>
        <p className="muted" style={{ maxWidth: '30em' }}>{body}</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
        <DispatchRadar ngos={ngos ?? []} />
      </motion.div>
      <div className="row" style={{ gap: 28 }}>
        <div className="stack" style={{ gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 600, letterSpacing: '-0.04em' }}>
            <AnimatedNumber value={stats?.mealsServed ?? 0} />
          </span>
          <span className="muted small">servings delivered</span>
        </div>
        <div className="stack" style={{ gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 600, letterSpacing: '-0.04em' }}>
            <AnimatedNumber value={stats?.ngos ?? 0} />
          </span>
          <span className="muted small">partner NGOs</span>
        </div>
      </div>
    </aside>
  )
}
