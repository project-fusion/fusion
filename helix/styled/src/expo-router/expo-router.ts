/**
 * `@fusion.dev/helix/expo-router` on the web: Helix in an app on Expo Router.
 * The React Native module, `native/expo-router/index.native.ts`, exports the
 * same names, so a layout or a page that uses them names no platform.
 *
 * - `HelixAppRoot` follows each press on a link to a route of the app with
 *   the router, in place of a page load.
 * - `useHelixRoute` reads the route showing: which destination is current,
 *   each route's `href` under the base URL, and the trail of crumbs down to
 *   it.
 *
 * @packageDocumentation
 */
import {
  currentOf,
  type RouteCurrent,
  routeOf,
  trailOf,
  withBase,
} from '@fusion.dev/helix-core/route-paths'
import { router, usePathname } from 'expo-router'
import { createElement, Fragment, type ReactElement, type ReactNode, useEffect } from 'react'
import { routedBy } from './links.js'

/** What `HelixAppRoot` takes on the web: the app. */
export interface HelixAppRootProps {
  readonly children?: ReactNode
}

/** One crumb of the trail `useHelixRoute` builds, ready for a `Breadcrumb`. */
export interface HelixRouteCrumb {
  /** Whether the crumb is the route showing, which a `Breadcrumb` marks `current`. */
  readonly current: boolean
  /** The address the crumb links to, for its `href`, under the base URL. */
  readonly href: string
  /** The crumb's words. */
  readonly label: string
  /** The route the crumb names, as `/projects/website`. */
  readonly path: string
}

/** The route showing, as `useHelixRoute` reads it. */
export interface HelixRoute {
  /**
   * What `current` says of a destination: `page` for the route showing,
   * `true` for a route above it, and nothing otherwise.
   */
  readonly current: (route: string) => RouteCurrent | undefined
  /**
   * The address of a route, for a link's `href`: the route under the base URL
   * the app is exported for, so the link opens the same page in a new tab.
   */
  readonly href: (route: string) => string
  /** The route showing, as `/projects/website`, without the base URL. */
  readonly path: string
  /**
   * The crumbs from the root down to the route showing, one for each route
   * `label` names, with the last one current.
   */
  readonly trail: (label: (route: string) => string | undefined) => readonly HelixRouteCrumb[]
}

/**
 * The base URL the app is exported for, `experiments.baseUrl` in its Expo
 * config, which Expo writes into the bundle as `process.env.EXPO_BASE_URL`.
 */
const base = (): string | undefined => process.env.EXPO_BASE_URL

/**
 * Follows a press on a link with the router, once every handler on the way
 * has heard it. A Helix element that sends `helix-before-select` refuses the
 * press when a handler refuses the request, so a refused press goes nowhere.
 */
const follow = (event: MouseEvent): void => {
  const route = routedBy(event, window.location, base())
  if (route !== undefined) {
    event.preventDefault()
    router.navigate(route as Parameters<typeof router.navigate>[0])
  }
}

/**
 * The root of an app on Expo Router, for its root layout. On the web it
 * listens on the document for presses on links, the anchors Helix draws in
 * its shadow roots among them, and follows each one to a route of the app
 * with the router. A press on a Navigation Item, a Breadcrumb, a Tab, or a
 * Menu Item with an `href` sends its `helix-before-select` first, and a
 * handler that refuses it keeps the router where it is.
 *
 * A press with a modifier key or the middle button, a link with a `target`
 * or `download`, and a link to another origin stay the browser's.
 */
export function HelixAppRoot({ children }: HelixAppRootProps): ReactElement {
  useEffect(() => {
    document.addEventListener('click', follow)
    return () => document.removeEventListener('click', follow)
  }, [])
  return createElement(Fragment, null, children)
}

/**
 * The route showing, and what follows from it for the families that
 * navigate: a Navigation Item's `current`, each link's `href`, and the crumbs
 * of a Breadcrumbs trail.
 */
export function useHelixRoute(): HelixRoute {
  const path = routeOf(usePathname())
  return {
    current: (route) => currentOf(route, path),
    href: (route) => withBase(base(), route),
    path,
    trail: (label) =>
      trailOf(path, label).map((crumb) => ({ ...crumb, href: withBase(base(), crumb.path) })),
  }
}
