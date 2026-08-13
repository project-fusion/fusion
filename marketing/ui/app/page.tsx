/**
 * The Fusion marketing page.
 *
 * Copy comes from the strategy docs rather than being written fresh, so the
 * site and the plan cannot drift: the thesis is `docs/00-thesis.md` and the
 * constraint is the one in `CLAUDE.md`. Stage labels are the honest ones.
 * Active ships with users, Building is real work with nothing shipped,
 * Declared is committed direction with no work started. None are softened here.
 *
 * A server component with no client boundary of its own. The elements upgrade
 * from the layout's single registration.
 */

/** The two cores. Products are built on top of them, never instead of them. */
const substrates = [
  {
    name: 'Helix',
    stage: 'Building',
    summary:
      'The DNA. A design system in web components with a token layer that derives an accessible palette from intent, so the framework underneath stays swappable.',
    vertical: 'Fusion Design',
  },
  {
    name: 'Cortex',
    stage: 'Building',
    summary:
      'The mind. Memory, provenance, and context: what a system knows, where it learned it, and how much of it to trust.',
    vertical: 'Fusion Mind',
  },
] as const

/** Design leads, because it is the one with something to show. */
const verticals = [
  {
    body: 'Interface. Helix lives here: a design system in web components, with a token layer that derives an accessible palette from a brand colour rather than from a spreadsheet of hexes.',
    id: 'design',
    name: 'Fusion Design',
    stage: 'Building',
  },
  {
    body: 'Intelligence. Cortex lives here: memory, provenance, and context. What a system knows, where it learned it, and how much of it to trust.',
    id: 'mind',
    name: 'Fusion Mind',
    stage: 'Building',
  },
  {
    body: 'The literal sun, and what it powers. Cheap energy is half of why sovereignty stops being a principle and starts being something you can run. No product yet.',
    id: 'energy',
    name: 'Fusion Energy',
    stage: 'Declared',
  },
  {
    body: 'Allocation. Committed direction with no work started, and it is listed here rather than left off so the map is the whole map.',
    id: 'capital',
    name: 'Fusion Capital',
    stage: 'Declared',
  },
] as const

const stageAppearance = (stage: string) =>
  stage === 'Active' ? 'success' : stage === 'Building' ? 'warning' : 'neutral'

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
          <helix-text mono size="xs" tone="subtle" weight="medium">
            Fusion Development Group
          </helix-text>
          <helix-text class="heroTitle" level={1}>
            Developing for humanity
          </helix-text>
          <helix-text block class="heroLede" size="lg" tone="muted">
            Intelligence and energy are collapsing in cost at the same moment. We build the stack
            that makes sovereignty practical, starting with the two substrates everything else
            needs.
          </helix-text>
          <helix-flex gap="sm" wrap>
            <helix-button appearance="primary" href="mailto:hello@fusion.dev" size="lg">
              Start a conversation
            </helix-button>
            <helix-button href="#substrates" size="lg">
              See the substrates
            </helix-button>
          </helix-flex>
        </helix-flex>
      </section>

      <section className="band">
        <helix-flex class="shell" direction="column">
          <helix-callout severity="info">
            <helix-flex direction="column" gap="2xs">
              <helix-text weight="semibold">The Sovereignty Constraint</helix-text>
              <helix-text tone="muted">
                No Fusion product may create a dependency its user cannot exit. The user holds their
                own keys, data, and hardware. Fusion may operate a control plane, never a
                chokepoint.
              </helix-text>
            </helix-flex>
          </helix-callout>
        </helix-flex>
      </section>

      <section className="band" id="substrates">
        <helix-flex class="shell" direction="column" gap="lg">
          <helix-flex direction="column" gap="2xs">
            <helix-text level={2}>Two substrates</helix-text>
            <helix-text block size="lg" tone="muted">
              Not products. The layers products are built on.
            </helix-text>
          </helix-flex>

          <helix-grid gap="md" min="20rem">
            {substrates.map((substrate) => (
              <helix-card appearance="outlined" aria-label={substrate.name} key={substrate.name}>
                <helix-flex align="center" gap="sm" justify="between" slot="header">
                  <helix-text level={3} size="lg">
                    {substrate.name}
                  </helix-text>
                  <helix-tag appearance={stageAppearance(substrate.stage)} size="sm">
                    {substrate.stage}
                  </helix-tag>
                </helix-flex>
                <helix-text tone="muted">{substrate.summary}</helix-text>
                <helix-text size="xs" slot="footer" tone="subtle">
                  {substrate.vertical}
                </helix-text>
              </helix-card>
            ))}
          </helix-grid>
        </helix-flex>
      </section>

      <section className="band" id="verticals">
        <helix-flex class="shell" direction="column" gap="lg">
          <helix-flex direction="column" gap="2xs">
            <helix-text level={2}>Verticals</helix-text>
            <helix-text block size="lg" tone="muted">
              Stage labels are honest. Building means real work with nothing shipped.
            </helix-text>
          </helix-flex>

          <helix-flex direction="column" gap="xl">
            {verticals.map((vertical) => (
              <helix-flex direction="column" gap="sm" id={vertical.id} key={vertical.id}>
                <helix-flex align="center" gap="sm" wrap>
                  <helix-text level={3} size="xl">
                    {vertical.name}
                  </helix-text>
                  <helix-tag appearance={stageAppearance(vertical.stage)} size="sm">
                    {vertical.stage}
                  </helix-tag>
                </helix-flex>
                <helix-text block class="verticalBody" tone="muted">
                  {vertical.body}
                </helix-text>
              </helix-flex>
            ))}
          </helix-flex>
        </helix-flex>
      </section>

      <section className="band" id="questions">
        <helix-flex class="shell" direction="column" gap="lg">
          <helix-text level={2}>Questions</helix-text>
          <helix-accordion>
            {questions.map((entry) => (
              <helix-accordion-item key={entry.question}>
                <helix-text slot="summary" weight="medium">
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
          <helix-text level={2} size="2xl">
            Solo, and shipping
          </helix-text>
          <helix-text block class="closingLede" size="lg" tone="muted">
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
