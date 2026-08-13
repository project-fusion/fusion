import '@helix-io/web/card'

/**
 * Uses the custom elements directly.
 *
 * Elements written as JSX keep declarative shadow DOM in server *and* client
 * components alike. What loses it is the React wrapper, which builds elements
 * through `createElement` rather than JSX, a path Lit SSR does not intercept.
 * Measured here: 121 B of route JavaScript with DSD, against 10.1 kB without.
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
