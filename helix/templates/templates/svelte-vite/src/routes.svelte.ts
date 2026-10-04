/* **The whole router, which is a hash and a listener.**

   Three pages need `location.hash` and one event, so the starter leaves the
   router to you. Swap this file for the router you want.

   A hash, because the History API wants a server that answers every path with
   the same document, and `vite preview` and wherever you deploy each have to be
   told to. A hash asks nothing of either. Each link in the app is a plain
   anchor to `#/` and a path. */

/** The current path, read from the hash, so the first page is `/`. */
const read = (): string => window.location.hash.slice(1) || '/'

/** The current path, kept current as the hash changes. */
export const route = $state({ path: read() })

window.addEventListener('hashchange', () => {
  route.path = read()
})
