/**
 * Megamenu's derivations: whether a destination in its panel is the page
 * the reader is on, whether the window is narrower than its `band-below`,
 * and whether a group of its destinations is named, as the web elements
 * work them out.
 */
import { environment } from '../../capabilities/environment/index.js'
import type { Derivation, DerivationProps } from '../derivations/derivations.js'
import { holdsRows } from '../drilldown/drilldown-derivations.js'

/** The width below which a panel is a band whatever its layout, as the web's `band-below` defaults. */
export const MEGAMENU_BAND_BELOW = 640

/**
 * Whether content passed into a panel holds a destination marked as the
 * page, at any depth: an item whose `current` is `page`, or an element whose
 * `aria-current` is, as the web element reads `aria-current="page"` and an
 * item's `current="page"` among the panel's links.
 */
export const holdsPage = (content: unknown): boolean => {
  if (Array.isArray(content)) {
    return content.some(holdsPage)
  }
  if (typeof content !== 'object' || content === null) {
    return false
  }
  const props = (content as { readonly props?: DerivationProps }).props
  if (props === undefined) {
    return false
  }
  return props.current === 'page' || props['aria-current'] === 'page' || holdsPage(props.children)
}

/**
 * `megamenu-current`: `page` while a destination in the panel is the page
 * the reader is on, which marks the megamenu current in a navigation, and
 * nothing otherwise.
 */
export const megamenuCurrent: Derivation = (props) => (holdsPage(props.default) ? 'page' : '')

/**
 * `megamenu-narrow`: whether the window is narrower than `band-below`, in
 * points on a phone as in pixels on the web. At zero or below it never is.
 */
export const megamenuNarrow: Derivation = (props) => {
  const given = Number(props['band-below'] ?? MEGAMENU_BAND_BELOW)
  const below = Number.isFinite(given) ? given : MEGAMENU_BAND_BELOW
  return below > 0 && environment().read().window.width < below
}

/**
 * `megamenu-group-named`: whether a group of destinations has a heading:
 * words in its `label`, or content passed into it, which a phone passes in
 * the same prop.
 */
export const megamenuGroupNamed: Derivation = (props) =>
  typeof props.label === 'string' ? props.label !== '' : holdsRows(props.label)
