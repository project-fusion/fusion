/**
 * The documentation the starter links to.
 *
 * **One module, because links are what rots first in a starter.** A page that
 * composes its own URLs ships a plausible-looking 404 to every project
 * scaffolded from it, and it shows only when the link is followed. Here they
 * are in one list you can open and check, and pointing the starter at a mirror
 * or an internal copy is one edit.
 *
 * Checked October 4, 2026: every entry answers 200.
 */
export const DOCS = {
  /** How the elements are registered and written, which is the first page to read. */
  elements: 'https://fusion.dev/helix/docs/using-the-elements',
  /** What a `<form>` does with these controls, and what it cannot do. */
  forms: 'https://fusion.dev/helix/docs/forms',
  /** Every component, with its API, its parts, and its examples. */
  gallery: 'https://fusion.dev/helix/components',
  /** The light and dark pair, and the attribute that sets which one shows. */
  modes: 'https://fusion.dev/helix/docs/color-modes',
  /** Reaching a component's parts from a page, which `app.css` does once. */
  parts: 'https://fusion.dev/helix/docs/overriding-a-component',
  /** The data view's own page, where the rest of its API is. */
  table: 'https://fusion.dev/helix/components/data-table',
  /** Every token, and what each one is for. */
  tokens: 'https://fusion.dev/helix/docs/tokens',
  /** Vue specifically: the compiler setting, props, and events. */
  vue: 'https://fusion.dev/helix/docs/vue',
} as const
