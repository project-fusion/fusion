import '@helix-io/web/card'

/**
 * Uses the custom elements directly rather than the React wrappers.
 *
 * The wrappers are client components, and a client boundary loses declarative
 * shadow DOM: the shadow root is not server-rendered, so the component arrives
 * unstyled until the bundle upgrades it. Measured on this page, the wrapper
 * cost 10.1 kB of route JavaScript against 121 B, and gave up DSD and
 * server-rendered ARIA to do it.
 *
 * Reach for `@helix-io/react` inside client components, where a boundary
 * already exists and typed event callbacks and refs are worth having.
 */
export default function Home() {
  return (
    <main>
      <h1>Fusion Development Group</h1>
      <helix-card appearance="outlined">
        <helix-card-header>
          <helix-card-title>Developing for humanity</helix-card-title>
        </helix-card-header>
        <helix-card-body>
          Intelligence and energy are collapsing in cost at the same moment. Fusion builds the stack
          that makes sovereignty practical.
        </helix-card-body>
      </helix-card>
    </main>
  )
}
