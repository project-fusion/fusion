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
   * What the buyer holds at the end. In every case it is theirs to keep and
   * run without us.
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
      'A written account of where AI work would help your product, and where it would not',
      'A review of your models, tools, and costs against your goals',
      'A ranked list of what to build, what to buy, and what to leave alone',
      'The first thing to do, and why',
    ],
    name: 'AI capability audit',
    outcome:
      'A document you own and can act on without us. If you do not need a larger engagement, the audit says so.',
    price: '$12,000 to $18,000',
    summary:
      'Up to two weeks to find out which AI work is worth building. It fits around your roadmap and does not commit you to more.',
  },
  {
    duration: 'Four weeks, two days a week',
    includes: [
      'Color tokens computed from your brand color',
      'The components your product uses, built as custom elements',
      'Types for the frameworks you use',
      'A component manifest, documentation, and build checks',
    ],
    name: 'Design system sprint',
    outcome:
      'Your design system, in your repository, under your license. It keeps working after we leave.',
    price: '$32,000 to $45,000',
    summary:
      'Helix, applied to your product. We build your components in your repository, as working code.',
  },
  {
    duration: 'Six to eight weeks, two days a week',
    includes: [
      'We work in your team, in your codebase',
      'Interface and AI work built on Helix and Cortex',
      'Architecture decisions written down with their trade-offs',
      'We hand the work over as we go',
    ],
    name: 'Conversational build',
    outcome:
      'Working software and the reasoning behind it, in your hands. It keeps running after we leave.',
    price: 'From $60,000',
    summary:
      'We build software with you while the specification is still changing, and agree the next step in each conversation.',
  },
]
