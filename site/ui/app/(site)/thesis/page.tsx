/**
 * The company's argument, at length.
 *
 * **This is the page the landing page was standing in for.** The home page
 * carried the mechanism, the ladder and the constraint in three bands, which
 * made it long and still gave none of them room. They belong here, where an
 * argument can take the space it needs and a reader who wants the short version
 * never has to meet it.
 *
 * Derived from `docs/00-thesis.md` rather than written fresh, and cut where the
 * document names things this repository does not have: it lists verticals and a
 * product that are not in `verticals.ts`, and a page that claims them would be
 * describing a different company.
 */
import { stageAppearance, VERTICALS } from '../../verticals'

export const metadata = {
  description:
    'Sovereignty is the goal, abundance is the mechanism, and the same stack runs from one person to one country.',
  title: 'Thesis',
}

/** The layers, and which of them anyone can use today. */
const STACK = [
  { layer: 'Interface', over: 'the tools you build with', vertical: '/helix' },
  { layer: 'Cognitive', over: 'your intelligence, memory and reasoning', vertical: '/cortex' },
  { layer: 'Informational', over: 'your records and where they came from', vertical: '/cortex' },
  { layer: 'Energy', over: 'your own power', vertical: '/energy' },
  { layer: 'Financial', over: 'your own capital', vertical: '/capital' },
]

/** The same stack, three subjects. */
const LADDER = [
  {
    body: 'Own your mind, your keys and your power. The model runs where you put it and the memory it accumulates is a file you hold.',
    means: 'the individual',
    scale: 'Personal',
  },
  {
    body: 'Operate without platform dependence. A company that cannot be held hostage by a vendor roadmap, because it runs the substrate and holds the data.',
    means: 'a company or a community',
    scale: 'Organizational',
  },
  {
    body: 'Energy independence and institutional capability. A state that generates its own power and runs its own intelligence has different options than one that does not.',
    means: 'the state',
    scale: 'National',
  },
]

/** Why the constraint is binding rather than aspirational. */
const REASONS = [
  {
    body: 'For any proposal: what happens to the user if Fusion shuts down tomorrow? If the answer is that they lose the thing, it is not a Fusion product. That single question is a real filter on breadth.',
    name: 'It is testable',
  },
  {
    body: 'Model quality is rented and commoditising. An architectural commitment competitors structurally cannot copy, because their business model requires the chokepoint, is not.',
    name: 'It is the only defensible one',
  },
  {
    body: 'Energy, capital and cognition are obviously the same company under this constraint. Without it they are a conglomerate.',
    name: 'It makes the verticals cohere',
  },
]

export default function Page() {
  return (
    <>
      <section data-band>
        <helix-flex data-shell direction="column" gap="lg">
          <helix-text tone="subtle" variant="label">
            Thesis
          </helix-text>
          <helix-text as="h1" data-measure data-section-title>
            Sovereignty is the goal. Abundance is the mechanism.
          </helix-text>
          <helix-text as="p" data-measure tone="muted">
            Cheap intelligence and cheap energy are collapsing in cost at the same moment. That is
            not primarily a productivity story. The two things that historically forced a person or
            a nation to depend on a larger institution were the cost of thinking at scale and the
            cost of power, and both are falling.
          </helix-text>
        </helix-flex>
      </section>

      <section data-band data-reveal>
        <helix-flex data-shell direction="column" gap="xl">
          <helix-flex direction="column" gap="sm">
            <helix-text tone="subtle" variant="label">
              The stack
            </helix-text>
            <helix-text as="h2" data-measure data-section-title>
              What makes anything sovereign, at any scale
            </helix-text>
            <helix-text as="p" data-measure tone="muted">
              Derived rather than invented. Each layer is something a subject either controls or
              rents, and the stage against each is what is actually built.
            </helix-text>
          </helix-flex>

          <helix-flex direction="column">
            {STACK.map((row) => {
              const vertical = VERTICALS.find((entry) => entry.href === row.vertical)
              return (
                <helix-flex align="center" data-row gap="md" justify="between" key={row.layer} wrap>
                  <helix-flex direction="column" gap="2xs">
                    <helix-flex align="center" data-density="sm" gap="sm" wrap>
                      <helix-text as="h3" data-row-name>
                        {row.layer}
                      </helix-text>
                      {vertical ? (
                        <helix-tag tone={stageAppearance(vertical.stage)}>
                          {vertical.stage}
                        </helix-tag>
                      ) : null}
                    </helix-flex>
                    <helix-text tone="muted">Sovereign over {row.over}</helix-text>
                  </helix-flex>
                  {vertical ? (
                    <a data-link="quiet" href={vertical.href}>
                      {vertical.name}
                    </a>
                  ) : null}
                </helix-flex>
              )
            })}
          </helix-flex>

          <helix-text as="p" data-measure tone="muted">
            Energy is the missing floor, and every layer above it presumes power. It is also why the
            company is called Fusion: fuel from seawater, no import, no cartel, no grid dependency.
            The name states the destination rather than the position.
          </helix-text>
        </helix-flex>
      </section>

      <section data-band data-reveal>
        <helix-flex data-shell direction="column" gap="xl">
          <helix-flex direction="column" gap="sm">
            <helix-text tone="subtle" variant="label">
              The ladder
            </helix-text>
            <helix-text as="h2" data-measure data-section-title>
              One stack, shipped to progressively larger subjects
            </helix-text>
          </helix-flex>

          <helix-grid gap="xl" min="18rem">
            {LADDER.map((rung) => (
              <helix-flex data-substrate direction="column" gap="sm" key={rung.scale}>
                <helix-text tone="subtle" variant="label">
                  {rung.means}
                </helix-text>
                <helix-text as="h3" data-substrate-name>
                  {rung.scale}
                </helix-text>
                <helix-text as="p" tone="muted">
                  {rung.body}
                </helix-text>
              </helix-flex>
            ))}
          </helix-grid>

          <helix-text as="p" data-measure tone="muted">
            This is the growth path and the go-to-market sequence at once. It is not seven unrelated
            markets: it is one stack and one architectural commitment, sold to a larger subject each
            time.
          </helix-text>
        </helix-flex>
      </section>

      <section data-band data-reveal>
        <helix-flex class={`statement`} data-shell direction="column" gap="lg">
          <helix-text tone="subtle" variant="label">
            The Sovereignty Constraint
          </helix-text>
          <helix-text as="p" data-statement>
            No Fusion product may create a dependency its user cannot exit.
          </helix-text>
          <helix-text as="p" data-measure tone="muted">
            The user holds their own keys, data and hardware. Fusion may operate a control plane,
            never a chokepoint. Every product must be able to keep working if Fusion disappears.
          </helix-text>
        </helix-flex>
      </section>

      <section data-band data-reveal>
        <helix-flex data-shell direction="column" gap="xl">
          <helix-text as="h2" data-measure data-section-title>
            Why it is a law and not a value
          </helix-text>
          <helix-grid gap="xl" min="18rem">
            {REASONS.map((reason) => (
              <helix-flex data-substrate direction="column" gap="sm" key={reason.name}>
                <helix-text as="h3" data-substrate-name>
                  {reason.name}
                </helix-text>
                <helix-text as="p" tone="muted">
                  {reason.body}
                </helix-text>
              </helix-flex>
            ))}
          </helix-grid>
          <helix-text as="p" data-measure tone="muted">
            The cost is real and worth stating plainly: it forecloses the highest margin patterns in
            software, which are lock-in, the data moat and usage rent. What is left is services now,
            a hosted control plane sold as convenience later, and hardware margin eventually, which
            is the one model fully native to sovereignty because you sell it and they own it.
          </helix-text>
          <a data-link href="/trust">
            What has to be true before any of it ships
          </a>
        </helix-flex>
      </section>
    </>
  )
}
