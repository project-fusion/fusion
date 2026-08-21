import { SERVICES } from '../../../services'
import { stageAppearance } from '../../../verticals'
import '../../../preview.css'
import '../../../today.css'

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

/** The pairing, which is the whole reason any of this is possible now. */
const MECHANISM = [
  {
    body: 'What used to need an institution now runs on hardware a person can own. The cost of thinking at scale fell far enough that the question stopped being whether you can afford it and became where you want it to run.',
    name: 'Intelligence got cheap',
  },
  {
    body: "The other half, and the one people forget. A model you own is still someone else's dependency if you cannot power the machine it runs on. Both curves broke at once, and that is the part that is new.",
    name: 'Energy got cheap',
  },
]

/** The same stack at three scales, which is the argument the company is making. */
const LADDER = [
  {
    body: 'Your own keys, your own data, your own hardware. Nothing about your working life is recoverable by a company that changes its pricing.',
    name: 'Personal',
    rung: 'One person',
  },
  {
    body: 'The same properties with more people and an audit trail. A company that cannot be held hostage by a vendor roadmap, because it runs the substrate and holds the data.',
    name: 'Organizational',
    rung: 'One company',
  },
  {
    body: 'The same properties again, with the stakes that follow from a country running its capability on infrastructure it does not control. A written thesis, not a product, and we say so.',
    name: 'National',
    rung: 'One country',
  },
]

export default function Page() {
  return (
    <>
      <section className="specHero">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-text appearance="label" class="specHeroLabel">
            Fusion Development Group
          </helix-text>

          {/* One claim, two readings, which is how the page stops choosing
              between its readers. An engineer hears that the thing is open and
              theirs to use; a buyer hears that we built what we are about to
              point at their product. Both are the same sentence. */}
          <helix-text as="h1" class="specHeroTitle">
            The tools are <em>open</em>. The work is what we sell.
          </helix-text>

          <helix-text as="p" class="specLede">
            Helix is seventy eight component families under one open tier, with no part of it held
            back for a paid plan. What we charge for is applying it to your product, which goes
            faster because we are the people who built it.
          </helix-text>

          {/* The fork made structural. It used to be two buttons a reader had
              to interpret; each door now says who it is for before it says
              where it goes. */}
          <div className="specDoors">
            <a className="specDoor" href="/helix">
              <helix-text class="specDoorFor">If you build interfaces</helix-text>
              <helix-text appearance="title">Open Helix</helix-text>
              <helix-text appearance="caption" tone="muted">
                Seventy eight families with their API and a live example each. Web components, so
                whatever framework you are on stays your choice.
              </helix-text>
            </a>
            <a className="specDoor" href="/services">
              <helix-text class="specDoorFor">If you need the work done</helix-text>
              <helix-text appearance="title">See what it costs</helix-text>
              <helix-text appearance="caption" tone="muted">
                An audit at $12,000, a design system sprint at $32,000, a build from sixty thousand.
                Every price is on the page.
              </helix-text>
            </a>
          </div>
        </helix-flex>
      </section>

      <section className="shell">
        <div className="spec">
          <helix-text class="specLabel">The state of it</helix-text>
          <helix-flex direction="column" gap="xl">
            <helix-text as="h2" class="specTitle">
              What is real, and what is not
            </helix-text>
            <helix-flex direction="column" gap="none">
              {STACK.map((row) => (
                <helix-flex align="start" class="tdRow" gap="xl" key={row.name} wrap>
                  <helix-flex align="start" class="tdLede" direction="column" gap="2xs">
                    <helix-text appearance="label" tone="subtle">
                      {row.lede}
                    </helix-text>
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
        </div>
      </section>

      <section className="shell">
        <div className="spec">
          <helix-text class="specLabel">Why now</helix-text>
          <helix-flex direction="column" gap="xl">
            <helix-text as="h2" class="specTitle">
              Two costs fell at the same time
            </helix-text>
            <helix-grid gap="2xl" min="19rem">
              {MECHANISM.map((item) => (
                <helix-flex direction="column" gap="sm" key={item.name}>
                  <helix-text appearance="title" as="h3">
                    {item.name}
                  </helix-text>
                  <helix-text as="p" tone="muted">
                    {item.body}
                  </helix-text>
                </helix-flex>
              ))}
            </helix-grid>
            <helix-text as="p" class="measure" tone="muted">
              The two things that forced a person to depend on an institution were the cost of
              thinking at scale and the cost of power. Both are falling, which is what turns
              sovereignty from a principle you agree with into a stack you can run.
            </helix-text>
          </helix-flex>
        </div>
      </section>

      <section className="shell">
        <div className="spec">
          <helix-text class="specLabel">The ladder</helix-text>
          <helix-flex direction="column" gap="xl">
            <helix-text as="h2" class="specTitle">
              The same stack, three times over
            </helix-text>
            <helix-flex direction="column" gap="none">
              {LADDER.map((rung) => (
                <helix-flex align="start" class="tdRow" gap="xl" key={rung.name} wrap>
                  <helix-flex align="start" class="tdLede" direction="column" gap="2xs">
                    <helix-text appearance="label" tone="subtle">
                      {rung.rung}
                    </helix-text>
                  </helix-flex>
                  <helix-flex class="tdBody" direction="column" gap="sm">
                    <helix-text as="h3" class="tdName">
                      {rung.name}
                    </helix-text>
                    <helix-text as="p" tone="muted">
                      {rung.body}
                    </helix-text>
                  </helix-flex>
                </helix-flex>
              ))}
            </helix-flex>
          </helix-flex>
        </div>
      </section>

      <section className="shell">
        <div className="spec">
          <helix-text class="specLabel">What you are risking</helix-text>
          <helix-flex direction="column" gap="xl">
            <helix-text as="h2" class="specTitle">
              We are not trying to become part of your stack
            </helix-text>
            <helix-flex class="measure" direction="column" gap="md">
              <helix-text as="p" tone="muted">
                Handover is a condition of the work rather than a phase at the end of it. The
                architecture decisions are written down with their trade-offs, not just made. If an
                engagement would leave you unable to continue without us on a retainer, it is not
                one we will take.
              </helix-text>
              <helix-text as="p" tone="muted">
                That is a rule we hold ourselves to and it is worth being plain about which parts of
                it are hard. Keeping a design system you already have is not hard. Keeping a system
                that remembers things for you, when the memory lives somewhere else, is. That is the
                part Cortex exists to answer, and it is the part we have not shipped yet.
              </helix-text>
            </helix-flex>
          </helix-flex>
        </div>
      </section>

      <section className="band closing">
        <helix-flex align="center" class="shell" direction="column" gap="lg">
          <helix-text as="h2" class="tdAsk">
            Start with the audit.
          </helix-text>
          <helix-text as="p" class="measure" tone="muted">
            Two weeks at a fixed price, and the honest answer at the end of it may be that you do
            not need the larger engagement. Say plainly what you are trying to do and we will tell
            you whether we are the right people for it.
          </helix-text>
          <helix-flex data-density="lg" gap="sm" wrap>
            <a data-button="solid" data-button-tone="primary" href="/services">
              See what it costs
            </a>
            <a data-button href="mailto:hello@fusion.dev">
              hello@fusion.dev
            </a>
          </helix-flex>
        </helix-flex>
      </section>
    </>
  )
}
