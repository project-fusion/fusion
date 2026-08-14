import Link from 'next/link'
import { stageAppearance, VERTICALS } from '../verticals'

/**
 * The Fusion landing page.
 *
 * Copy comes from the strategy docs rather than being written fresh, so the
 * site and the plan cannot drift: the thesis is `docs/00-thesis.md` and the
 * constraint is the one in `CLAUDE.md`.
 *
 * One idea per band, each given a screen's worth of room. The page is a
 * sequence of single statements rather than a wall of sections, so what carries
 * the hierarchy is type and emptiness rather than rules and boxes.
 *
 * A server component with no client boundary of its own. Elements upgrade from
 * the single registration in the root layout.
 */

const substrates = [
  {
    body: 'The design system. Web components with a token layer that derives an accessible palette from one brand color, so an interface is consistent because there was nothing else to choose. Components ship as custom elements, which keeps the framework above them a choice rather than a commitment.',
    href: '/design',
    name: 'Helix',
    role: 'The DNA',
  },
  {
    body: 'Memory and provenance. What a system knows, where it learned it, and how much of it to trust. Not a model wrapper: the part that remains true when the model underneath is replaced.',
    href: '/mind',
    name: 'Cortex',
    role: 'The mind',
  },
]

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
          <helix-text appearance="label" tone="subtle">
            Fusion Development Group
          </helix-text>
          <helix-text as="h1" class="heroTitle">
            Sovereignty at every scale
          </helix-text>
          <helix-text as="p" class="heroLede measure" tone="muted">
            Cheap intelligence and cheap energy are collapsing in cost at the same moment. What was
            affordable only to an institution becomes affordable to a person. We build the stack
            that makes that practical.
          </helix-text>
          <helix-flex data-density="lg" gap="sm" wrap>
            <Link data-button="primary" href="/design">
              See what is shipping
            </Link>
            <a data-button href="mailto:hello@fusion.dev">
              Start a conversation
            </a>
          </helix-flex>
        </helix-flex>
      </section>

      <section className="band reveal">
        <helix-flex class="shell" direction="column" gap="lg">
          <helix-text appearance="label" tone="subtle">
            Why now
          </helix-text>
          <helix-text as="h2" class="sectionTitle measure">
            Abundance is the mechanism
          </helix-text>
          <helix-text as="p" class="measure" tone="muted">
            The two things that forced a person to depend on an institution were the cost of
            thinking at scale and the cost of power. Both are falling, and the same argument runs
            all the way up: a household, a company, and a country each become sovereign through the
            same stack at a different scale.
          </helix-text>
        </helix-flex>
      </section>

      <section className="band reveal">
        <helix-flex class="shell statement" direction="column" gap="lg">
          <helix-text appearance="label" tone="subtle">
            The Sovereignty Constraint
          </helix-text>
          <helix-text as="p" class="statementText">
            No Fusion product may create a dependency its user cannot exit.
          </helix-text>
          <helix-text as="p" tone="muted">
            The user holds their own keys, data, and hardware. Fusion may operate a control plane,
            never a chokepoint.
          </helix-text>
        </helix-flex>
      </section>

      <section className="band reveal">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-flex direction="column" gap="sm">
            <helix-text appearance="label" tone="subtle">
              Two substrates
            </helix-text>
            <helix-text as="h2" class="sectionTitle measure">
              Everything else is built on these
            </helix-text>
          </helix-flex>

          <helix-grid gap="xl" min="22rem">
            {substrates.map((substrate) => (
              <helix-flex class="substrate" direction="column" gap="sm" key={substrate.name}>
                <helix-text appearance="label" tone="subtle">
                  {substrate.role}
                </helix-text>
                <helix-text as="h3" class="substrateName">
                  {substrate.name}
                </helix-text>
                <helix-text as="p" tone="muted">
                  {substrate.body}
                </helix-text>
                <a data-link href={substrate.href}>
                  Read more
                </a>
              </helix-flex>
            ))}
          </helix-grid>
        </helix-flex>
      </section>

      <section className="band reveal">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-flex direction="column" gap="sm">
            <helix-text appearance="label" tone="subtle">
              Verticals
            </helix-text>
            <helix-text as="h2" class="sectionTitle measure">
              Stage labels are honest
            </helix-text>
            <helix-text as="p" class="measure" tone="muted">
              Active ships with users. Building is real work with nothing shipped. Declared is
              committed direction with no work started. A roadmap that shows only the parts going
              well is a brochure.
            </helix-text>
          </helix-flex>

          <helix-flex direction="column">
            {VERTICALS.map((vertical) => (
              <helix-flex
                align="center"
                class="verticalRow"
                gap="md"
                justify="between"
                key={vertical.href}
                wrap
              >
                <helix-flex direction="column" gap="2xs">
                  <helix-flex align="center" data-density="sm" gap="sm">
                    <helix-text as="h3" class="verticalName">
                      {vertical.name}
                    </helix-text>
                    <helix-tag appearance={stageAppearance(vertical.stage)}>
                      {vertical.stage}
                    </helix-tag>
                  </helix-flex>
                  <helix-text tone="muted">{vertical.summary}</helix-text>
                </helix-flex>
                <a data-link="quiet" href={vertical.href}>
                  Open
                </a>
              </helix-flex>
            ))}
          </helix-flex>
        </helix-flex>
      </section>

      <section className="band reveal">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-text as="h2" class="sectionTitle measure">
            Questions
          </helix-text>
          <helix-accordion>
            {questions.map((entry) => (
              <helix-accordion-item key={entry.question}>
                <helix-text appearance="body-strong" slot="summary">
                  {entry.question}
                </helix-text>
                <helix-text class="measure" tone="muted">
                  {entry.answer}
                </helix-text>
              </helix-accordion-item>
            ))}
          </helix-accordion>
        </helix-flex>
      </section>

      <section className="band closing reveal">
        <helix-flex align="center" class="shell" direction="column" gap="lg">
          <helix-text as="h2" class="sectionTitle">
            Solo, and shipping
          </helix-text>
          <helix-text as="p" class="measure" tone="muted">
            We take on interface and intelligence work the substrates make faster to do well. If
            that is what you need, say so plainly and we will tell you whether we are the right
            people.
          </helix-text>
          <a data-button="primary" data-density="lg" href="mailto:hello@fusion.dev">
            hello@fusion.dev
          </a>
        </helix-flex>
      </section>
    </>
  )
}
