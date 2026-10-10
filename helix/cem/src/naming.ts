/**
 * Display names for components.
 *
 * The product is Helix, so every component being called "HelixCard" inside the
 * Helix site is noise: it repeats the one thing the reader already knows on
 * every row of the sidebar. The tag keeps its prefix, because that is a real
 * identifier a consumer types.
 */

/**
 * Words a slug spells in lower case that are read as letters.
 *
 * Capitalizing the first letter of `qr` gives `Qr`, which is a word nobody says.
 * A slug is lower case because a URL is, and the initialism it came from is
 * lost by the time this sees it, so it has to be put back by name. Kept small
 * and explicit rather than guessed at from length: `ui`, `id` and `api` are
 * initialisms and `is`, `on` and `to` are not.
 */
const INITIALISMS = new Set(['api', 'css', 'html', 'id', 'qr', 'ui', 'url'])

/** `app-header` becomes `App Header`, and `qr-code` becomes `QR Code`. */
export const startCase = (slug: string): string =>
  slug
    .split('-')
    .filter(Boolean)
    .map((word) =>
      INITIALISMS.has(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')

/** `helix-app-header` becomes `App Header`, `helix-headless-card` becomes `Card`. */
export const displayName = (tagName: string): string =>
  startCase(tagName.replace(/^helix-(?:headless-)?/, ''))

/** Which tier a tag belongs to, read from the prefix rather than the manifest. */
export const tierOf = (tagName: string): 'headless' | 'styled' =>
  tagName.startsWith('helix-headless-') ? 'headless' : 'styled'

/**
 * The family and part a declaration belongs to, from where its file is.
 *
 * Not from the tag name. A tag is a string the family prefix can only be
 * guessed out of: `helix-button-group` is one family and `helix-tab` is a
 * part of another, and nothing in the name says which. The path says both.
 */
export const place = (path: string | undefined): { family: string; part: string } => {
  const [, family = '', part = ''] = /^src\/([^/]+)\/([^/]+)\//.exec(path ?? '') ?? []
  return { family, part }
}

/**
 * The family a declaration belongs to: the one its `@family` names, and the
 * one its folder names where it names none.
 *
 * **Named, for an element another package publishes.** `helix-sandbox-editor`
 * ships in `@fusion.dev/helix-sandbox` and is a part of the Sandbox family,
 * whose root ships in `@fusion.dev/helix`. Read off the folder alone, an element
 * would join a family by sharing a folder name with it.
 */
export const familyOf = (
  declaration: { helix?: { family?: string } },
  path: string | undefined,
): string => declaration.helix?.family ?? place(path).family
