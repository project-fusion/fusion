/**
 * Draft C's copy, as data.
 *
 * **Helix first, and services as the way you get it.** Leading with the company,
 * and listing substrates and offers as peers, asks a reader to care about Fusion
 * before they have been told what Fusion has. Nearly everything here is about
 * the design system, and the engagements are framed as how it arrives rather
 * than as a separate menu.
 *
 * **The shape is borrowed and the voice is not.** Supernova opens on the
 * reader's problem, answers it with three mechanisms, then names capabilities
 * one at a time with proof under each. That structure works because it earns
 * each claim before making the next. What is not borrowed is the register: no
 * superlatives, no "powerful", no "seamless", and every number here is one the
 * build produces.
 */

import type { CopyItem } from '@/content/copy/copy'

/** One capability, stated the way the feature blocks state them. */
export interface Capability {
  /** Two facts a reader can check, not two adjectives. */
  bullets: readonly string[]
  claim: string
  /** The short name in the eyebrow above the claim. */
  name: string
}

export const HERO = {
  /**
   * The phrase the heading turns over to the brand.
   *
   * **Split from the title rather than marked up inside it**, because the title
   * is also the page's `<title>` and its share text, where a `<span>` is not a
   * thing. Two fields keep one sentence in one place and let the page decide
   * which half is painted.
   */
  accent: 'and the engineers behind it',
  /**
   * **The longer form, for a search result and a link preview.**
   *
   * Separate from `lede` because the hero is one line, and cutting the two
   * together leaves a forty-nine character meta description: a result page and a
   * link card want the sentences a hero is better without. So the proofs live
   * here, where length is a virtue.
   *
   * **All three are literal and checkable, which is why they are worth stating
   * flatly.** Open source is MIT across the published packages. Machine-readable
   * is an MCP server and an `llms.txt`, so an agent can derive a theme, audit
   * its contrast and read the docs. Verified on every build is the contrast
   * gate, the token checks and an agent corpus that fails when a question stops
   * being answerable from a current artifact. That is the intelligence the
   * heading names, said plainly enough that the phrase is a description rather
   * than a joke.
   */
  description:
    'Ship faster because the system does the checking. An open source design system, machine-readable and verified on every build, and the engineers behind it.',
  install: 'bun add @fusion.dev/helix',
  /**
   * **One sentence, because the hero already says enough.** `Ship faster` is the
   * outcome and `because the system does the checking` is the mechanism, which
   * is the only honest way to promise speed: nothing here makes a person type
   * faster, it removes a review step they were doing by hand.
   *
   * The other claims are not wrong here, they are early: the bands below
   * evidence each one at the point a reader is asking for it, and `description`
   * still hands all three to a search result. What is left is the whole of what
   * someone needs before the buttons under it.
   *
   * **And no number in it.** A count in the hero is a fact with an owner, wrong
   * the day a component is added, and nothing checks it. The band below prints
   * the count from the built packages, where it is generated and cannot drift.
   */
  lede: 'Ship faster because the system does the checking.',
  /**
   * **Generic before it is clever.** A sentence about us that takes twenty words
   * to reach what the product is loses a reader arriving cold: they want the
   * category first and the argument second.
   *
   * Reads as one sentence with `accent`: "An intelligent design system, and the
   * engineers behind it." The category is plain and the half worth painting is
   * the people, which is the whole reason the heading is in two colors: the
   * system is the thing being sold and the engineers are the reason to trust
   * it.
   */
  title: 'An intelligent design system,',
  /**
   * What the package actually is, for a reader deciding whether it can be used
   * at all.
   *
   * **The framework question is the first one an engineer asks.** Everything
   * else in the hero is about what the system does; none of it says what you
   * install or whether it fits what you already have. Custom elements are the
   * answer to both, and Lit is the honest footnote: it is what they are built
   * with, and it is 5KB the consumer is also taking.
   */
  works: 'Custom elements, built on Lit. Works in React, Vue, Svelte, or no framework at all.',
} as const

/**
 * The problem, before the answer.
 *
 * **Not "design systems are hard".** That is a sentiment, and a reader who has
 * built one does not need to be told. The specific failure is that the cost
 * arrives later than the decision does, which is the thing nobody plans for.
 */
export const PROBLEM = {
  /**
   * **The interface, not the design system.** The hero opens on the system *and*
   * the engineering *and* the people, so a reader who does not have a design
   * system problem, and has an interface problem, puts the page down if the
   * first thing under it is an argument about tokens. The cost being described
   * was never really the palette's anyway: it is the second brand, the migration
   * and the audit, and those arrive whether or not anyone called the thing a
   * design system.
   *
   * **The last sentence exists so `It` has something to point at.**
   *
   * The four claims under this all begin "It survives", and read on their own
   * the card never says what "it" is: a heading about interfaces, a paragraph
   * about a year of work, then four promises with no subject. A reader landing
   * on this section from anywhere but the top of the page has no way to know
   * the answer is Helix, and the page has to say it once for the four cards to
   * mean anything.
   *
   * Named here rather than in each claim, which would be `Helix survives the
   * second brand` four times over.
   */
  lede: 'The first screen is a morning. The second brand, the framework migration and the accessibility audit are the rest of the year, and none of them is visible on the day you start. Helix is built for that year, not the morning.',
  title: 'An interface is cheap to start and expensive to keep',
} as const

/**
 * The four costs the system is built to survive, each with the facts behind it.
 *
 * **Four rather than three, because the page promises intelligence.** The hero
 * calls this an intelligent design system, and the second brand, the framework
 * and the audit are all real without being the reason that word is in the
 * heading. `Readable, not scraped` is, and it is the one claim on this page an
 * agent can verify by fetching a URL.
 *
 * **Two bullets each, not three.** Twelve facts is a wall a reader skims. The
 * pair kept for each card is the mechanism and the guarantee it buys, which is
 * the argument; a third is the corollary of one of them.
 */
export const MECHANISMS: readonly Capability[] = [
  {
    bullets: [
      'One brand color in, a full palette out',
      'The engine refuses a palette it cannot make readable',
    ],
    claim: 'It survives the second brand',
    name: 'Derived, not picked',
  },
  {
    bullets: [
      'Custom elements, so they upgrade in any framework or none',
      'Typed for React, Vue and Svelte from one manifest',
    ],
    claim: 'It survives the framework',
    name: 'Standards, not bindings',
  },
  {
    bullets: [
      'Contrast is measured on every release, not asserted once',
      'Twelve generators judge the tree and fail it when it drifts',
    ],
    claim: 'It survives the audit',
    name: 'Measured, not claimed',
  },
  {
    /* Both are live URLs on this site rather than a roadmap. The manifest is
       what the reference and the typings are generated from, so an agent reading
       it is reading the same source the documentation was built from rather than
       a description of it. The CLI serves the same derivation over MCP and is
       deliberately not cited here: it does not publish yet. */
    bullets: [
      'Every tag, property and event as one manifest, at a URL',
      'Every page answers as Markdown, every component family as JSON',
    ],
    claim: 'It survives the agent',
    name: 'Readable, not scraped',
  },
]

export const DELIVERY = {
  lede: 'Every price is published, because an offer you cannot compare is not an offer.',
  /**
   * **Named, because `it` had nothing to point at.** The band above this one is
   * about the engineers and the one above that about the essays, so a reader
   * arriving at "get it into your product" has to guess which noun three
   * sections back is being referred to. The page says `Helix` in the heading
   * that needs it.
   */
  title: 'Three ways to get Helix into your product',
} as const

/**
 * What hiring the engineering is actually like, in four cards.
 *
 * **The half of the heading the page was not answering.** "And the engineers
 * behind it" is half the hero, and the other bands are the system, the numbers
 * and a price list: everything about what you buy and nothing about what the
 * work is.
 *
 * Typed here and imported by the Markdown mirror, so the page and the document
 * version of it cannot drift.
 */
export const ENGAGEMENT: readonly CopyItem[] = [
  {
    body: 'A token layer, two tiers, generated framework wrappers, a sandbox and the checks that keep it honest. We are not learning this on your project.',
    name: 'The system already exists',
  },
  {
    body: 'Four weeks, two days a week, because the hard part is behind us. Starting from nothing, the same deliverable is quoted in months.',
    name: 'It is faster because of that',
  },
  {
    body: 'Your repository, your license. Handover is a condition of the work rather than a phase at the end, and no engagement should leave you needing us on a retainer.',
    name: 'You keep all of it',
  },
  {
    body: 'Active ships with users. Building is real work with nothing shipped. Declared is a direction. Nothing here is described as further along than it is.',
    name: 'We tell you what is not done',
  },
]

/** The frame above those four cards. */
export const ENGAGEMENT_COPY = {
  lede: 'Helix is the system. This is what it is like to have the people who built it working in your codebase.',
  title: 'How the work goes',
} as const
