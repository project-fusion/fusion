import { useHelixRoute } from '@fusion.dev/helix/expo-router'
import { DESTINATIONS } from './routes'

/**
 * The bar over every screen: the app's name, and a destination for each
 * section, the one the route is in marked current. A press on a destination
 * goes through the router, on the web from the link's own anchor. A rule
 * under the bar parts it from the page that scrolls under it.
 */
export function Header() {
  const route = useHelixRoute()
  return (
    <helix-app-header sticky style={{ '--app-header-border-color': 'var(--helix-color-border)' }}>
      <helix-text scale="body-strong" slot="start">
        Helix
      </helix-text>
      <helix-navigation label="Sections">
        {DESTINATIONS.map((destination) => (
          <helix-navigation-item
            current={route.current(destination.route)}
            href={route.href(destination.route)}
            key={destination.route}
          >
            {destination.label}
          </helix-navigation-item>
        ))}
      </helix-navigation>
    </helix-app-header>
  )
}
