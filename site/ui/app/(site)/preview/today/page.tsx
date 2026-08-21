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
    body: 'Every component with its API, a live example, and a sandbox to try it in. One open tier, so there is no part of it you have to buy.',
    lede: 'Use it',
    name: 'Helix',
    stage: 'Building' as const,
  },
  {
    action: { href: '/services', label: 'See the offers' },
    body: `An audit at ${SERVICES[0]?.price} to find what is worth building, then a sprint or a build. Most engagements start with the audit.`,
    lede: 'Buy it',
    name: 'The work',
    stage: 'Active' as const,
  },
  {
    action: { href: '/cortex', label: 'Read the shape' },
    body: 'What a system knows, where it learned it, and how far to trust it. The design is written down. Nothing has shipped.',
    lede: 'Not yet',
    name: 'Cortex',
    stage: 'Building' as const,
  },
  {
    action: { href: '/energy', label: 'See the map' },
    body: 'Committed direction, no work started. On the site because a roadmap showing only the good parts is a brochure.',
    lede: 'On the map',
    name: 'Energy and Capital',
    stage: 'Declared' as const,
  },
]

/** The pairing, which is the whole reason any of this is possible now. */
const MECHANISM = [
  {
    body: 'What needed an institution now runs on hardware you can own. The question stopped being whether you can afford it and became where you want it to run.',
    name: 'Intelligence got cheap',
  },
  {
    body: 'The half people forget. A model you own is still a dependency if you cannot power the machine it runs on. Both curves broke at once.',
    name: 'Energy got cheap',
  },
]

/** The same stack at three scales, which is the argument the company is making. */
const LADDER = [
  { body: 'Your keys, your data, your hardware.', name: 'Personal', rung: 'One person' },
  { body: 'The same, with an audit trail.', name: 'Organizational', rung: 'One company' },
  { body: 'The same again, and only a thesis.', name: 'National', rung: 'One country' },
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
            Helix is open, and no part of it is held back for a paid plan. We sell the work of
            applying it.
          </helix-text>

          {/* The fork made structural. It used to be two buttons a reader had
              to interpret; each door now says who it is for before it says
              where it goes. */}
          <div className="specDoors">
            <a className="specDoor" href="/helix">
              <helix-text class="specDoorFor">If you build interfaces</helix-text>
              <helix-text appearance="title">Open Helix</helix-text>
              <helix-text appearance="caption" tone="muted">
                Components, tokens and a sandbox. Your framework stays your choice.
              </helix-text>
            </a>
            <a className="specDoor" href="/services">
              <helix-text class="specDoorFor">If you need the work done</helix-text>
              <helix-text appearance="title">See what it costs</helix-text>
              <helix-text appearance="caption" tone="muted">
                Audits from $12,000. Sprints from $32,000. Every price stated.
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
            {/* Three across rather than three stacked. The same three claims
                as a column of prose is a wall of text; as a row of words it is
                a diagram, and the rungs are legible without reading. */}
            <helix-grid class="specRungs" gap="none" min="14rem">
              {LADDER.map((rung) => (
                <helix-flex class="specRung" direction="column" gap="sm" key={rung.name}>
                  <helix-text class="specDoorFor">{rung.rung}</helix-text>
                  <helix-text as="h3" class="specRungName">
                    {rung.name}
                  </helix-text>
                  <helix-text appearance="caption" tone="muted">
                    {rung.body}
                  </helix-text>
                </helix-flex>
              ))}
            </helix-grid>
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
                Handover is a condition of the work, not a phase at the end. If an engagement would
                leave you needing us on a retainer, we will not take it.
              </helix-text>
              <helix-text as="p" tone="muted">
                Worth being plain about which part of that is hard. Keeping a design system is not.
                Keeping a memory that lives somewhere else is, and that is what Cortex is for.
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
            Two weeks, fixed price, and the honest answer may be that you do not need the rest.
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
