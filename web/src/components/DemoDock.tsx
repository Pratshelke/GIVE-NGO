import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api, DEMO_MODE } from '../lib/axios'
import { DEMO_ACCOUNTS } from '../lib/demo/store'
import { useToast } from './Toast'

/** Floating presenter controls: hop between the donor and NGO side in one click. */
export function DemoDock() {
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [confirmReset, setConfirmReset] = useState(false)
  if (!DEMO_MODE) return null

  const as = async (role: 'donor' | 'ngo') => {
    const acc = DEMO_ACCOUNTS[role]
    await login(acc.email, acc.password)
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
    toast('Demo data restored to the starting state.')
  }

  const isDemoDonor = user?.email === DEMO_ACCOUNTS.donor.email
  const isDemoNgo = user?.email === DEMO_ACCOUNTS.ngo.email

  return (
    <div className="demo-dock" role="toolbar" aria-label="Demo controls">
      <span className="label">
        Demo<span>&nbsp;· view as</span>
      </span>
      <button className={isDemoDonor ? 'on' : ''} onClick={() => as('donor')}>
        Donor
      </button>
      <button className={isDemoNgo ? 'on' : ''} onClick={() => as('ngo')}>
        NGO
      </button>
      <button onClick={reset} title="Restore the sample data">
        {confirmReset ? 'Tap to confirm' : 'Reset'}
      </button>
    </div>
  )
}
