import type { PageCopy } from './copy'

/**
 * The thesis, as data.
 *
 * The page lays it out as bands with a stack table and two card grids;
 * `bun run catalog` lays the same object out as `/thesis.md`. One set of words.
 *
 * The two structured lists stay their own exports rather than being flattened
 * into `items`, because the page renders more of each row than a name and a
 * paragraph: the stack links each layer at its vertical, and the ladder names
 * the subject a rung is shipped to. The blocks below reference them.
 */

/** The layers, and what each one is sovereignty over. */
export const STACK = [
  { layer: 'Interface', over: 'the tools you build with', vertical: '/helix' },
  { layer: 'Cognitive', over: 'your intelligence, memory and reasoning', vertical: '/cortex' },
  { layer: 'Informational', over: 'your records and where they came from', vertical: '/cortex' },
  { layer: 'Energy', over: 'your own power', vertical: '/energy' },
  { layer: 'Financial', over: 'your own capital', vertical: '/capital' },
]

/** The same stack, three subjects. */
export const LADDER = [
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

export const THESIS: PageCopy = {
  blocks: [
    {
      body: [
        'Derived rather than invented. Each layer is something a subject either controls or rents, and the stage against each is what is actually built.',
        'Energy is the missing floor, and every layer above it presumes power. It is also why the company is called Fusion: fuel from seawater, no import, no cartel, no grid dependency. The name states the destination rather than the position.',
      ],
      items: STACK.map((row) => ({ body: `Sovereign over ${row.over}`, name: row.layer })),
      kicker: 'The stack',
      title: 'What makes anything sovereign, at any scale',
    },
    {
      body: [
        'This is the growth path and the go-to-market sequence at once. It is not seven unrelated markets: it is one stack and one architectural commitment, sold to a larger subject each time.',
      ],
      items: LADDER.map((rung) => ({
        body: `${rung.body} For ${rung.means}.`,
        name: rung.scale,
      })),
      kicker: 'The ladder',
      title: 'One stack, shipped to progressively larger subjects',
    },
    {
      body: [
        '**No Fusion product may create a dependency its user cannot exit.**',
        'The user holds their own keys, data and hardware. Fusion may operate a control plane, never a chokepoint. Every product must be able to keep working if Fusion disappears.',
        'The cost is real and worth stating plainly: it forecloses the highest margin patterns in software, which are lock-in, the data moat and usage rent. What is left is services now, a hosted control plane sold as convenience later, and hardware margin eventually, which is the one model fully native to sovereignty because you sell it and they own it.',
      ],
      items: [
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
      ],
      kicker: 'The Sovereignty Constraint',
      title: 'Why it is a law and not a value',
    },
  ],
  lede: 'Cheap intelligence and cheap energy are collapsing in cost at the same moment. That is not primarily a productivity story. The two things that historically forced a person or a nation to depend on a larger institution were the cost of thinking at scale and the cost of power, and both are falling.',
  title: 'Sovereignty is the goal. Abundance is the mechanism.',
}
