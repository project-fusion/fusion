/**
 * Which presses on a link the router follows on the web, read from the press
 * and the page's address.
 */
import { withoutBase } from '@fusion.dev/helix-core/route-paths'

/** The anchor a press landed on, inside a shadow root too, where it is one. */
const anchorOf = (event: MouseEvent): HTMLAnchorElement | undefined =>
  event.composedPath().find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement)

/**
 * The route a press on a link goes to, where the router should follow it: a
 * plain press with the main button, on a link to this window and this
 * origin, inside the base URL, and to another page than the one showing.
 * Anything else is the browser's: a new tab, a download, another site, or a
 * fragment of the page showing.
 */
export const routedBy = (
  event: MouseEvent,
  at: Location,
  base: string | undefined,
): string | undefined => {
  if (event.defaultPrevented || event.button !== 0) {
    return undefined
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return undefined
  }
  const anchor = anchorOf(event)
  if (anchor === undefined || anchor.hasAttribute('download') || anchor.href === '') {
    return undefined
  }
  if (anchor.target !== '' && anchor.target !== '_self') {
    return undefined
  }
  const url = new URL(anchor.href, at.href)
  if (url.origin !== at.origin) {
    return undefined
  }
  if (url.pathname === at.pathname && url.search === at.search && url.hash !== '') {
    return undefined
  }
  return withoutBase(base, `${url.pathname}${url.search}${url.hash}`)
}
