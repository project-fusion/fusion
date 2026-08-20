/**
 * One buyable offer.
 *
 * Every field here is a commitment a reader can hold us to, which is why the
 * price and the length are on the type rather than left to prose. An offer
 * whose cost appears only after a call is an offer that cannot be compared,
 * and the constraint that forbids lock-in is hard to square with a hidden
 * number.
 */
export interface Service {
  /**
   * How long it runs, stated in the unit the buyer thinks in.
   */
  duration: string
  /**
   * The mark on its card, from the curated set in `helix/icons`.
   */
  icon: string
  /**
   * What is in it. Deliverables, not adjectives.
   */
  includes: string[]
  /**
   * The offer's name.
   */
  name: string
  /**
   * What the buyer holds at the end, written so the exit test is visible: in
   * every case it is theirs to keep and run without us.
   */
  outcome: string
  /**
   * The range, in whole dollars. A range rather than a number because scope
   * moves it, and no range at all would be worse than an honest one.
   */
  price: string
  /**
   * One line, for the card and the landing page's band.
   */
  summary: string
}

/**
 * The three offers, in the order the plan sequences them.
 *
 * **Not alphabetized, because the order is the argument.** This is a ladder:
 * the audit is cheap enough to say yes to and is what qualifies a client for
 * the sprint, and the sprint is what makes the build engagement legible. Sorted
 * by name it would open on the largest number on the page.
 *
 * Copy is derived from `the internal plan` and `the internal plan`
 * rather than written fresh, so the site and the plan cannot drift on what is
 * actually sold or for how much.
 *
 * **It named only the plan once, and drifted for exactly that reason.**
 * The plan carries the offers and the prices; the model carries the durations
 * and the capacity they are costed against, and it was never opened. So the
 * sprint was published at six to ten weeks when it runs four, and
 * the build was published with no number at all although it has one.
 * `the internal plan` is the reconciliation and is the authority where
 * the two disagree.
 *
 * **Finance is deliberately absent.** The old site sold it and the plan drops
 * it: advising on securities for compensation implicates investment-adviser
 * registration, which is not worth the regulatory surface for now. Fusion Capital stays Declared, and this list stays three.
 */
export const SERVICES: Service[] = [
  {
    duration: 'One to two weeks',
    icon: 'magnifying-glass',
    includes: [
      'A written map of where the work actually is, and where it only looks like it is',
      'Model, tooling and cost review against what you are trying to do',
      'A ranked list of what to build, what to buy, and what to leave alone',
      'The one thing to do first, with the reason it is first',
    ],
    name: 'AI capability audit',
    outcome:
      'A document you own and can act on without us. If the honest answer is that you do not need the larger engagement, the audit says so.',
    price: '$12,000 to $18,000',
    summary:
      'Two weeks to find out what is worth building. Short enough to fit around your roadmap, cheap enough to be a real question rather than a commitment.',
  },
  {
    duration: 'Four weeks',
    icon: 'cube',
    includes: [
      'A token layer that derives an accessible palette from your brand color',
      'The components you actually ship, built as custom elements',
      'Framework wrappers where you need them, and no framework lock-in where you do not',
      'The manifest, the docs surface, and the checks that keep it honest',
    ],
    name: 'Design system sprint',
    outcome:
      'Your design system, in your repository, under your license. It runs whether or not we are still involved, which is the only version of this worth buying.',
    price: '$32,000 to $45,000',
    summary:
      'Shipped software in your repository, not a component library in a design tool. Helix applied to your product, pointed at your components and your constraints.',
  },
  {
    duration: 'Six to eight weeks',
    icon: 'users',
    includes: [
      'Building alongside your team rather than beside it',
      'Interface and intelligence work the substrates make faster to do well',
      'Architecture decisions written down with their trade-offs, not just made',
      'Handover as a condition of the work, not a phase at the end',
    ],
    name: 'Conversational build',
    outcome:
      'Working software and the reasoning behind it, in your hands. We leave and it keeps running.',
    price: 'From $60,000',
    summary:
      'Development where the specification is a conversation. For work whose shape is still moving, which is most of the work worth doing.',
  },
]
