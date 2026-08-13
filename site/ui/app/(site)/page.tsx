import { stageAppearance, VERTICALS } from '../verticals'

/**
 * The Fusion landing page.
 *
 * Copy comes from the strategy docs rather than being written fresh, so the
 * site and the plan cannot drift: the thesis is `docs/00-thesis.md` and the
 * constraint is the one in `CLAUDE.md`.
 *
 * A server component with no client boundary of its own. Elements upgrade from
 * the single registration in the root layout.
 */

const questions = [
  {
    answer:
      'Nothing you depend on stops working. You hold your own keys, your own data, and your own hardware. We may operate a control plane, never a chokepoint. If a product cannot pass that test, it is not one of ours.',
    question: 'What happens if Fusion shuts down tomorrow?',
  },
  {
    answer:
      'Rust for the backend and the substrate cores, TypeScript for everything on the front. Interfaces ship as web components, so the framework above them is a choice rather than a commitment.',
    question: 'What is the stack?',
  },
  {
    answer:
      'Two, and neither is a product. Helix is the design system and Cortex is the memory and provenance layer. Everything else is built on top of them.',
    question: 'How many substrates are there?',
  },
  {
    answer:
      'Cheap intelligence and cheap energy are arriving at the same time. That pairing is what moves sovereignty from a principle you agree with to a thing you can run. Personal first, then organizational, then national.',
    question: 'Why now?',
  },
]

export default function Home() {
  return (
    <>
      <section className="hero">
        <helix-flex class="shell" direction="column" gap="lg">
          <helix-text appearance="code" tone="subtle">
            Fusion Development Group
          </helix-text>
          <helix-text as="h1" class="heroTitle">
            Developing for humanity
          </helix-text>
          <helix-text as="p" class="heroLede" tone="muted">
            Intelligence and energy are collapsing in cost at the same moment. We build the stack
            that makes sovereignty practical, starting with the two substrates everything else
            needs.
          </helix-text>
          <helix-flex gap="sm" wrap>
            <helix-button appearance="primary" href="mailto:hello@fusion.dev" size="lg">
              Start a conversation
            </helix-button>
            <helix-button href="/design" size="lg">
              See what is shipping
            </helix-button>
          </helix-flex>
        </helix-flex>
      </section>

      <section className="band">
        <helix-flex class="shell" direction="column">
          <helix-callout severity="info">
            <helix-flex direction="column" gap="2xs">
              <helix-text appearance="body-strong">The Sovereignty Constraint</helix-text>
              <helix-text tone="muted">
                No Fusion product may create a dependency its user cannot exit. The user holds their
                own keys, data, and hardware. Fusion may operate a control plane, never a
                chokepoint.
              </helix-text>
            </helix-flex>
          </helix-callout>
        </helix-flex>
      </section>

      <section className="band">
        <helix-flex class="shell" direction="column" gap="lg">
          <helix-flex direction="column" gap="2xs">
            <helix-text as="h2">Verticals</helix-text>
            <helix-text as="p" tone="muted">
              Stage labels are honest. Building means real work with nothing shipped.
            </helix-text>
          </helix-flex>

          <helix-grid gap="md" min="17rem">
            {VERTICALS.map((vertical) => (
              <helix-card appearance="outlined" aria-label={vertical.name} key={vertical.href}>
                <helix-flex align="center" gap="sm" justify="between" slot="header">
                  <helix-text as="h3" appearance="title">
                    {vertical.name}
                  </helix-text>
                  <helix-tag appearance={stageAppearance(vertical.stage)} size="sm">
                    {vertical.stage}
                  </helix-tag>
                </helix-flex>
                <helix-text appearance="caption" tone="muted">
                  {vertical.summary}
                </helix-text>
                <helix-button appearance="subtle" href={vertical.href} size="sm" slot="footer">
                  Open
                </helix-button>
              </helix-card>
            ))}
          </helix-grid>
        </helix-flex>
      </section>

      <section className="band">
        <helix-flex class="shell" direction="column" gap="lg">
          <helix-text as="h2">Questions</helix-text>
          <helix-accordion>
            {questions.map((entry) => (
              <helix-accordion-item key={entry.question}>
                <helix-text appearance="body-strong" slot="summary">
                  {entry.question}
                </helix-text>
                <helix-text tone="muted">{entry.answer}</helix-text>
              </helix-accordion-item>
            ))}
          </helix-accordion>
        </helix-flex>
      </section>

      <section className="band closing">
        <helix-flex align="center" class="shell" direction="column" gap="md">
          <helix-text as="h2" appearance="heading">
            Solo, and shipping
          </helix-text>
          <helix-text as="p" class="closingLede" tone="muted">
            We take on interface and intelligence work the substrates make faster to do well. If
            that is what you need, say so plainly and we will tell you whether we are the right
            people.
          </helix-text>
          <helix-button appearance="primary" href="mailto:hello@fusion.dev" size="lg">
            hello@fusion.dev
          </helix-button>
        </helix-flex>
      </section>
    </>
  )
}
