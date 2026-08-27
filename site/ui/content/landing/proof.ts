/**
 * The measured claims, for the front of the site.
 *
 * **These numbers are copied and that is a defect, not a shortcut.** Every one
 * of them is produced by `bun run metrics` from the built packages and written
 * into `helix/docs/content/metrics.mdx`, which says at the top that an edited
 * number is a number nothing produced. Copying them here creates exactly the
 * staleness the generator exists to prevent: `tokens.css` grows by one token
 * and the docs move while the landing page keeps yesterday's figure.
 *
 * Before this ships, `tooling/scripts/build-metrics.mjs` should emit this module
 * alongside the MDX, and `check:metrics` should judge it the way the other
 * eleven generators are judged. It is written by hand here because the shape has
 * to be decided before a generator can be taught to produce it.
 *
 * Brotli throughout. Gzip is the honest floor and brotli is what a CDN actually
 * serves, and quoting the larger of the two to look conservative would be
 * quoting a number no reader receives.
 */

/** One number a reader can hold, with the sentence that makes it mean something. */
export interface Claim {
  /** What was measured, in the fewest words that stay true. */
  label: string
  /** Why the number is the one worth printing. Never an adjective. */
  note: string
  /** Rendered large. A string because the unit belongs to the figure. */
  value: string
}

export const CLAIMS: readonly Claim[] = [
  {
    label: 'Components',
    note: 'Two tiers. Headless behavior and a styled layer over it, both shipped.',
    value: '92',
  },
  {
    label: 'The token layer, compressed',
    note: '179 semantic tokens. Nothing on a Helix page paints without this file.',
    value: '1.9 kB',
  },
  {
    label: 'The derivation engine',
    note: 'Build time for most consumers, runtime for a theme switcher.',
    value: '1.4 kB',
  },
  {
    label: 'Shared across the first component',
    note: 'Ten components are one runtime plus nine additions, not ten of the first number.',
    value: '66%',
  },
]

/**
 * The same button, built five ways.
 *
 * **Named systems rather than "other libraries".** A comparison that will not
 * say who it is against is a claim about nobody, and every one of these is
 * measured by the same script on the same day under the same compression.
 *
 * Button, because it is the one component every system in the row has and the
 * one a reader can hold in their head. The full table is on the metrics page.
 */
export interface Rival {
  /** Brotli bytes for one button, runtime included. */
  brotli: number
  name: string
  /** Ours, and said so rather than left to the reader to spot. */
  ours?: boolean
}

export const BUTTON: readonly Rival[] = [
  { brotli: 12591, name: 'Material Web' },
  { brotli: 13049, name: 'Helix', ours: true },
  { brotli: 15805, name: 'Shoelace' },
  { brotli: 17685, name: 'Carbon' },
  { brotli: 18674, name: 'Spectrum' },
]

/** Where the whole table lives, with the method above it. */
export const METRICS_HREF = '/helix/docs/metrics'
