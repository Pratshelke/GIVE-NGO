import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './layout/Layout'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ToastProvider } from './components/Toast'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DonorDashboard } from './pages/DonorDashboard'
import { CreateDonationPage } from './pages/CreateDonationPage'
import { NgoDashboard } from './pages/NgoDashboard'
import { ProfilePage } from './pages/ProfilePage'
import { LiveMapPage } from './pages/LiveMapPage'

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }} className="muted">
        Loading GiveNGo…
      </div>
    )
  }
  const home = user ? <Navigate to={user.role === 'NGO' ? '/ngo' : '/donor'} replace /> : null
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={home ?? <LoginPage />} />
        <Route path="/register" element={home ?? <RegisterPage />} />
        <Route path="/donor" element={<ProtectedRoute requiredRole="Donor"><DonorDashboard /></ProtectedRoute>} />
        <Route path="/donor/create" element={<ProtectedRoute requiredRole="Donor"><CreateDonationPage /></ProtectedRoute>} />
        <Route path="/ngo" element={<ProtectedRoute requiredRole="NGO"><NgoDashboard /></ProtectedRoute>} />
        <Route path="/ngo/request" element={<Navigate to="/ngo" replace />} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/map" element={<LiveMapPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  )
}
