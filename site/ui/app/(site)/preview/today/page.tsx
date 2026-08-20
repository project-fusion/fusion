import { SERVICES } from '../../../services'
import '../../../preview.css'

export const metadata = { title: 'Candidate: today' }

/**
 * A's type language, B's source rail, and a redesigned middle.
 *
 * **The hero is the offer and the constraint is the proof.** The two earlier
 * drafts both opened on the thesis, which is founder language: "no product may
 * create a dependency its user cannot exit" has Fusion as its subject and a
 * prohibition as its verb, and a reader is overhearing someone else's
 * governance rule. It is also a reassurance, and a reassurance answers a
 * question a first time reader has not asked yet. Their order is what is this,
 * is it real, what does it cost, and only then what am I risking. So the
 * constraint keeps its place on the page and loses the top of it, restated as
 * the question a buyer actually holds.
 *
 * **The middle answers "what do I get today".** The derivation ramp it replaces
 * argued in two dimensions at once: a colour gradient says these are shades of
 * one value, and the labels on it said these are consequences of one principle,
 * so it read as a palette with product names on it. What a reader wants there
 * is not a metaphor, it is the list, with the stage against each row and
 * nothing softened.
 */

/** What exists, what it costs, and what does not exist yet. */
const STACK = [
  {
    action: { href: '/helix', label: 'Open Helix' },
    body: 'Seventy eight component families with their API, a live example each, and a sandbox. Web components, so whatever framework you are on stays your choice.',
    name: 'Helix',
    rail: ['helix/web', '78 families', 'One open tier', 'Stage: Building'],
    state: 'Use it today',
  },
  {
    action: { href: '/services', label: 'See the offers' },
    body: `An audit at ${SERVICES[0]?.price}, a design system sprint at ${SERVICES[1]?.price}, and a build from sixty thousand. Prices are on the page. Most engagements start with the audit.`,
    name: 'The work',
    rail: ['the internal plan', 'Three offers', 'Prices stated', 'Available now'],
    state: 'Hire us today',
  },
  {
    action: { href: '/cortex', label: 'Read the shape' },
    body: 'Memory and provenance for systems that have to explain themselves. The crates exist and the design is written down. Nothing has shipped, and we are not going to say otherwise.',
    name: 'Cortex',
    rail: ['cortex/engram', 'cortex/trace', 'Not shipped', 'Stage: Building'],
    state: 'Not yet',
  },
  {
    action: { href: '/energy', label: 'See the map' },
    body: 'Committed direction with no work started. They are on the site because a roadmap that shows only the parts going well is a brochure.',
    name: 'Energy and Capital',
    rail: ['docs/00-thesis.md', 'No code', 'Stage: Declared'],
    state: 'Declared only',
  },
]

export default function Page() {
  return (
    <>
      <section className="dvHero">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-text appearance="label" class="pvRail" tone="subtle">
            FUSION DEVELOPMENT GROUP / EST 2026 / SOLO
          </helix-text>

          <helix-text as="h1" class="dvTitle">
            Everything we build,
            <br />
            <em>you</em> keep.
          </helix-text>

          <helix-flex align="start" gap="xl" wrap>
            <helix-text as="p" class="pvClaimText" tone="muted">
              Interface and intelligence work, delivered into your repository under your license. We
              build on two substrates of our own so the work goes faster, and you are never holding
              a system that only we can run.
            </helix-text>
            <helix-flex class="pvRail" direction="column" gap="2xs">
              <helix-text class="pvRailKey">available now</helix-text>
              <helix-text>Helix ......... open</helix-text>
              <helix-text>Services ...... priced</helix-text>
              <helix-text>Cortex ........ building</helix-text>
            </helix-flex>
          </helix-flex>

          <helix-flex data-density="lg" gap="sm" wrap>
            <a data-button="solid" data-button-tone="primary" href="/services">
              See what it costs
            </a>
            <a data-button href="/helix">
              Open Helix
            </a>
          </helix-flex>
        </helix-flex>
      </section>

      <section className="band">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-flex direction="column" gap="sm">
            <helix-text appearance="label" class="dvMono" tone="subtle">
              The state of it
            </helix-text>
            <helix-text as="h2" class="sectionTitle measure">
              What is real, and what is not
            </helix-text>
          </helix-flex>

          <helix-flex direction="column" gap="none">
            {STACK.map((row) => (
              <helix-flex align="start" class="tdRow" gap="xl" key={row.name} wrap>
                <helix-flex class="pvClaimText" direction="column" gap="sm">
                  <helix-text appearance="label" tone="subtle">
                    {row.state}
                  </helix-text>
                  <helix-text as="h3" class="tdName">
                    {row.name}
                  </helix-text>
                  <helix-text as="p" tone="muted">
                    {row.body}
                  </helix-text>
                  <a data-link href={row.action.href}>
                    {row.action.label}
                  </a>
                </helix-flex>

                <helix-flex class="pvRail" direction="column" gap="2xs">
                  <helix-text class="pvRailKey">source</helix-text>
                  {row.rail.map((line) => (
                    <helix-text key={line}>{line}</helix-text>
                  ))}
                </helix-flex>
              </helix-flex>
            ))}
          </helix-flex>
        </helix-flex>
      </section>

      {/* The constraint, demoted to proof and restated as the reader's own
          question. The law is still on the page, under the question, because it
          is the honest artifact and it is what the answer is derived from. */}
      <section className="band">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-flex align="start" gap="xl" wrap>
            <helix-flex class="pvClaimText" direction="column" gap="lg">
              <helix-text as="h2" class="tdAsk">
                What happens to you if Fusion shuts down tomorrow?
              </helix-text>
              <helix-text as="p" tone="muted">
                Nothing you depend on stops working. The code is in your repository under your
                license, the keys are yours, and it runs on hardware you chose. We may operate a
                control plane, never a chokepoint. If an engagement would leave you unable to
                continue without us on retainer, it is not one we will take.
              </helix-text>
              <helix-text appearance="body-strong" as="p">
                No Fusion product may create a dependency its user cannot exit.
              </helix-text>
            </helix-flex>

            <helix-flex class="pvRail" direction="column" gap="2xs">
              <helix-text class="pvRailKey">source</helix-text>
              <helix-text>CLAUDE.md</helix-text>
              <helix-text>The Sovereignty Constraint</helix-text>
              <helix-text>Stated as law</helix-text>
              <helix-text>Tested per proposal</helix-text>
            </helix-flex>
          </helix-flex>
        </helix-flex>
      </section>
    </>
  )
}
