/**
 * The three honest maturities, and the only three.
 *
 * A union rather than a string, and exported rather than written inline,
 * because `products.ts` reports the same fact about Helix and Cortex. Two
 * copies of this list is how a fourth label gets invented on one of them.
 */
export type Stage = 'Active' | 'Building' | 'Declared'

export interface Vertical {
  /**
   * The paragraph its own page opens with.
   */
  body: string
  /**
   * Where it lives. Design and Mind name their product, because the page under
   * each of them is that product's page.
   */
  href: string
  /**
   * The mark it wears in the megamenu's vertical column.
   */
  icon: string
  /**
   * The short form, for a strip of navigation.
   */
  label: string
  /**
   * The full descriptive name, per the naming rule.
   */
  name: string
  /**
   * What is actually true of it today.
   */
  stage: Stage
  /**
   * One line, for a row in a list.
   */
  summary: string
}

/**
 * The verticals, in the order the company is organized.
 *
 * One list, read by the navigation, the landing page, the megamenu's third
 * column, and each vertical's own page. Stage labels are the honest ones:
 * Active ships with users, Building is real work with nothing shipped,
 * Declared is committed direction with no work started. Nothing here softens
 * them.
 *
 * **Studio leads, because it is the only one that can be bought.** A reader
 * meeting this list wants to know what is for sale before what is being built,
 * and the practice is the one thing on the site belonging to no vertical at all.
 *
 * **Design and Mind point at their product's route, and that is the collapse
 * rather than an oversight.** A vertical is how the company is organized and a
 * product is what a reader uses, and where exactly one product fills a
 * vertical, shipping two pages for it would be padding: `/helix` titles itself
 * Helix and wears Fusion Design as an eyebrow. A vertical with no product would
 * need a page of its own.
 */
export const VERTICALS: Vertical[] = [
  {
    body: 'Our services team. We deliver interface and AI work into your repository under your license. Studio is the part of Fusion you can hire today, and we take on work that also improves Helix or Cortex.',
    href: '/company/services',
    icon: 'briefcase',
    label: 'Studio',
    name: 'Fusion Studio',
    stage: 'Active',
    summary: 'Three services, from a two-week audit to a full build.',
  },
  {
    body: 'Fusion Design builds Helix, a design system of web components. Helix computes its color tokens from your brand color.',
    href: '/helix',
    icon: 'palette',
    label: 'Design',
    name: 'Fusion Design',
    stage: 'Building',
    summary: 'Home of Helix, our design system.',
  },
  {
    body: 'Fusion Mind builds Cortex, a memory and provenance layer for AI systems. Cortex records what a system knows, where it learned it, and how far to trust it.',
    href: '/cortex',
    icon: 'pulse',
    label: 'Mind',
    name: 'Fusion Mind',
    stage: 'Building',
    summary: 'Home of Cortex, our memory layer.',
  },
]

export const stageAppearance = (stage: string) =>
  stage === 'Active' ? 'success' : stage === 'Building' ? 'warning' : 'neutral'

export const findVertical = (href: string): Vertical | undefined =>
  VERTICALS.find((vertical) => vertical.href === href)
