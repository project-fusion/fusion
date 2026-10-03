import { pageMetadata } from '@/utils/metadata/metadata'
import {
  deriveOr,
  intentFrom,
  type Params,
  SCOPE,
  settingsFrom,
} from '@/utils/theme-defaults/theme-defaults'
import { getFamilies } from '../../../../content/catalog/catalog'
import { GOOGLE_FACES } from '../../../../content/faces/faces.generated'
import { INSIGHTS } from '../../../../content/insights'
import { serverTheme } from '../../../../utils/theme-engine/theme-engine.server'
import { ThemeBuilder } from './builder'
import { THEMED_CONTEXTS, THEMED_LAYOUTS, THEMED_MARKUP } from './themed-page-markup.generated'

/**
 * The theme builder.
 *
 * **The engine's first real consumer**, which is most of why it exists here
 * rather than as a demo somewhere. An API nobody has used is an API nobody has
 * tested, and the Rust port in #142 would freeze whatever shape
 * `@fusion.dev/helix-theme` happened to have.
 *
 * A tool rather than a page in `(site)`, for the reason `SandboxLayout` already
 * gives: every row of chrome around it is a row taken from the thing being
 * examined.
 */
export const metadata = pageMetadata({
  description: 'Describe a brand. Get a palette every pair of which has been measured.',
  path: '/helix/theme',
  title: 'Theme builder',
})

export default async function ThemePage({ searchParams }: { searchParams: Promise<Params> }) {
  /* **The theme somebody sent, derived here rather than after hydration.**

     A reader who has built a palette wants to come back to it and to send it to
     somebody, and the whole of a theme is nineteen values, so the link can
     simply carry them. What it carries is only the departures from what ships,
     so a reader who changed a brand and a scheme sends two parameters and a
     reader who changed nothing sends none.

     **The query and not the fragment**, because a fragment never reaches a
     server: a shared link would arrive carrying the default palette in its HTML
     and jump to the sent one a moment after hydration, which is the exact
     first-paint property `serverTheme` was written to hold. `settingsFrom`
     validates every value on the way in, each falling back on its own, because
     these arrive from whatever was in somebody's address bar and two of them
     (the brand and the three faces) are interpolated into a stylesheet.

     Reading `searchParams` makes this route dynamic. That costs a `derive` per
     request and not a WebAssembly instantiation, `serverTheme` holding the
     engine for the life of the process. */
  const params = await searchParams
  const settings = settingsFrom(params, GOOGLE_FACES)
  /* Validated here rather than in the builder, so an unknown axis value never
     reaches a component that would have to decide what to do with it. Both fall
     back to their list's first entry, which is each axis's resting one. */
  const chosen = (
    offered: readonly { value: string }[],
    raw: string | string[] | undefined,
  ): string | undefined =>
    typeof raw === 'string' && offered.some((entry) => entry.value === raw) ? raw : undefined
  /* Built here, on a server, and handed down, the way the sandbox page and the
     site layout both already do it: the catalog reads the manifest off disk
     and the insight registry is the whole of the writing, so a palette that
     imported either would pull it into the browser to display a list of names.
     What crosses is the list. */
  const families = getFamilies()

  /* **The preview's markup is a generated string, not a DOM read-back.**

     Rendering `<ThemedPage />` into a hidden holder and reading its `innerHTML`
     is the obvious alternative, and it works exactly once, on a cold load. On a
     client navigation it silently loses half the page: React assigns to an
     element's *property* when the property exists, and on a soft navigation the
     Helix definitions are already registered, so `name` and `command` are set on
     accessors rather than written as attributes. Lit reflects neither, so
     `innerHTML` cannot see them, and the hero's trigger reaches the frame as
     `<helix-button commandfor="walkthrough">` with no `command` at all.

     A string cannot have that problem, because there is no DOM in between: JSX
     props become attributes and the frame receives what was written. It is also
     one fewer copy of the page in the document, the holder having rendered the
     whole thing a second time to be read and thrown away.

     Rendered by `turbo run themed-page` rather than here, because a server
     component resolves under the `react-server` condition and `react-dom/server`
     is not exported there: Next refuses the import outright. `turbo run themed-page -- --check`
     holds the strings and the JSX to each other.

     **Sixteen of them, on two axes of four.** A context is whose page it is,
     because a reader theming a magazine should not be reading about berth
     windows to find out what their headings will look like; a layout is how
     much page there is, because a palette that holds on a dense dashboard can
     be washed out on a landing page with four things on it. The two are
     independent, which is the area rules' own test for whether something is one
     question or two.

     The lists carry their own labels for the same reason they carry their own
     markup: the builder is a client component, and importing the layouts to
     read four labels would send four unrendered pages to the browser. */

  /* **The default theme, derived before anything renders.** The engine is
     WebAssembly, so nothing derives a palette by accident and the server has to
     do it deliberately or the builder's first paint has none. The intent is
     whatever the link
     described, defaulting to the one in `defaults`, which is also what the
     builder's sliders start at, so the palette that arrives in the HTML is the
     palette the browser would derive a moment later rather than a stand-in for
     it. */
  const { theme } = deriveOr(await serverTheme(), intentFrom(settings), [SCOPE, ':root'])

  return (
    <ThemeBuilder
      contexts={THEMED_CONTEXTS}
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
      initialContext={chosen(THEMED_CONTEXTS, params.preview)}
      initialLayout={chosen(THEMED_LAYOUTS, params.layout)}
      initialSettings={settings}
      initialTheme={theme}
      layouts={THEMED_LAYOUTS}
      markup={THEMED_MARKUP}
    />
  )
}
