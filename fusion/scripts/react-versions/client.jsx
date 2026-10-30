import { hydrateRoot } from 'react-dom/client'
import { App } from './app.jsx'

/**
 * Hydrates the server's markup, with the definitions loaded where `?order`
 * says.
 *
 * `early`, the default, evaluates them with the bundle, so every element
 * upgrades before React hydrates and has to go on looking for its props: the
 * order of a Next.js App Router page. `late` hydrates first and loads them a
 * task later, so each element finds its props as it upgrades.
 */
globalThis.calls = { helix: 0, probe: 0 }

/** What React alone hands an element: the array it assigns, kept to be read. */
customElements.define(
  'probe-element',
  class extends HTMLElement {
    points = undefined
  },
)

const define = () =>
  Promise.all([
    import('@fusion.dev/helix/button'),
    import('@fusion.dev/helix/kbd'),
    import('@fusion.dev/helix/listbox'),
    import('@fusion.dev/helix/map/route'),
    import('@fusion.dev/helix/notifications'),
    import('@fusion.dev/helix/option'),
    import('@fusion.dev/helix/splitter'),
  ])

const late = new URLSearchParams(location.search).get('order') === 'late'
if (!late) {
  await define()
}
hydrateRoot(document.getElementById('root'), <App />)
if (late) {
  await new Promise((done) => setTimeout(done))
  await define()
}
globalThis.defined = true
