import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { Role } from '../lib/types'

export function ProtectedRoute({ children, requiredRole }: { children: ReactNode; requiredRole?: Role }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (requiredRole && user.role !== requiredRole) return <Navigate to={user.role === 'NGO' ? '/ngo' : '/donor'} replace />
  return <>{children}</>
}
