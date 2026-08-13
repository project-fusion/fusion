/**
 * A server component that renders custom elements directly.
 *
 * No `'use client'` and no element imports here: the definitions are registered
 * once by `HelixElements` in the layout, and an unregistered tag is simply an
 * unknown element in the server's HTML that upgrades when the definition lands.
 * So the markup, including every link and heading, is in the response for a
 * crawler regardless of whether the bundle ever runs.
 */

/**
 * Stage labels are honest, so they are data rather than decoration.
 *
 * Active ships with users. Building is real work with nothing shipped. Declared
 * is committed direction with no work started. The tag's appearance follows the
 * stage; it never softens it.
 */
const verticals = [
  {
    appearance: 'success',
    href: '/design',
    name: 'Fusion Design',
    stage: 'Building',
    summary: 'Helix, the design system and the theming engine behind it.',
  },
  {
    appearance: 'warning',
    href: '/mind',
    name: 'Fusion Mind',
    stage: 'Building',
    summary: 'Cortex, a provenance graph for what a system knows and why.',
  },
  {
    appearance: 'neutral',
    href: '/energy',
    name: 'Fusion Energy',
    stage: 'Declared',
    summary: 'The literal sun, and what falls out of intelligence meeting it.',
  },
] as const

const questions = [
  {
    answer:
      'Nothing you depend on stops working. You hold your own keys, data, and hardware. We may operate a control plane, never a chokepoint.',
    question: 'What happens if Fusion shuts down tomorrow?',
  },
  {
    answer:
      'Rust for backend and substrate cores, TypeScript for everything on the front. Web components, so the framework stays swappable.',
    question: 'What is the stack?',
  },
  {
    answer:
      'Two: Helix, the design system, and Cortex, the memory and provenance layer. Products are built on top of them, never instead of them.',
    question: 'How many substrates are there?',
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

        <helix-callout severity="info">
          Stage labels on this page are honest. Building means real work with nothing shipped yet.
        </helix-callout>

        <helix-divider></helix-divider>

        <section className="section" aria-labelledby="verticals">
          <h2 id="verticals">Substrates</h2>
          <div className="grid">
            {verticals.map((vertical) => (
              <helix-card key={vertical.name} appearance="outlined" aria-labelledby={vertical.href}>
                <div className="cardTitle" slot="header">
                  <h3 id={vertical.href}>{vertical.name}</h3>
                  <helix-tag appearance={vertical.appearance} size="sm">
                    {vertical.stage}
                  </helix-tag>
                </div>
                {vertical.summary}
                <helix-button slot="footer" appearance="subtle" size="sm" href={vertical.href}>
                  Learn more
                </helix-button>
              </helix-card>
            ))}
          </div>
        </section>

        <section className="section" aria-labelledby="questions">
          <h2 id="questions">Questions</h2>
          <helix-accordion>
            {questions.map((entry) => (
              <helix-accordion-item key={entry.question}>
                <span slot="summary">{entry.question}</span>
                {entry.answer}
              </helix-accordion-item>
            ))}
          </helix-accordion>
        </section>
      </main>
    </>
  )
}
