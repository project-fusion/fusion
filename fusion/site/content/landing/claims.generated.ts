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
