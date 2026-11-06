/**
 * Paths of an app's routes, as a router names them, and how a destination
 * stands against the route showing. The router glue in `@fusion.dev/helix`
 * reads them on the web and on a phone, so both mark the same destination
 * current and build the same trail.
 *
 * A path starts with `/` and names no base URL: `/projects/website` is the
 * route, whatever address the app is served under.
 */

/** What `current` says of a destination: the page showing, or a page above it. */
export type RouteCurrent = 'page' | 'true'

/** One crumb of a trail: the path it links to, its words, and whether it is the page showing. */
export interface RouteCrumb {
  readonly current: boolean
  readonly label: string
  readonly path: string
}

/**
 * A path with one leading `/` and no trailing one, and without its query and
 * fragment, so `/projects/` and `/projects?sort=due` compare as `/projects`.
 */
export const routeOf = (path: string): string => {
  const bare = path.split(/[?#]/)[0] ?? ''
  const trimmed = bare.replace(/\/+$/, '')
  return trimmed.startsWith('/') ? trimmed || '/' : `/${trimmed}`
}

/**
 * How `destination` stands against the route `path`: `page` where it is that
 * route, `true` where it is a route above it, as `/projects` is above
 * `/projects/website`, and nothing otherwise. The root is above every route,
 * so it is current only where it is the route showing.
 */
export const currentOf = (destination: string, path: string): RouteCurrent | undefined => {
  const to = routeOf(destination)
  const here = routeOf(path)
  if (to === here) {
    return 'page'
  }
  return to !== '/' && here.startsWith(`${to}/`) ? 'true' : undefined
}

/**
 * The routes from the root down to `path`, each one segment longer than the
 * last: `/`, `/projects`, `/projects/website` for `/projects/website`.
 */
export const routesTo = (path: string): readonly string[] => {
  const segments = routeOf(path)
    .split('/')
    .filter((segment) => segment !== '')
  return ['/', ...segments.map((_, at) => `/${segments.slice(0, at + 1).join('/')}`)]
}

/**
 * The trail down to `path`: a crumb for each route `label` names, and none
 * for a route it leaves unnamed, with the last crumb the page showing.
 */
export const trailOf = (
  path: string,
  label: (route: string) => string | undefined,
): readonly RouteCrumb[] => {
  const named = routesTo(path).flatMap((route) => {
    const words = label(route)
    return words === undefined ? [] : [{ label: words, path: route }]
  })
  return named.map((crumb, at) => ({ ...crumb, current: at === named.length - 1 }))
}

/**
 * The base URL an app is served under, with one leading `/` and no trailing
 * one, and empty for an app served at the root of its origin.
 */
export const baseOf = (base: string | undefined): string => {
  const trimmed = (base ?? '').replace(/\/+$/, '')
  return trimmed === '' || trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/** The address a route has under the base URL `base`, as a link's `href` names it. */
export const withBase = (base: string | undefined, path: string): string => {
  const root = baseOf(base)
  const route = path.startsWith('/') ? path : `/${path}`
  return root === '' ? route : route === '/' ? `${root}/` : `${root}${route}`
}

/**
 * The route an address names under the base URL `base`, or nothing for an
 * address outside it, which is no route of the app.
 */
export const withoutBase = (base: string | undefined, address: string): string | undefined => {
  const root = baseOf(base)
  if (root === '') {
    return address.startsWith('/') ? address : `/${address}`
  }
  if (address === root) {
    return '/'
  }
  return address.startsWith(`${root}/`) ||
    address.startsWith(`${root}?`) ||
    address.startsWith(`${root}#`)
    ? address.slice(root.length).replace(/^(?=[?#])/, '/')
    : undefined
}
