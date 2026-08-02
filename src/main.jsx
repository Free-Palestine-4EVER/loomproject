import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import './loom-bg.css'
import './textile.css'
import './textile-details.css'
import './brand-skin.css'
import './wool.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// LOOM Studio — in-page visual editing. Dev only; the dynamic import keeps it
// out of the production bundle entirely. See studio.md.
if (import.meta.env.DEV) import('./studio/index.jsx').then((m) => m.mountStudio())
