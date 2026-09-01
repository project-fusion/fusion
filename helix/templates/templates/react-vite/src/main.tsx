import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fusion.dev/helix-styles/all.css'
import '@fusion.dev/helix/elements.css'
/* A custom element registers as a side effect of being imported, so this line is
   what makes every Helix tag in the app real. Import the whole library while you
   are finding your feet; `@fusion.dev/helix/button` and its siblings are subpath
   exports when you would rather pay for only what you use. */
import '@fusion.dev/helix'

import { App } from './App.js'

createRoot(document.querySelector('#root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
