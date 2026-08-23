/**
 * Direction B. Every claim carries where it came from.
 *
 * Cortex's argument is that an output you cannot trace is one you cannot trust,
 * and `why()` is the method. This is that method applied to the one surface
 * that never does it. **The rail is not a motif.** Every reference is a real
 * file in this repository, and a reader who wants to check one can.
 *
 * It is the Sovereignty Constraint turned on the marketing page: a company
 * whose whole differentiator is that you can verify it should be verifiable
 * here first. A brochure asks to be believed; this asks to be checked.
 *
 * Composed from Helix: every row is a `Flex`, the closing block is a `Card`,
 * the rules are `Divider`s and every word is a `Text`.
 */
import '../../../preview.css'

export const metadata = { title: 'Direction B: Provenance' }

/** Each claim, and the file it is derived from. */
const CLAIMS = [
  {
    body: 'The two things that forced a person to depend on an institution were the cost of thinking at scale and the cost of power. Both are falling, and the same argument runs all the way up: a household, a company and a country each become sovereign through the same stack at a different scale.',
    source: ['docs/00-thesis.md', 'The sovereignty ladder', 'Written 12 Aug 2026'],
    statement: 'Abundance is the mechanism, sovereignty is the goal.',
  },
  {
    body: 'You hold your own keys, data and hardware. We may operate a control plane, never a chokepoint. Every proposal gets one question: what happens to you if Fusion shuts down tomorrow? If the answer is that you lose the thing, we do not build it.',
    source: ['CLAUDE.md', 'Stated as law, not as a value', 'Tested per proposal'],
    statement: 'No product may create a dependency you cannot exit.',
  },
  {
    body: 'Helix is the design system and Cortex is memory and provenance. Neither is a product you buy. Building the substrate first is slower and it is the only order that produces the thing we said we would produce.',
    source: ['docs/02-substrate.md', 'Two cores, then products', 'Both Building'],
    statement: 'Two substrates, and neither is for sale.',
  },
  {
    body: 'Active ships with users. Building is real work with nothing shipped. Declared is committed direction with no work started. Two of our four verticals are Declared, and they are on the site anyway, because a roadmap that shows only the parts going well is a brochure.',
    source: ['the internal plan', 'Stage labels are honest', 'Never softened'],
    statement: 'We publish what is not built yet.',
  },
  {
    body: 'The audit is two weeks at a fixed price. The sprint is four weeks at two days a week. The build starts at sixty thousand. Those numbers are on the page because an offer whose cost appears only after a call cannot be compared.',
    source: ['the internal plan', 'the internal plan', 'Reconciled 20 Aug 2026'],
    statement: 'Every price is stated, including the ones we are still testing.',
  },
]

export default function Page() {
  return (
    <>
      <section className="pvHero">
        <helix-flex data-shell direction="column" gap="xl">
          <helix-text class="pvRail" tone="subtle" variant="label">
            FUSION DEVELOPMENT GROUP
          </helix-text>

          <helix-text as="h1" class="pvTitle">
            Sovereignty at every scale.
          </helix-text>

          <helix-flex align="start" gap="xl" wrap>
            <helix-text as="p" class="pvClaimText" tone="muted">
              Everything below is a claim, and everything below says where it came from. If a line
              on this page cannot be traced to a file in the repository, it should not be on the
              page.
            </helix-text>
            <helix-flex class="pvRail" direction="column" gap="2xs">
              <helix-text class="pvRailKey">how to read this</helix-text>
              <helix-text>claim ......... left</helix-text>
              <helix-text>source ........ right</helix-text>
            </helix-flex>
          </helix-flex>
        </helix-flex>
      </section>

      <section data-band>
        <helix-flex data-shell direction="column" gap="none">
          {CLAIMS.map((claim) => (
            <helix-flex align="start" class="pvRule" gap="xl" key={claim.statement} wrap>
              <helix-flex class="pvClaimText" direction="column" gap="md">
                <helix-text as="h2" class="pvStatement">
                  {claim.statement}
                </helix-text>
                <helix-text as="p" tone="muted">
                  {claim.body}
                </helix-text>
              </helix-flex>

              {/* The margin, where a critical edition puts its apparatus. */}
              <helix-flex class="pvRail" direction="column" gap="2xs">
                <helix-text class="pvRailKey">source</helix-text>
                {claim.source.map((line) => (
                  <helix-text key={line}>{line}</helix-text>
                ))}
              </helix-flex>
            </helix-flex>
          ))}
        </helix-flex>
      </section>

      <section data-band>
        <helix-flex data-shell direction="column" gap="lg">
          <helix-card separation="outlined">
            <helix-flex align="center" gap="md" justify="between" wrap>
              <helix-flex direction="column" gap="2xs">
                <helix-text variant="title">Check any of it.</helix-text>
                <helix-text tone="muted">
                  The repository is the source, and the strategy documents are tracked in it.
                </helix-text>
              </helix-flex>
              <helix-flex data-density="lg" gap="sm" wrap>
                <a data-button="solid" data-button-tone="primary" href="/services">
                  What is buyable
                </a>
                <a data-button href="/insights">
                  Read the arguments
                </a>
              </helix-flex>
            </helix-flex>
          </helix-card>
        </helix-flex>
      </section>
    </>
  )
}
