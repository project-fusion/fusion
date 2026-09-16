import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/* Every layer in one import: the tokens, the reset, the utility layer, and the
   `:not(:defined)` rules that keep a tag from arriving unstyled. It reaches its
   pieces by bare specifier, so a bundler resolves it and a `<link>` cannot. */
import '@fusion.dev/helix-styles/helix.css'
/* A custom element registers as a side effect of being imported, so this line is
   what makes every Helix tag in the app real. Import the whole library while you
   are finding your feet; `@fusion.dev/helix/button` and its siblings are subpath
   exports when you would rather pay for only what you use. */
import '@fusion.dev/helix'
/* After both, so a rule of yours that names the same thing wins. */
import './app.css'

import { App } from './App.js'

createRoot(document.querySelector('#root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
