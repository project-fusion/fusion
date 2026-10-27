/* `@fusion.dev/helix/expo-router` on React Native: Helix in an app on Expo
   Router. The web's module, `src/expo-router/expo-router.ts`, exports the same
   names, so a layout or a page that uses them names no platform.

   - `HelixAppRoot` is `HelixRoot`, and opens each Helix link to a path
     through the router.
   - `useHelixRoute` reads the route showing: which destination is current,
     each route's `href`, and the trail of crumbs down to it.

   React Native only: the web's module follows links in the browser. */
import { type OpenLink, openLink, setOpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { currentOf, type RouteCurrent, routeOf, trailOf } from '@fusion.dev/helix-core/route-paths'
import { HelixRoot, type HelixRootProps, useInsideHelixRoot } from '@fusion.dev/helix-native'
import { router, usePathname } from 'expo-router'
import {
  createElement,
  Fragment,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
} from 'react'
import { Linking } from 'react-native'

/** What `HelixAppRoot` takes: `HelixRoot`'s theme and keyboard, and the app. */
export interface HelixAppRootProps extends HelixRootProps {
  readonly children?: ReactNode
}

/** One crumb of the trail `useHelixRoute` builds, ready for a `Breadcrumb`. */
export interface HelixRouteCrumb {
  /** Whether the crumb is the route showing, which a `Breadcrumb` marks `current`. */
  readonly current: boolean
  /** The address the crumb links to, for its `href`. */
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
  /** The address of a route, for a link's `href`. On a phone it is the route itself. */
  readonly href: (route: string) => string
  /** The route showing, as `/projects/website`. */
  readonly path: string
  /**
   * The crumbs from the root down to the route showing, one for each route
   * `label` names, with the last one current.
   */
  readonly trail: (label: (route: string) => string | undefined) => readonly HelixRouteCrumb[]
}

/** Whether an address names a scheme, as `https:` and `mailto:` do. */
const SCHEME = /^[a-z][a-z\d+.-]*:/i

/** Whether a path is a route at the top of the tree, one segment under the root, as `/activity` is. */
const topLevel = (path: string): boolean => /^\/[^/]+$/.test(routeOf(path))

/**
 * Where a press on a Helix link goes in an app on Expo Router: an address
 * with a scheme to the phone's own handler, a path to the router, and
 * anything else, such as `#section`, to the open-link that was set before.
 *
 * **A route above the one showing goes back to it**, as a crumb does with
 * the phone's own back, where the router holds it, and replaces the route
 * showing where it does not. **A route at the top of the tree does the same**,
 * as a header's destination, such as `/activity`, does: it takes the place of
 * the route showing, so moving between an app's sections adds nothing to go
 * back through. Any other route is pushed. A press on the route showing goes
 * nowhere.
 */
const routerLinks = (before: OpenLink, here: () => string): OpenLink => ({
  open: (destination) => {
    if (SCHEME.test(destination)) {
      Linking.openURL(destination).catch(() => undefined)
      return
    }
    if (!destination.startsWith('/')) {
      before.open(destination)
      return
    }
    const stands = currentOf(destination, here())
    if (stands === 'page') {
      return
    }
    if (stands === 'true' || topLevel(destination)) {
      router.dismissTo(destination)
    } else {
      router.navigate(destination)
    }
  },
})

/**
 * Opens each Helix link to a path through the router while it is drawn, and
 * gives back the open-link that was set before once it is gone.
 */
function RouterLinks({ children }: { readonly children?: ReactNode }): ReactElement {
  const path = usePathname()
  const here = useRef(path)
  here.current = path
  useEffect(() => {
    const before = openLink()
    setOpenLink(routerLinks(before, () => here.current))
    return () => setOpenLink(before)
  }, [])
  return createElement(Fragment, null, children)
}

/**
 * The root of an app on Expo Router, for its root layout: `HelixRoot`, with
 * each Helix link to a path opened through the router. A press on a
 * Navigation Item, a Breadcrumb, a Tab, or a Menu Item with an `href` sends
 * its `onBeforeSelect` first, and a handler that refuses it keeps the router
 * where it is.
 *
 * **Inside another `HelixRoot` it draws none of its own**, as when an app
 * draws a router's tree inside a screen of its own, and its props go unused.
 */
export function HelixAppRoot({ children, ...root }: HelixAppRootProps): ReactElement {
  const inside = useInsideHelixRoot()
  const links = createElement(RouterLinks, null, children)
  return inside ? links : createElement(HelixRoot, root, links)
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
    href: (route) => route,
    path,
    trail: (label) => trailOf(path, label).map((crumb) => ({ ...crumb, href: crumb.path })),
  }
}
