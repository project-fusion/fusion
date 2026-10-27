import { useHelixRoute } from '@fusion.dev/helix/expo-router'
import { DESTINATIONS } from './routes'

/**
 * The bar over every screen: the app's name, and a link to each destination,
 * with the one showing marked current. A press on a link goes through the
 * router on both platforms. The bar centers its row in the page's 56rem
 * column, so the name sits over the page's edge.
 */
export function Header() {
  const route = useHelixRoute()
  return (
    <helix-app-header
      sticky
      style={{
        '--app-header-border-color': 'var(--helix-color-border)',
        '--app-header-max-inline-size': '56rem',
      }}
    >
      <helix-text slot="start" variant="body-strong">
        __PROJECT_NAME__
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
