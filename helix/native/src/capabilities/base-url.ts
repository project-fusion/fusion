/**
 * The address a phone resolves a relative URL against, as a web page resolves
 * one against its own address.
 *
 * **A page has an address and an app does not**, so a source written as
 * `/maps/radar/0/{z}/{x}/{y}.png` loads from the page's own site on the web
 * and from nowhere on a phone. An app that draws sources written for its site
 * sets the site's address once, as it starts: `setBaseUrl('https://example.com')`.
 * Without one, a relative source is left out, since a renderer refuses an
 * address with no host.
 */

let base: string | undefined

/** Sets the address relative URLs resolve against, or clears it with `undefined`. */
export const setBaseUrl = (next: string | undefined): void => {
  base = next
}

/** The address relative URLs resolve against, where the app set one. */
export const baseUrl = (): string | undefined => base

/** A scheme at the start: `https:`, `data:`, `asset:`. */
const SCHEMED = /^[a-z][a-z\d+.-]*:/i

/**
 * `url` resolved against `against`, as a browser resolves an address in a
 * page: whole where it names a scheme, on the base's scheme where it starts
 * `//`, from the base's host where it starts `/`, and beside the base's last
 * path step otherwise. A template's braces are kept as written. `undefined`
 * where it is relative and there is no base.
 */
export const absoluteUrl = (
  url: string,
  against: string | undefined = base,
): string | undefined => {
  if (SCHEMED.test(url)) {
    return url
  }
  const origin = against?.match(/^([a-z][a-z\d+.-]*:)\/\/[^/?#]*/i)
  if (origin === null || origin === undefined) {
    return undefined
  }
  if (url.startsWith('//')) {
    return `${origin[1]}${url}`
  }
  if (url.startsWith('/')) {
    return `${origin[0]}${url}`
  }
  const path = (against as string).slice(origin[0].length).replace(/[?#].*$/, '')
  return `${origin[0]}${path.slice(0, path.lastIndexOf('/') + 1) || '/'}${url}`
}
