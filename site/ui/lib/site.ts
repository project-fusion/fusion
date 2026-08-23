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

/** An absolute URL for a path this site serves. */
export const absolute = (path: string): string => `${SITE}${path === '/' ? '' : path}`
