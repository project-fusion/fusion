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
 * The verticals, in the order the company is organized. Design leads, because
 * it is the one with something to show.
 *
 * One list, read by the navigation, the landing page, the megamenu's third
 * column, and each vertical's own page. Stage labels are the honest ones:
 * Active ships with users, Building is real work with nothing shipped,
 * Declared is committed direction with no work started. Nothing here softens
 * them.
 *
 * **Design and Mind point at their product's route, and that is the collapse
 * rather than an oversight.** A vertical is how the company is organized and a
 * product is what a reader uses, and where exactly one product fills a
 * vertical, shipping two pages for it would be padding: `/helix` has titled
 * itself Helix and worn Fusion Design as an eyebrow since it was written.
 * Energy and Capital have no product, so their pages are the vertical.
 */
export const VERTICALS: Vertical[] = [
  {
    body: 'Helix is the design system: web components with a token layer that derives an accessible palette from a brand color rather than from a spreadsheet of hexes. Components ship as custom elements, so the framework above them stays a choice.',
    href: '/helix',
    icon: 'palette',
    label: 'Design',
    name: 'Fusion Design',
    stage: 'Building',
    summary: 'Interface. Helix lives here.',
  },
  {
    body: 'Cortex is the memory and provenance layer: what a system knows, where it learned it, and how much of it to trust. Not a model wrapper. The part that remains true when the model underneath is replaced.',
    href: '/cortex',
    icon: 'pulse',
    label: 'Mind',
    name: 'Fusion Mind',
    stage: 'Building',
    summary: 'Intelligence. Cortex lives here.',
  },
  {
    body: 'Cheap energy is half of why sovereignty stops being a principle you agree with and becomes something you can run. Committed direction, no product yet, and it is on the map rather than left off so the map is the whole map.',
    href: '/energy',
    icon: 'sun',
    label: 'Energy',
    name: 'Fusion Energy',
    stage: 'Declared',
    summary: 'The literal sun, and what it powers.',
  },
  {
    body: 'Allocation. Committed direction with no work started, listed for the same reason Energy is: a roadmap that shows only the parts that are going well is a brochure.',
    href: '/capital',
    icon: 'chart-line',
    label: 'Capital',
    name: 'Fusion Capital',
    stage: 'Declared',
    summary: 'Allocation. No product yet.',
  },
]

export const stageAppearance = (stage: string) =>
  stage === 'Active' ? 'success' : stage === 'Building' ? 'warning' : 'neutral'

export const findVertical = (href: string): Vertical | undefined =>
  VERTICALS.find((vertical) => vertical.href === href)
