import { render } from 'solid-js/web'

/* Every layer in one import: the tokens, the reset, the utility layer, and the
   `:not(:defined)` rules that keep a tag from arriving unstyled. It reaches its
   pieces by bare specifier, so a bundler resolves it and a `<link>` cannot. */
import '@fusion.dev/helix-styles/helix.css'
/* A custom element registers as a side effect of being imported, so this line
   makes every Helix tag in the app real. Import the whole library while you are
   finding your feet. `@fusion.dev/helix/button` and its siblings are subpath
   exports, for when you want to pay for only what you use. */
import '@fusion.dev/helix'
/* After both, so a rule of yours that names the same thing wins. */
import './app.css'

import { App } from './App.tsx'

/* **Diagnostics in development, and none of it in a build.** `vite build`
   replaces `import.meta.env.DEV` with `false` and drops the import with it. */
if (import.meta.env.DEV) {
  void import('./diagnostics.ts')
}

render(() => <App />, document.querySelector('#root') as HTMLElement)
