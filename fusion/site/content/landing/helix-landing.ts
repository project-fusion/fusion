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
 * The problem, before the answer: the cost of an interface arrives after the
 * first screen ships.
 */
export const PROBLEM = {
  /**
   * About the interface in general, so the section also speaks to someone who
   * does not think of their problem as a design system. The last sentence names
   * Helix, because the four cards under it start from that subject.
   */
  lede: 'The first screen takes a morning. A second brand, a framework migration, and an accessibility audit take the rest of the year, and none of them is visible on the day you start. Helix is built for that later work.',
  title: 'An interface is cheap to start and expensive to keep',
} as const

/**
 * The four jobs Helix does for you, each with two facts you can check. The
 * fourth, agents, is the one you can verify by fetching a URL.
 */
export const MECHANISMS: readonly Capability[] = [
  {
    bullets: [
      'Enter one brand color and get a full palette',
      'Helix rejects a palette it cannot make readable',
    ],
    claim: 'Add a second brand with one color',
    name: 'Theming',
  },
  {
    bullets: [
      'Custom elements that run in any framework, or in none',
      'Types for React, Vue, and Svelte from one manifest',
    ],
    claim: 'Switch frameworks without a rewrite',
    name: 'Components',
  },
  {
    bullets: [
      'Contrast is measured on every release',
      'Twelve generators check the code and fail the build when it drifts',
    ],
    claim: 'Find problems before an audit does',
    name: 'Checks',
  },
  {
    /* Both are live URLs on this site rather than a roadmap. The manifest is
       what the reference and the typings are generated from, so an agent reading
       it is reading the same source the documentation was built from rather than
       a description of it. The CLI serves the same derivation over MCP and is
       deliberately not cited here: it does not publish yet. */
    bullets: [
      'Every tag, property, and event in one manifest at a URL',
      'Every page as Markdown, and every component family as JSON',
    ],
    claim: 'Give AI agents the reference you read',
    name: 'Agents',
  },
]

export const DELIVERY = {
  lede: 'Every service runs two days a week, alongside your team.',
  /**
   * **How long the services run, from the shortest to the longest.** The
   * eyebrow names them, so the heading says the one thing a reader weighs
   * first: one to two weeks for the audit, and six to eight for the build.
   */
  title: 'From a one-week audit to an eight-week build',
} as const

/**
 * What hiring the engineering is actually like, in four cards.
 *
 * **The half of the heading the page was not answering.** "And the engineers
 * behind it" is half the hero, and the other bands are the system, the numbers
 * and the services: everything about what you buy and nothing about what the
 * work is.
 *
 * Typed here and imported by the Markdown mirror, so the page and the document
 * version of it cannot drift.
 */
export const ENGAGEMENT: readonly CopyItem[] = [
  {
    body: 'Helix already has its token layer, components, framework types, sandbox, and build checks. Your project starts from that.',
    name: 'The system is already built',
  },
  {
    body: 'A typical engagement is four weeks at two days a week. The same work started from nothing takes months.',
    name: 'The work takes weeks',
  },
  {
    body: 'The work lands in your repository under your license. We hand it over as we go, so you do not need us on a retainer afterward.',
    name: 'You keep all of it',
  },
  {
    body: 'Every product shows its stage. Active means it ships to users. Building means work is underway and nothing has shipped. Declared means it is planned.',
    name: 'We tell you what is not done',
  },
]

/** The frame above those four cards. */
export const ENGAGEMENT_COPY = {
  title: 'We built Helix, and we build with it in your codebase',
} as const
