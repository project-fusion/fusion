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
 * The three offers, in the order they are meant to be read.
 *
 * **Not alphabetized, because the order is the argument.** This is a ladder:
 * the audit is cheap enough to say yes to and is what qualifies a client for
 * the sprint, and the sprint is what makes the build engagement legible. Sorted
 * by name it would open on the largest number on the page.
 *
 * **Prices and durations are stated here once and read everywhere**, so the
 * pages that show them cannot drift from each other on what is actually sold or
 * for how much.
 *
 * **Every offer states the commitment and not only the elapsed time**, which is
 * the highest-value line in the set. Four weeks with no shape given invites a
 * full-time reading, and the price then reads as something it is not. The
 * number was never the problem: what it was divided by was.
 *
 * It is not a fact about the sprint alone. Every offer is costed against the
 * same part-time commitment, so a buyer reading "six to eight weeks" beside a
 * sprint that says "two days a week" has been told the build is something else,
 * which is the one reading that is worse than saying nothing at all.
 *
 * **Finance is deliberately absent.** Advising on securities for compensation
 * implicates investment-adviser registration, a regulatory surface this list
 * does not take on, so it stays three.
 */
export const SERVICES: Service[] = [
  {
    duration: 'One to two weeks, two days a week',
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
    duration: 'Four weeks, two days a week',
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
    duration: 'Six to eight weeks, two days a week',
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
