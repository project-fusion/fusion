/**
 * Display names for components.
 *
 * The product is Helix, so every component being called "HelixCard" inside the
 * Helix site is noise: it repeats the one thing the reader already knows on
 * every row of the sidebar. The tag keeps its prefix, because that is a real
 * identifier a consumer types.
 */

/** `app-header` becomes `App Header`. */
export const startCase = (slug: string): string =>
  slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

/** `helix-app-header` becomes `App Header`, `helix-base-card` becomes `Card`. */
export const displayName = (tagName: string): string =>
  startCase(tagName.replace(/^helix-(?:base-)?/, ''))

/** Which tier a tag belongs to, read from the prefix rather than the manifest. */
export const tierOf = (tagName: string): 'headless' | 'styled' =>
  tagName.startsWith('helix-base-') ? 'headless' : 'styled'
