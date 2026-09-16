import { type AnchorHTMLAttributes, useEffect, useState } from 'react'

/* **The whole router, which is a hash and a listener.**

   A starter should not pick your router for you, and two pages need
   `location.hash` and one event. Swap this file for the router you want: the two
   names it exports are Next.js's, so the rest of the app reads the same in
   either template and nothing else here has to change.

   A hash rather than the History API, because the History API wants a server
   that answers every path with the same document, and `vite preview` and
   whatever you deploy to each have to be told to. A hash asks nothing of
   either. */

/** Where the reader is, as a path, so the overview is `/`. */
const read = (): string => window.location.hash.slice(1) || '/'

/**
 * A destination, addressed the way the Next.js template addresses one.
 *
 * Everything but `href` goes straight through to the anchor, which is what
 * `next/link` does and is why a `data-button` or a `slot` reads the same in both
 * templates. The path is written as a path: the hash is this component's
 * business and nobody else's.
 */
export function Link({ href, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...rest} href={`#${href ?? '/'}`} />
}

/** The current path, and a re-render whenever it changes. */
export function usePathname(): string {
  const [path, setPath] = useState(read)
  useEffect(() => {
    const follow = () => setPath(read())
    window.addEventListener('hashchange', follow)
    return () => window.removeEventListener('hashchange', follow)
  }, [])
  return path
}
