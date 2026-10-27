import { HelixBreadcrumb, HelixBreadcrumbs } from '@fusion.dev/helix/breadcrumbs'
import { HelixAppRoot, useHelixRoute } from '@fusion.dev/helix/expo-router'
import { HelixNavigation, HelixNavigationItem } from '@fusion.dev/helix/navigation'
import { describe, expect, jest, test } from '@jest/globals'
import { Slot, Stack } from 'expo-router'
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library'
import { Linking, Text } from 'react-native'

/* `@fusion.dev/helix/expo-router` on a phone: a press on a Helix link goes
   through the router, a refused request keeps the router where it is, and
   the route marks the destinations and builds the trail. */

let refuse = false

function Destinations() {
  const route = useHelixRoute()
  return (
    <HelixNavigation label="Sections">
      {['/a', '/b', '/b/c'].map((path) => (
        <HelixNavigationItem
          current={route.current(path)}
          href={route.href(path)}
          key={path}
          onBeforeSelect={(event) => {
            if (refuse) {
              event.preventDefault()
            }
          }}
        >
          {`To ${path}`}
        </HelixNavigationItem>
      ))}
    </HelixNavigation>
  )
}

function Trail() {
  const route = useHelixRoute()
  const crumbs = route.trail((path) => (path === '/' ? undefined : `Crumb ${path}`))
  return (
    <HelixBreadcrumbs label="Trail">
      {crumbs.map((crumb) => (
        <HelixBreadcrumb
          current={crumb.current}
          {...(crumb.current ? {} : { href: crumb.href })}
          key={crumb.path}
        >
          {crumb.label}
        </HelixBreadcrumb>
      ))}
    </HelixBreadcrumbs>
  )
}

const Page = ({ name }: { readonly name: string }) => (
  <>
    <Destinations />
    <Trail />
    <Text>{`Page ${name}`}</Text>
  </>
)

const Layout = () => (
  <HelixAppRoot>
    <Slot />
  </HelixAppRoot>
)

const routes = {
  _layout: Layout,
  a: () => <Page name="a" />,
  'b/c': () => <Page name="c" />,
  'b/index': () => <Page name="b" />,
}

const press = async (words: string) => {
  await act(async () => {
    fireEvent.press(screen.getByText(words))
  })
}

describe('Helix on Expo Router', () => {
  test('a press on a destination goes through the router, and the route marks it current', async () => {
    refuse = false
    const app = await renderRouter(routes, { initialUrl: '/a' })
    await press('To /b')
    expect(app.getPathname()).toBe('/b')
    expect(screen.getByText('Page b')).toBeOnTheScreen()
    expect(screen.getByRole('link', { name: /To \/b$/ })).toHaveAccessibilityValue({
      text: 'Current page',
    })
    await press('To /b/c')
    expect(app.getPathname()).toBe('/b/c')
    /* A route above the page showing is current too, as its section. */
    expect(screen.getByRole('link', { name: /To \/b$/ })).toHaveAccessibilityValue({
      text: 'Current',
    })
  })

  test('a refused request keeps the router where it is', async () => {
    refuse = true
    const app = await renderRouter(routes, { initialUrl: '/a' })
    await press('To /b')
    expect(app.getPathname()).toBe('/a')
    expect(screen.getByText('Page a')).toBeOnTheScreen()
    refuse = false
  })

  test('the trail names each route down to the page, and a crumb goes back up', async () => {
    refuse = false
    const app = await renderRouter(routes, { initialUrl: '/b/c' })
    expect(screen.getByText('Crumb /b')).toBeOnTheScreen()
    expect(screen.getByText('Crumb /b/c')).toBeOnTheScreen()
    await press('Crumb /b')
    expect(app.getPathname()).toBe('/b')
  })

  test('a route at the top of the tree takes the place of the one showing, and a route below it is pushed', async () => {
    refuse = false
    const app = await renderRouter(
      {
        ...routes,
        _layout: () => (
          <HelixAppRoot>
            <Stack />
          </HelixAppRoot>
        ),
      },
      { initialUrl: '/a' },
    )
    /* The pages of the stack under the root, as the phone's back goes through them. */
    const depth = () => app.getRouterState()?.routes[0]?.state?.routes.length
    await press('To /b')
    expect(app.getPathname()).toBe('/b')
    expect(depth()).toBe(1)
    await press('To /b/c')
    expect(app.getPathname()).toBe('/b/c')
    expect(depth()).toBe(2)
    await press('To /a')
    expect(app.getPathname()).toBe('/a')
    expect(depth()).toBe(2)
  })

  test('an address with a scheme opens with the phone’s own handler', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    await renderRouter(
      {
        _layout: Layout,
        index: () => (
          <HelixNavigation label="Elsewhere">
            <HelixNavigationItem href="https://fusion.dev">Fusion</HelixNavigationItem>
          </HelixNavigation>
        ),
      },
      { initialUrl: '/' },
    )
    await press('Fusion')
    expect(open).toHaveBeenCalledWith('https://fusion.dev')
    open.mockRestore()
  })
})
