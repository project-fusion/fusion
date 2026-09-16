import { type ReactNode, useEffect, useState } from 'react'

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

interface LinkProps {
  /** Marks the destination the reader is already on. */
  readonly 'aria-current'?: 'page'
  /** The words. */
  readonly children: ReactNode
  /** A path, written as a path: the hash is this component's business. */
  readonly href: string
}

/** A destination, addressed the way the Next.js template addresses one. */
export function Link({ 'aria-current': current, children, href }: LinkProps) {
  return (
    <a aria-current={current} href={`#${href}`}>
      {children}
    </a>
  )
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
