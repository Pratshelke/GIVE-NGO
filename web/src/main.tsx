import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, MemoryRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'
import { DEMO_MODE } from './lib/axios'
import { startDispatcher } from './lib/demo/store'

if (DEMO_MODE) startDispatcher()

// Hash routing works on any static host; memory routing is used for sandboxed single-file previews.
const Router = import.meta.env.VITE_ROUTER === 'memory' ? MemoryRouter : HashRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
)
