import type { Stage } from './verticals'

/**
 * A place inside a product worth putting in the masthead.
 *
 * Only destinations that exist. A panel is the one surface where a link to
 * nothing is indistinguishable from a link to something, because the reader
 * committed to the click before they could see what was behind it.
 */
export interface Destination {
  /**
   * Where it goes.
   */
  href: string
  /**
   * The mark down the side of the row, from the curated set in `helix/icons`.
   *
   * A utility glyph, deliberately, and the set of them reads as one idea:
   * Helix is the DNA, so what you do to it is looked at through instruments.
   * An atom for the components and a microscope for the sandbox rather than a
   * cube and a rectangle, which were two shapes with nothing in common.
   *
   * Bespoke product marks were tried in place of these and are not good enough
   * to ship. `brain`, `dna` and `test-tube` are in Phosphor too, for the Cortex
   * row when it settles into whatever replaces `Overview`.
   */
  icon: string
  /**
   * The sentence under the name, which is what the panel is for.
   */
  summary: string
  /**
   * The name on the row.
   */
  title: string
}

/**
 * A product: the evocative half of the naming rule.
 *
 * Two of them, and there will not be many. `CLAUDE.md` reserves an evocative
 * name for a module carrying a differentiated idea, so this list grows only
 * when something earns one, and everything else stays descriptive and stays
 * out of here.
 */
export interface Product {
  /**
   * The paragraph the landing page gives it.
   *
   * Separate from `summary` because the two are read at different distances: a
   * row in a panel gets one line and a card on the landing page gets an
   * argument. Both live here so neither can drift into contradicting the other.
   */
  body: string
  /**
   * What a reader can actually open inside it, and nothing they cannot.
   */
  destinations: Destination[]
  /**
   * Its page, which is also its vertical's page where the two collapse.
   */
  href: string
  /**
   * The evocative name, which is what the masthead says.
   */
  name: string
  /**
   * Its one-word job, worn as the column's subtitle. `The DNA`, `The mind`.
   */
  role: string
  /**
   * What is true of it today, carried into the panel rather than left at the
   * door. A megamenu is the first thing a reader sees, so it is the first
   * place the stage has to be legible.
   */
  stage: Stage
  /**
   * One line, for the panel's column head and the landing page's card.
   */
  summary: string
}

/**
 * The two substrates, which are the only two products.
 *
 * **The masthead says `Products` and lists these, not the verticals.** A
 * vertical is a division and a product is a thing you use: nobody uses Fusion
 * Design, they use Helix. The verticals still ride in the panel's third
 * column, because dropping Energy and Capital from the map to keep the column
 * count tidy would be softening them by omission, which is the one thing the
 * stage labels exist to prevent.
 *
 * Cortex carries one destination and Helix carries two, and the asymmetry is
 * the honest reporting rather than a gap to fill. Engram, Trace and Recall are
 * named in `CLAUDE.md` and none of them is built, so none of them is a row
 * here. The day one is, it is a row.
 */
export const PRODUCTS: Product[] = [
  {
    body: 'The design system. Web components with a token layer that derives an accessible palette from one brand color, so an interface is consistent because there was nothing else to choose. Components ship as custom elements, which keeps the framework above them a choice rather than a commitment.',
    destinations: [
      {
        href: '/helix',
        icon: 'atom',
        summary: 'Sixty-five families, each with its API and a running example.',
        title: 'Components',
      },
      {
        href: '/helix/sandbox',
        icon: 'microscope',
        summary: 'Edit an example and watch it render, with the source beside it.',
        title: 'Sandbox',
      },
    ],
    href: '/helix',
    name: 'Helix',
    role: 'The DNA',
    stage: 'Building',
    summary:
      'The design system. Web components over a token layer that derives its palette from one brand color.',
  },
  {
    body: 'Memory and provenance. What a system knows, where it learned it, and how much of it to trust. Not a model wrapper: the part that remains true when the model underneath is replaced.',
    destinations: [
      {
        href: '/cortex',
        icon: 'pulse',
        summary: 'What a system knows, where it learned it, and how far to trust it.',
        title: 'Overview',
      },
    ],
    href: '/cortex',
    name: 'Cortex',
    role: 'The mind',
    stage: 'Building',
    summary:
      'Memory and provenance. The part that stays true when the model underneath is replaced.',
  },
]
