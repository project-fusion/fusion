/* Generated from the built packages by `bun run gen:metrics`. Do not edit. */

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
    value: '93',
  },
  {
    label: 'The token layer, compressed',
    note: '185 semantic tokens. Nothing on a Helix page paints without this file.',
    value: '2.1 kB',
  },
  {
    label: 'The derivation engine',
    note: 'Build time for most consumers, runtime for a theme switcher.',
    value: '1.4 kB',
  },
  {
    label: 'Shared across the first component',
    note: 'Ten components are one runtime plus nine additions, not ten of the first number.',
    value: '83%',
  },
]

export interface Rival {
  /** Brotli bytes for the one component, alone. */
  brotli: number
  name: string
  /** Ours, which the page marks rather than infers from the name. */
  ours?: boolean
}

export const BUTTON: readonly Rival[] = [
  {
    brotli: 10187,
    name: 'Helix',
    ours: true,
  },
  {
    brotli: 12591,
    name: 'Material Web',
  },
  {
    brotli: 15805,
    name: 'Shoelace',
  },
  {
    brotli: 17685,
    name: 'Carbon',
  },
  {
    brotli: 18674,
    name: 'Spectrum',
  },
]
