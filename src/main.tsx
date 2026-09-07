import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'
import '@/styles/globals.css'

// Handle SPA routing redirect from 404.html on static hosting
try {
  const spaRedirect = sessionStorage.getItem('onivis_spa_redirect')
  if (spaRedirect) {
    sessionStorage.removeItem('onivis_spa_redirect')
    window.history.replaceState(null, '', spaRedirect)
  }
} catch (e) {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
