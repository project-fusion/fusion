/*
 * The generated Breadcrumbs folding a long trail under `maxItems`: the first
 * crumb and the last `maxItems` less one stay, and the first draws a button
 * named by `expandLabel` with the count it folded, which opens a menu of the
 * crumbs folded away, each a link opened through the app's open-link, which
 * sends the first crumb's `before-select` first and its `select` once that
 * stands. The
 * layer host draws the menu. Floating UI's hook stands in for the one that
 * measures views on a device. `test:native` writes the components beside
 * this file.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { setOpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { type FakeOpenLink, fakeOpenLink } from '@fusion.dev/helix-core/capabilities/open-link/fake'
import { clearWords, registerWords } from '@fusion.dev/helix-core/words'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { LayerHostView } from '../root/layers'
import { light } from '../theme/light.generated'
import { ThemeProvider } from '../theme/theme'
import { HelixBreadcrumb, HelixBreadcrumbs } from './breadcrumbs/index.native'
import './menu/index.native'

jest.mock('@floating-ui/react-native', () => {
  const actual = jest.requireActual<Record<string, unknown>>('@floating-ui/react-native')
  return {
    ...actual,
    useFloating: () => ({
      middlewareData: {},
      placement: 'bottom-start',
      refs: {
        reference: { current: null },
        setFloating: () => undefined,
        setReference: () => undefined,
      },
      update: () => undefined,
      x: 20,
      y: 20,
    }),
  }
})

let drawn: Awaited<ReturnType<typeof render>> | undefined
let opened: FakeOpenLink = fakeOpenLink()

const app = (content: ReactNode) => (
  <ThemeProvider tokens={light}>
    <LayerHostView>
      <Text>Page</Text>
      {content}
    </LayerHostView>
  </ThemeProvider>
)

/** A frame or two, and the motion of a layer run to its end. */
const frames = () => act(() => new Promise<void>((done) => setTimeout(done, 300)))

const draw = async (content: ReactNode) => {
  drawn = await render(app(content))
  await frames()
}

/** Every view drawn whose props pass `test`. */
const viewsWhere = (test: (props: Readonly<Record<string, unknown>>) => boolean) =>
  drawn?.container.queryAll((node) => test(node.props)) ?? []

const roleOf = (props: Readonly<Record<string, unknown>>) => props.role ?? props.accessibilityRole

/** Whether words are drawn anywhere. */
const shows = (words: string) => viewsWhere((props) => props.children === words).length > 0

/** The fold's button, named by the words given. */
const fold = (name: string) =>
  viewsWhere((props) => props.accessibilityLabel === name && roleOf(props) === 'button')[0]

/** The menu's row whose words are `words`. */
const row = (words: string) =>
  viewsWhere((props) => roleOf(props) === 'menuitem').find(
    (node) => node.queryAll((inner) => inner.props.children === words).length > 0,
  )

/** A trail of five crumbs, the last the current page, the first given `first`. */
const trail = (
  props: Readonly<Record<string, unknown>> = {},
  first: Readonly<Record<string, unknown>> = {},
) => (
  <HelixBreadcrumbs maxItems={3} {...props}>
    <HelixBreadcrumb href="/" {...first}>
      Home
    </HelixBreadcrumb>
    <HelixBreadcrumb href="/components">Components</HelixBreadcrumb>
    <HelixBreadcrumb href="/components/inputs">Inputs</HelixBreadcrumb>
    <HelixBreadcrumb href="/components/inputs/forms">Forms</HelixBreadcrumb>
    <HelixBreadcrumb current>Validation</HelixBreadcrumb>
  </HelixBreadcrumbs>
)

beforeEach(() => {
  setFocus(fakeFocus<unknown>())
  setKeys(fakeKeys<unknown>())
  opened = fakeOpenLink()
  setOpenLink(opened)
})

afterEach(() => {
  clearWords()
})

describe('a trail that folds', () => {
  test('keeps the first crumb and the last two, and the first draws the fold named by its count', async () => {
    await draw(trail())
    expect(shows('Home')).toBe(true)
    expect(shows('Forms')).toBe(true)
    expect(shows('Validation')).toBe(true)
    expect(shows('Components')).toBe(false)
    expect(shows('Inputs')).toBe(false)
    expect(fold('Show 2 more')).toBeDefined()
  })

  test('a press on the fold opens a menu of the crumbs folded, and a row opens its link', async () => {
    await draw(trail())
    await act(async () => {
      fireEvent.press(fold('Show 2 more') as never)
    })
    await frames()
    expect(row('Components')).toBeDefined()
    expect(row('Inputs')).toBeDefined()
    await act(async () => {
      fireEvent.press(row('Inputs') as never)
    })
    await frames()
    expect(opened.opened).toEqual(['/components/inputs'])
    expect(row('Inputs')).toBeUndefined()
  })

  test('a row asks with the first crumb’s before-select with its link, says select, and a refused one opens nothing', async () => {
    const heard: unknown[] = []
    const choose = async (refuse: boolean) => {
      await draw(
        trail(
          {},
          {
            onBeforeSelect: (event: { detail: { value: unknown }; preventDefault: () => void }) => {
              heard.push(event.detail.value)
              if (refuse) {
                event.preventDefault()
              }
            },
            onSelect: (event: { detail: { value: unknown } }) => {
              heard.push(`select ${event.detail.value}`)
            },
          },
        ),
      )
      await act(async () => {
        fireEvent.press(fold('Show 2 more') as never)
      })
      await frames()
      await act(async () => {
        fireEvent.press(row('Components') as never)
      })
      await frames()
    }
    await choose(false)
    expect(heard).toEqual(['/components', 'select /components'])
    expect(opened.opened).toEqual(['/components'])
    await choose(true)
    expect(heard).toEqual(['/components', 'select /components', '/components'])
    expect(opened.opened).toEqual(['/components'])
  })

  test('draws the trail’s slash before the fold under separator="slash"', async () => {
    await draw(trail({ separator: 'slash' }))
    /* Each crumb's, the first one's put away, and the fold's after Home. */
    const words = viewsWhere((props) => typeof props.children === 'string').map(
      (one) => one.props.children,
    )
    expect(words).toEqual(['Page', '/', 'Home', '/', '/', 'Forms', '/', 'Validation'])
  })

  test('names the fold in the words an app registers, and folds nothing that fits', async () => {
    registerWords('en', { 'helix-breadcrumbs': { expandLabel: '{count} hidden steps' } })
    await draw(trail())
    expect(fold('2 hidden steps')).toBeDefined()
    clearWords()
    await draw(trail({ expandLabel: '{count, plural, one {# more step} other {# more steps}}' }))
    expect(fold('2 more steps')).toBeDefined()
    await draw(trail({ maxItems: 5 }))
    expect(shows('Components')).toBe(true)
    expect(viewsWhere((props) => roleOf(props) === 'button')).toHaveLength(0)
  })
})
