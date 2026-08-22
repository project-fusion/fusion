import { ThemeBuilder } from './builder'

/**
 * The theme builder.
 *
 * **The engine's first real consumer**, which is most of why it exists here
 * rather than as a demo somewhere. `@helix-io/theme` had no consumer in this
 * repository at all: `toCss` was called by nothing, and the one page that
 * themed anything wrote a private primitive by hand to do it. An API nobody has
 * used is an API nobody has tested, and the Rust port in #142 would have frozen
 * whatever shape it happened to have.
 *
 * A tool rather than a page in `(site)`, for the reason `SandboxLayout` already
 * gives: every row of chrome around it is a row taken from the thing being
 * examined.
 */
export const metadata = {
  description: 'Describe a brand. Get a palette every pair of which has been measured.',
  title: 'Theme builder',
}

export default function ThemePage() {
  return <ThemeBuilder />
}
