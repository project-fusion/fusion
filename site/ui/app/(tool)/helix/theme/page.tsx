import { getFamilies } from '../../../../lib/catalog'
import { INSIGHTS } from '../../../../lib/insights'
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
  /* Built here, on a server, and handed down, the way the sandbox page and the
     site layout both already do it: the catalogue reads the manifest off disk
     and the insight registry is the whole of the writing, so a palette that
     imported either would pull it into the browser to display a list of names.
     What crosses is the list. */
  const families = getFamilies()

  return (
    <ThemeBuilder
      findable={[
        {
          group: 'Components',
          items: families.map((family) => ({
            alternate: `/helix/sandbox?family=${family.slug}`,
            alternateLabel: 'Open in the sandbox',
            href: `/helix/components/${family.slug}`,
            label: family.label,
          })),
        },
        {
          group: 'Writing',
          items: INSIGHTS.map((insight) => ({
            href: `/insights/${insight.slug}`,
            label: insight.title,
          })),
        },
      ]}
    />
  )
}
