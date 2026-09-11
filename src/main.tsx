import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'
import '@/styles/globals.css'

// Restore SPA redirect path if routed via 404 fallback
const redirect = typeof window !== 'undefined' ? sessionStorage.getItem('onivis_spa_redirect') : null
if (redirect) {
  sessionStorage.removeItem('onivis_spa_redirect')
  if (redirect !== '/' && redirect !== window.location.pathname) {
    window.history.replaceState(null, '', redirect)
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

