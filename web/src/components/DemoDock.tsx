import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { RotateCcw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api, DEMO_MODE } from '../lib/axios'
import { DEMO_ACCOUNTS } from '../lib/demo/store'
import { useToast } from './Toast'

/** Floating presenter controls: hop between the donor and NGO side in one click. */
export function DemoDock({ inApp = false }: { inApp?: boolean }) {
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [confirmReset, setConfirmReset] = useState(false)
  if (!DEMO_MODE) return null

  const as = async (role: 'donor' | 'ngo') => {
    await login(DEMO_ACCOUNTS[role].email, DEMO_ACCOUNTS[role].password)
    navigate(role === 'ngo' ? '/ngo' : '/donor')
  }
  const reset = async () => {
    if (!confirmReset) {
      setConfirmReset(true)
      window.setTimeout(() => setConfirmReset(false), 3500)
      return
    }
    setConfirmReset(false)
    await api.post('/demo/reset')
    logout()
    navigate('/')
    toast('Sample data restored.')
  }
  const current = user?.email === DEMO_ACCOUNTS.donor.email ? 'donor' : user?.email === DEMO_ACCOUNTS.ngo.email ? 'ngo' : null

  return (
    <motion.div className={`demo-dock ${inApp ? 'in-app' : ''}`} role="toolbar" aria-label="Demo controls" initial={{ y: 80, x: '-50%' }} animate={{ y: 0, x: '-50%' }} transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 22 }} style={{ isolation: 'isolate' }}>
      <span className="dd-label">
        <i />
        Demo<span>&nbsp;· view as</span>
      </span>
      {(['donor', 'ngo'] as const).map((r) => (
        <button key={r} className={current === r ? 'on' : ''} onClick={() => as(r)}>
          {current === r && <motion.span layoutId="dd-pill" className="dd-pill" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
          {r === 'donor' ? 'Donor' : 'NGO'}
        </button>
      ))}
      <button onClick={reset} title="Restore the sample data" aria-label="Reset sample data">
        {confirmReset ? 'Confirm?' : <RotateCcw />}
      </button>
    </motion.div>
  )
}
