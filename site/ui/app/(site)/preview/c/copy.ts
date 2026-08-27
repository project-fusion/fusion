/**
 * Draft C's copy, as data.
 *
 * **Helix first, and services as the way you get it.** The earlier drafts led
 * with the company and listed two substrates and three offers as peers, which
 * asks a reader to care about Fusion before they have been told what Fusion has.
 * Nearly everything here is about the design system, and the engagements are
 * framed as how it arrives rather than as a separate menu.
 *
 * **The shape is borrowed and the voice is not.** Supernova opens on the
 * reader's problem, answers it with three mechanisms, then names capabilities
 * one at a time with proof under each. That structure works because it earns
 * each claim before making the next. What is not borrowed is the register: no
 * superlatives, no "powerful", no "seamless", and every number here is one the
 * build produces.
 */

/** One capability, stated the way the feature blocks state them. */
export interface Capability {
  /** Three facts a reader can check, not three adjectives. */
  bullets: readonly string[]
  claim: string
  /** The short name in the eyebrow above the claim. */
  name: string
}

export const HERO = {
  install: 'bun add @helix-io/styled',
  lede: 'Ninety-two components, a token layer that derives its own palette, and the checks that keep both honest. Take it and go, or hire the people who built it.',
  title: 'The design system is the part you should not be building',
} as const

/**
 * The problem, before the answer.
 *
 * **Not "design systems are hard".** That is a sentiment, and a reader who has
 * built one does not need to be told. The specific failure is that the cost
 * arrives later than the decision does, which is the thing nobody plans for.
 */
export const PROBLEM = {
  lede: 'The first palette is a morning. The second brand, the framework migration and the accessibility audit are the rest of the year, and none of them is visible on the day you choose your tokens.',
  title: 'A design system is cheap to start and expensive to keep',
} as const

export const MECHANISMS: readonly Capability[] = [
  {
    bullets: [
      'One brand color in, a full palette out',
      'Every foreground measured against its own ground',
      'The engine refuses a palette it cannot make readable',
    ],
    claim: 'It survives the second brand',
    name: 'Derived, not picked',
  },
  {
    bullets: [
      'Custom elements, so they upgrade in any framework or none',
      'Typed for React, Vue and Svelte from one manifest',
      'No wrapper package to keep in step with either side',
    ],
    claim: 'It survives the framework',
    name: 'Standards, not bindings',
  },
  {
    bullets: [
      'Contrast is measured on every release, not asserted once',
      'Sizes are produced by the build and published',
      'Twelve generators judge the tree and fail it when it drifts',
    ],
    claim: 'It survives the audit',
    name: 'Measured, not claimed',
  },
]

/**
 * How it arrives, which is the part that is for sale.
 *
 * Each of these is a way to get the system above rather than a separate
 * discipline, which is what the framing asks for: the product is Helix and the
 * service is delivery.
 */
export const DELIVERY = {
  lede: 'Every price is published, because an offer you cannot compare is not an offer.',
  title: 'Three ways to get it into your product',
} as const
