import './App.css'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Layout } from './layout/Layout'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

import { MapPage } from './pages/MapPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DonorDashboard } from './pages/DonorDashboard'
import { CreateDonationPage } from './pages/CreateDonationPage'
import { NgoDashboard } from './pages/NgoDashboard'
import { DonationRequestPage } from './pages/DonationRequestPage'
import { ProfilePage } from './pages/ProfilePage'

// Wrapper to handle auto-redirect after login/register
function AppRoutes() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user && (location.pathname === '/login' || location.pathname === '/register')) {
      // Redirect logged-in users away from login/register to their dashboard
      const targetPath = user.role === 'Donor' ? '/donor' : '/ngo'
      navigate(targetPath, { replace: true })
    }
  }, [user, loading, location.pathname, navigate])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/donor" element={<ProtectedRoute requiredRole="Donor"><DonorDashboard /></ProtectedRoute>} />
        <Route path="/donor/create" element={<ProtectedRoute requiredRole="Donor"><CreateDonationPage /></ProtectedRoute>} />
        <Route path="/ngo" element={<ProtectedRoute requiredRole="NGO"><NgoDashboard /></ProtectedRoute>} />
        <Route path="/ngo/request" element={<ProtectedRoute requiredRole="NGO"><DonationRequestPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/map" element={<MapPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App