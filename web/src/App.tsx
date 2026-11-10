import { Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ToastProvider } from './components/Toast'
import { CommandMenuProvider } from './components/CommandMenu'
import { ThemeProvider } from './lib/theme'
import { PublicLayout } from './layout/PublicLayout'
import { AppShell } from './layout/AppShell'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DonorDashboard } from './pages/DonorDashboard'
import { CreateDonationPage } from './pages/CreateDonationPage'
import { NgoDashboard } from './pages/NgoDashboard'
import { ProfilePage } from './pages/ProfilePage'
import { LiveMapPage } from './pages/LiveMapPage'
import { DemoDock } from './components/DemoDock'
import { Logo } from './components/ui'

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <span className="brand-mark" style={{ width: 48, height: 48, animation: 'ping 1.4s infinite' }}>
          <Logo />
        </span>
      </div>
    )
  }
  const home = user ? <Navigate to={user.role === 'NGO' ? '/ngo' : '/donor'} replace /> : null
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        {!user && <Route path="/map" element={<div className="container" style={{ paddingTop: 100, paddingBottom: 100 }}><LiveMapPage /></div>} />}
      </Route>
      <Route path="/login" element={home ?? <><LoginPage /><DemoDock /></>} />
      <Route path="/register" element={home ?? <><RegisterPage /><DemoDock /></>} />
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/donor" element={<ProtectedRoute requiredRole="Donor"><DonorDashboard /></ProtectedRoute>} />
        <Route path="/donor/create" element={<ProtectedRoute requiredRole="Donor"><CreateDonationPage /></ProtectedRoute>} />
        <Route path="/ngo" element={<ProtectedRoute requiredRole="NGO"><NgoDashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProfilePage />} />
        {user && <Route path="/map" element={<LiveMapPage />} />}
      </Route>
      <Route path="/ngo/request" element={<Navigate to="/ngo" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <CommandMenuProvider>
              <AppRoutes />
            </CommandMenuProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </MotionConfig>
  )
}
