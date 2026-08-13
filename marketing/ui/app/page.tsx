/**
 * A server component that renders custom elements directly.
 *
 * No `'use client'` and no element imports here: the definitions are registered
 * once by `HelixElements` in the layout, and an unregistered tag is simply an
 * unknown element in the server's HTML that upgrades when the definition lands.
 * So the markup, including every link and heading, is in the response for a
 * crawler regardless of whether the bundle ever runs.
 */

const verticals = [
  {
    href: '/design',
    name: 'Fusion Design',
    summary: 'Helix, the design system and the theming engine behind it.',
  },
  {
    href: '/mind',
    name: 'Fusion Mind',
    summary: 'Cortex, a provenance graph for what a system knows and why.',
  },
  {
    href: '/energy',
    name: 'Fusion Energy',
    summary: 'The literal sun, and what falls out of intelligence meeting it.',
  },
]

export default function Home() {
  return (
    <>
      <helix-app-header>
        <span slot="brand">Fusion</span>
        <a href="/work">Work</a>
        <a href="/writing">Writing</a>
        <helix-button slot="actions" appearance="primary" size="sm" href="/contact">
          Get in touch
        </helix-button>
      </helix-app-header>

      <main className="shell">
        <section className="hero">
          <h1>Developing for humanity</h1>
          <p>
            Intelligence and energy are collapsing in cost at the same moment. Fusion builds the
            stack that makes sovereignty practical.
          </p>
          <div className="actions">
            <helix-button appearance="primary" size="lg" href="/contact">
              Start a conversation
              <helix-icon slot="end" name="chevron-down"></helix-icon>
            </helix-button>
            <helix-button size="lg" href="/thesis">
              Read the thesis
            </helix-button>
          </div>
        </section>

        <helix-divider></helix-divider>

        <section className="section" aria-labelledby="verticals">
          <h2 id="verticals">Substrates</h2>
          <div className="grid">
            {verticals.map((vertical) => (
              <helix-card key={vertical.name} appearance="outlined" aria-labelledby={vertical.href}>
                <h3 id={vertical.href} slot="header">
                  {vertical.name}
                </h3>
                {vertical.summary}
                <helix-button slot="footer" appearance="subtle" size="sm" href={vertical.href}>
                  Learn more
                </helix-button>
              </helix-card>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
