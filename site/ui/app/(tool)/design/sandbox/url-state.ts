/**
 * The sandbox's state as a query string.
 *
 * A link to the sandbox should arrive showing what the person who sent it was
 * looking at: the same example, in the same language, laid out the same way,
 * with the same panes open. Everything that the toolbar and the settings menu
 * can change lives here, so sharing is copying the address bar and nothing has
 * to be re-chosen at the other end.
 *
 * **Defaults are absent, never spelled out.** A sandbox opened and shared
 * without touching anything produces `?e=accordion.preview`, not six parameters
 * saying "as it comes". That keeps the common link short enough to paste into a
 * message, and it makes the query legible: what is in it is what was changed.
 *
 * **Keys are one letter where the value says what it is.** `l=centered` needs
 * no help; `hide=panel,status` does, so that one is a word. The example is `e`
 * and joins its two parts with a dot, `e=accordion.preview`, because they are
 * one address rather than two settings and a reader should be able to edit it
 * by hand.
 *
 * The site's own colour mode is deliberately not here. It is a preference about
 * how someone reads, held in `localStorage` and applying to every page, and
 * putting it in a shared link would mean handing your eyesight to whoever opens
 * it. The preview's colour mode is here, because that is a property of the
 * example being shown rather than of the person looking.
 */

/** How the preview lays the example out. */
export type Layout = 'padded' | 'centered' | 'fullscreen'

/** Which way the preview reads. */
export type Direction = 'ltr' | 'rtl'

/** Which file the editor is showing. */
export type Syntax = 'html' | 'tsx'

/** A region of the sandbox that can be turned off. */
export type Section = 'editor' | 'panel' | 'status'

export type SandboxUrlState = {
  /** Colour mode forced on the preview, or null to follow the page. */
  colorMode: 'dark' | 'light' | null
  /** Which way the preview reads. */
  direction: Direction
  /** The example's slug, or null when the address names only a family. */
  example: string | null
  /** The family's slug. */
  family: string | null
  /** Regions that are turned off. */
  hidden: Section[]
  /** How the preview lays the example out. */
  layout: Layout
  /** Which file the editor is showing. */
  syntax: Syntax
}

/** What the sandbox looks like before anyone has changed anything. */
export const DEFAULTS: SandboxUrlState = {
  colorMode: null,
  direction: 'ltr',
  example: null,
  family: null,
  hidden: [],
  layout: 'padded',
  syntax: 'html',
}

const LAYOUTS: Layout[] = ['padded', 'centered', 'fullscreen']
const DIRECTIONS: Direction[] = ['ltr', 'rtl']
const SYNTAXES: Syntax[] = ['html', 'tsx']
const SECTIONS: Section[] = ['editor', 'panel', 'status']

/**
 * One of a known set, or the default.
 *
 * Unknown values are dropped rather than carried, because everything
 * downstream selects on these: a `layout` of whatever was in the address would
 * match no rule and the preview would render with no layout at all, which looks
 * like a broken page rather than like a bad link.
 */
const oneOf = <T extends string>(raw: string | null, allowed: T[], fallback: T): T =>
  allowed.includes(raw as T) ? (raw as T) : fallback

/** Reads the state a query string carries, filling in whatever it leaves out. */
export const readUrlState = (search: string): SandboxUrlState => {
  const params = new URLSearchParams(search)

  // `e=family.example`, and a bare `e=family` is allowed: it names a component
  // without insisting on which of its examples, which is what a link from a
  // reference page wants to say.
  const address = params.get('e')
  const [family, example] = address ? address.split('.') : []

  const hidden = (params.get('hide') ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part): part is Section => SECTIONS.includes(part as Section))

  return {
    colorMode: oneOf(params.get('c'), ['dark', 'light'] as const, null as never) || null,
    direction: oneOf(params.get('d'), DIRECTIONS, DEFAULTS.direction),
    example: example || null,
    family: family || null,
    hidden,
    layout: oneOf(params.get('l'), LAYOUTS, DEFAULTS.layout),
    syntax: oneOf(params.get('x'), SYNTAXES, DEFAULTS.syntax),
  }
}

/**
 * The query string for a state, with everything left at its default omitted.
 *
 * Ordered rather than left to insertion, so the same state always produces the
 * same string: a URL that reshuffles itself as settings are touched looks like
 * it changed when it did not, and two links to the same thing should compare
 * equal.
 */
export const writeUrlState = (state: SandboxUrlState): string => {
  const params = new URLSearchParams()

  if (state.family) {
    params.set('e', state.example ? `${state.family}.${state.example}` : state.family)
  }
  if (state.syntax !== DEFAULTS.syntax) {
    params.set('x', state.syntax)
  }
  if (state.layout !== DEFAULTS.layout) {
    params.set('l', state.layout)
  }
  if (state.direction !== DEFAULTS.direction) {
    params.set('d', state.direction)
  }
  if (state.colorMode) {
    params.set('c', state.colorMode)
  }
  if (state.hidden.length > 0) {
    // In the order the regions appear, not the order they were switched off.
    params.set('hide', SECTIONS.filter((section) => state.hidden.includes(section)).join(','))
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}
