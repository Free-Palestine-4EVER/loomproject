// LOOM Studio — dev-only mount point.
// Imported dynamically from src/main.jsx behind `import.meta.env.DEV`, so the
// whole overlay (and its CSS) is tree-shaken out of the production bundle.

import { createRoot } from 'react-dom/client'
import Studio from './Studio.jsx'

export function mountStudio() {
  if (typeof document === 'undefined') return
  if (window.__loomStudio) return window.__loomStudio

  const host = document.createElement('div')
  host.id = 'loom-studio-root'
  host.setAttribute('data-studio', '')
  document.body.appendChild(host)

  // Its own root: Studio must never re-render, suspend or crash the site.
  const root = createRoot(host)
  root.render(<Studio />)

  window.__loomStudio = { host, root, unmount: () => { root.unmount(); host.remove(); delete window.__loomStudio } }

  // Vite replaces this module on edit — tear the old overlay down first.
  if (import.meta.hot) import.meta.hot.dispose(() => window.__loomStudio?.unmount())

  return window.__loomStudio
}

export default mountStudio
