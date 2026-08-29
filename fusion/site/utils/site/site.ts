/**
 * Where this site lives, once.
 *
 * `robots.ts`, `sitemap.ts` and the `llms.txt` route all want it, and a copy
 * apiece is a chance for a move to be half made. Nothing here is
 * environment-dependent on purpose: a sitemap and a `.md` link are statements
 * about the published address, so they say the published address even when a
 * build is running on somebody's laptop.
 */
export const SITE = 'https://fusion.dev'

/**
 * The public contact address, once, and the `mailto:` built from it.
 *
 * The contact page alone needs it three ways, as the `href`, as the text inside
 * that link, and as the value a copy control puts on the clipboard, so a second
 * literal lets what a reader copies drift from what the link opens with nothing
 * to catch it. The one address the site publishes has already been found
 * refusing outside senders (269) and dropping mail entirely (283); a second
 * spelling is the one failure of it that is ours to prevent.
 */
export const EMAIL = 'hello@fusion.dev'

/** The contact address as a link target. */
export const MAILTO = `mailto:${EMAIL}`

/** An absolute URL for a path this site serves. */
export const absolute = (path: string): string => `${SITE}${path === '/' ? '' : path}`
