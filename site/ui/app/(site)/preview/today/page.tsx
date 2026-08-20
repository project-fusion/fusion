import { SERVICES } from '../../../services'
import { stageAppearance } from '../../../verticals'
import '../../../preview.css'

export const metadata = { title: 'Candidate: today' }

/**
 * A's type language, no rail, and a page that leads with what exists.
 *
 * **The hero claims the asset rather than the principle.** "Everything we build,
 * you keep" was the constraint worn as a promise, and it over-claims twice: for
 * an open package it is what open source already is, and for contract work it is
 * what a normal statement of work says. What is actually unusual is that the
 * substrate is already built, which is why four weeks buys what it buys.
 *
 * **The exit test is not on this page as a general claim.** It is nearly empty
 * for the only thing shipping: a published package under a permissive license
 * needs no promise, because a reader can simply keep the last version. Making a
 * feature of that reads as taking credit for the ordinary. Where it is not empty
 * is the engagement, and that is where it is stated.
 *
 * Stages come from `verticals.ts` and prices from `services.ts`, so this page
 * cannot drift from either the way the services copy did once already.
 */

/** What exists, what it costs, and what does not exist yet. */
const STACK = [
  {
    action: { href: '/helix', label: 'Open Helix' },
    body: 'Seventy eight component families, each with its API, a live example and a sandbox. Web components, so whatever framework you are on stays your choice, and one open tier, so there is no part of it you have to buy.',
    lede: 'Use it',
    name: 'Helix',
    stage: 'Building' as const,
  },
  {
    action: { href: '/services', label: 'See the offers' },
    body: `An audit at ${SERVICES[0]?.price} to find out what is worth building, a design system sprint at ${SERVICES[1]?.price}, and a build from sixty thousand. Every price is on the page and most engagements start with the audit.`,
    lede: 'Buy it',
    name: 'The work',
    stage: 'Active' as const,
  },
  {
    action: { href: '/cortex', label: 'Read the shape' },
    body: 'Memory and provenance for systems that have to explain themselves: what a system knows, where it learned it, and how far to trust it. The crates exist and the design is written down. Nothing has shipped.',
    lede: 'Not yet',
    name: 'Cortex',
    stage: 'Building' as const,
  },
  {
    action: { href: '/energy', label: 'See the map' },
    body: 'Committed direction with no work started. They are on the site because a roadmap that shows only the parts going well is a brochure.',
    lede: 'On the map',
    name: 'Energy and Capital',
    stage: 'Declared' as const,
  },
]

export default function Page() {
  return (
    <>
      <section className="dvHero">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-text appearance="label" class="dvMono" tone="subtle">
            Fusion Development Group
          </helix-text>

          <helix-text as="h1" class="dvTitle">
            The hard part is
            <br />
            <em>already</em> built.
          </helix-text>

          <helix-text as="p" class="measure" tone="muted">
            Seventy eight component families, a token layer that derives its own accessible palette
            from one brand color, and the tooling that keeps both honest. We point it at your
            product instead of starting over, which is what four weeks buys.
          </helix-text>

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
                <helix-flex align="start" class="tdLede" direction="column" gap="2xs">
                  <helix-text appearance="label" tone="subtle">
                    {row.lede}
                  </helix-text>
                  {/* The stage, which is the site's own device and says more
                      than a citation would: `Active` ships with users,
                      `Building` is real work with nothing shipped, `Declared`
                      is direction with no work started. */}
                  <helix-tag tone={stageAppearance(row.stage)}>{row.stage}</helix-tag>
                </helix-flex>

                <helix-flex class="tdBody" direction="column" gap="sm">
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
              </helix-flex>
            ))}
          </helix-flex>
        </helix-flex>
      </section>

      {/* Where the exit test is not trivial.
          
          Not Helix: a published package under a permissive license is already
          yours and needs nothing said about it. The engagement is the part a
          buyer is actually exposed on, so that is the part this answers. */}
      <section className="band">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-text as="h2" class="tdAsk measure">
            We are not trying to become part of your stack.
          </helix-text>
          <helix-flex class="measure" direction="column" gap="md">
            <helix-text as="p" tone="muted">
              Handover is a condition of the work rather than a phase at the end of it. The
              architecture decisions are written down with their trade-offs, not just made. If an
              engagement would leave you unable to continue without us on a retainer, it is not one
              we will take.
            </helix-text>
            <helix-text as="p" tone="muted">
              That is a rule we hold ourselves to and it is worth being plain about which parts of
              it are hard. Keeping a design system you already have is not hard. Keeping a system
              that remembers things for you, when the memory lives somewhere else, is. That is the
              part Cortex exists to answer, and it is the part we have not shipped yet.
            </helix-text>
          </helix-flex>
        </helix-flex>
      </section>
    </>
  )
}
