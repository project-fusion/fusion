/**
 * The verticals, in the order the company is organised. Design leads, because
 * it is the one with something to show.
 *
 * One list, read by the navigation, the landing page, and each vertical's own
 * page. Stage labels are the honest ones: Active ships with users, Building is
 * real work with nothing shipped, Declared is committed direction with no work
 * started. Nothing here softens them.
 */
export interface Vertical {
  body: string
  href: string
  label: string
  name: string
  stage: 'Active' | 'Building' | 'Declared'
  summary: string
}

export const VERTICALS: Vertical[] = [
  {
    body: 'Helix is the design system: web components with a token layer that derives an accessible palette from a brand colour rather than from a spreadsheet of hexes. Components ship as custom elements, so the framework above them stays a choice.',
    href: '/design',
    label: 'Design',
    name: 'Fusion Design',
    stage: 'Building',
    summary: 'Interface. Helix lives here.',
  },
  {
    body: 'Cortex is the memory and provenance layer: what a system knows, where it learned it, and how much of it to trust. Not a model wrapper. The part that remains true when the model underneath is replaced.',
    href: '/mind',
    label: 'Mind',
    name: 'Fusion Mind',
    stage: 'Building',
    summary: 'Intelligence. Cortex lives here.',
  },
  {
    body: 'Cheap energy is half of why sovereignty stops being a principle you agree with and becomes something you can run. Committed direction, no product yet, and it is on the map rather than left off so the map is the whole map.',
    href: '/energy',
    label: 'Energy',
    name: 'Fusion Energy',
    stage: 'Declared',
    summary: 'The literal sun, and what it powers.',
  },
  {
    body: 'Allocation. Committed direction with no work started, listed for the same reason Energy is: a roadmap that shows only the parts that are going well is a brochure.',
    href: '/capital',
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
