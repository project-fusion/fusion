import { getFamilies } from '../../../../content/catalog/catalog'
import { INSIGHTS } from '../../../../content/insights'
import { serverTheme } from '../../../../utils/theme-engine/theme-engine.server'
import { ThemeBuilder } from './builder'
import { INITIAL, intentFrom, SCOPE } from './defaults'
import { THEMED_PAGE_MARKUP } from './themed-page-markup.generated'

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

export default async function ThemePage() {
  /* Built here, on a server, and handed down, the way the sandbox page and the
     site layout both already do it: the catalog reads the manifest off disk
     and the insight registry is the whole of the writing, so a palette that
     imported either would pull it into the browser to display a list of names.
     What crosses is the list. */
  const families = getFamilies()

  /* **The preview's markup is a generated string, not a DOM read-back.**

     The builder used to render `<ThemedPage />` into a hidden holder and take
     its `innerHTML`. That works exactly once, on a cold load, and silently
     loses half the page on a client navigation: React assigns to an element's
     *property* when the property exists, and on a soft navigation the Helix
     definitions are already registered, so `name` and `command` were set on
     accessors rather than written as attributes. Lit reflects neither, so
     `innerHTML` could not see them. Measured on the same button: a cold load
     serialised `arrow-right` twice and a navigation zero times, and the hero's
     trigger arrived in the frame as `<helix-button commandfor="walkthrough">`
     with no `command` at all, which is a missing arrow and a dialog that does
     nothing.

     A string cannot have that problem, because there is no DOM in between: JSX
     props become attributes and the frame receives what was written. It is also
     one fewer copy of the page in the document, the holder having rendered the
     whole thing a second time to be read and thrown away.

     Rendered by `bun run themed-page` rather than here, because a server
     component resolves under the `react-server` condition and `react-dom/server`
     is not exported there: Next refuses the import outright. `check:themed-page`
     holds the string and the JSX to each other. */

  /* **The default theme, derived before anything renders.** The engine used to
     be synchronous JavaScript and did this without being asked, which is what
     put a real palette in the builder's first paint; it is WebAssembly now, so
     the server has to do it deliberately. The intent is the one in `defaults`,
     which is also what the builder's sliders start at, so the palette that
     arrives in the HTML is the palette the browser would derive a moment later
     rather than a stand-in for it. */
  const theme = (await serverTheme()).derive(intentFrom(INITIAL), [SCOPE, ':root'])

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
      initialTheme={theme}
      pageMarkup={THEMED_PAGE_MARKUP}
    />
  )
}
