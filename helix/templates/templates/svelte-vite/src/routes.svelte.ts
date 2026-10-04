/* **The whole router, which is a hash and a listener.**

   A starter should not pick your router for you, and three pages need
   `location.hash` and one event. Swap this file for the router you want.

   A hash, because the History API wants a server that answers every path with
   the same document, and `vite preview` and wherever you deploy each have to be
   told to. A hash asks nothing of either. Each link in the app is a plain anchor
   to `#/` and a path. */

/** Where the reader is, as a path, so the first page is `/`. */
const read = (): string => window.location.hash.slice(1) || '/'

/** The current path, kept current as the hash changes. */
export const route = $state({ path: read() })

window.addEventListener('hashchange', () => {
  route.path = read()
})
