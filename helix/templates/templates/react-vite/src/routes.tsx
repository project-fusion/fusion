import { type AnchorHTMLAttributes, useEffect, useState } from 'react'

/* **The whole router, which is a hash and a listener.**

   Three pages need `location.hash` and one event, so the starter leaves the
   router to you. Swap this file for the router you want: the two names it
   exports are Next.js's, so the rest of the app reads the same in either
   template, and nothing else has to change.

   A hash, because the History API wants a server that answers every path with
   the same document, and `vite preview` and wherever you deploy each have to be
   told to. A hash asks nothing of either. */

/** The current path, read from the hash, so the first page is `/`. */
const read = (): string => window.location.hash.slice(1) || '/'

/**
 * A destination, addressed the way the Next.js template addresses one.
 *
 * Everything but `href` goes straight through to the anchor, as `next/link`
 * does, which is why a `data-button` or a `slot` reads the same in both
 * templates. The path is written as a path, and this component adds the hash.
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
