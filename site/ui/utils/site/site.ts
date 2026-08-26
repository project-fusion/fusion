/**
 * Where this site lives, once.
 *
 * It was three copies, in `robots.ts`, `sitemap.ts` and the `llms.txt` route,
 * which is three chances for a move to be half made. Nothing here is
 * environment-dependent on purpose: a sitemap and a `.md` link are statements
 * about the published address, so they say the published address even when a
 * build is running on somebody's laptop.
 */
export const SITE = 'https://fusion.dev'

/**
 * The public contact address, once, and the `mailto:` built from it.
 *
 * It was a literal in six places across three files. The contact page alone
 * held it three times, as the `href`, as the text inside that link, and as the
 * value a copy control puts on the clipboard, so what a reader copies could
 * drift from what the link opens and nothing would catch it.
 *
 * 269 found this address refusing every sender outside the domain and 283
 * found mail to it not arriving at all, both of which are faults in the one
 * address the site publishes. A second spelling of it is a third way for the
 * same thing to be wrong, and the only one that is ours to prevent.
 */
export const EMAIL = 'hello@fusion.dev'

/** The contact address as a link target. */
export const MAILTO = `mailto:${EMAIL}`

/** An absolute URL for a path this site serves. */
export const absolute = (path: string): string => `${SITE}${path === '/' ? '' : path}`
