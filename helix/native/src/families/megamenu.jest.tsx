/*
 * The generated Megamenu, drawn from its real intermediate forms in the
 * layer host: a trigger named by its label that a press opens and says is
 * expanded, leaving focus on it, a band of groups under it across the
 * window, Down that takes focus into it, Escape that closes it with focus
 * back on the trigger, a destination that asks with `before-select`, opens its link,
 * and closes it, and the navigation around that is open while it is and
 * whose arrow keys reach its trigger. `test:native` writes the components
 * beside this file.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { type FakeFocus, fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { setOpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { type FakeOpenLink, fakeOpenLink } from '@fusion.dev/helix-core/capabilities/open-link/fake'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, Text } from 'react-native'
import { LayerHostView } from '../root/layers'
import { light } from '../theme/light.generated'
import { ThemeProvider } from '../theme/theme'
import { HelixMegamenu, HelixMegamenuGroup, HelixMegamenuItem } from './megamenu/index.native'
import { HelixNavigation, HelixNavigationItem } from './navigation/index.native'

let drawn: Awaited<ReturnType<typeof render>> | undefined
let keys: FakeKeys<unknown>
let focus: FakeFocus<unknown>
let clock: FakeTimers
let opened: FakeOpenLink
const real = timers()
/* Each press's view, in the order it first listened for keys. */
let listened: unknown[] = []

const app = (content: ReactNode) => (
  <ThemeProvider tokens={light}>
    <LayerHostView>
      <Text>Page</Text>
      {content}
    </LayerHostView>
  </ThemeProvider>
)

/** A frame or two, which the host and the focus scope wait for. */
const frames = () =>
  act(async () => {
    clock.runFrame()
    clock.runFrame()
    await new Promise<void>((done) => setTimeout(done, 20))
  })

/** The panel's exit, which it is drawn through for its transition's length, run to its end. */
const settle = async () => {
  await act(async () => {
    await new Promise<void>((done) => setTimeout(done, 450))
  })
  await frames()
}

const draw = async (content: ReactNode) => {
  drawn = await render(app(content))
  await frames()
}

/** Every view drawn whose props pass `test`. */
const viewsWhere = (test: (props: Readonly<Record<string, unknown>>) => boolean) =>
  drawn?.container.queryAll((node) => test(node.props)) ?? []

const roleOf = (props: Readonly<Record<string, unknown>>) => props.role ?? props.accessibilityRole

/** The drawn trigger, a button whose words are Products. */
const trigger = () =>
  viewsWhere((props) => roleOf(props) === 'button').find(
    (node) => node.queryAll((inner) => inner.props.children === 'Products').length > 0,
  )

/** The panel's layer, while it is drawn. */
const panel = () => viewsWhere((props) => props.onAccessibilityEscape !== undefined)[0]

/** The link whose words hold `words`. */
const link = (words: string) =>
  viewsWhere((props) => roleOf(props) === 'link').find(
    (node) => node.queryAll((inner) => inner.props.children === words).length > 0,
  )

const press = (node: unknown) =>
  act(async () => {
    fireEvent.press(node as never)
  })

type Told = { detail: Readonly<Record<string, unknown>>; preventDefault: () => void }

/** A megamenu of two groups, Work and Insights. */
const megamenu = (props: Readonly<Record<string, unknown>> = {}, current?: string) => (
  <HelixMegamenu label="Products" {...props}>
    <HelixMegamenuGroup label="Work">
      <HelixMegamenuItem href="#projects" {...(current === 'projects' ? { current: 'page' } : {})}>
        Projects
      </HelixMegamenuItem>
      <HelixMegamenuItem href="#documents">Documents</HelixMegamenuItem>
    </HelixMegamenuGroup>
    <HelixMegamenuGroup label="Insights">
      <HelixMegamenuItem href="#reports">Reports</HelixMegamenuItem>
    </HelixMegamenuGroup>
  </HelixMegamenu>
)

beforeEach(() => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale: 1 },
    window: { ...Dimensions.get('window'), fontScale: 1 },
  })
  const fake = fakeKeys<unknown>()
  listened = []
  keys = {
    ...fake,
    listen: (node, hear) => {
      if (!listened.includes(node)) {
        listened.push(node)
      }
      return fake.listen(node, hear)
    },
  }
  focus = fakeFocus()
  clock = fakeTimers()
  opened = fakeOpenLink()
  setKeys(keys)
  setFocus(focus)
  setTimers(clock)
  setOpenLink(opened)
})

afterEach(() => {
  setTimers(real)
})

describe('the generated Megamenu', () => {
  test('draws a trigger named by its label, which a press opens and says is expanded', async () => {
    const heard: string[] = []
    await draw(
      megamenu({
        onBeforeOpen: () => heard.push('before-open'),
        onToggle: (event: { newState: string }) => heard.push(`toggle ${event.newState}`),
      }),
    )
    expect(trigger()?.props.accessibilityState?.expanded).toBe(false)
    expect(panel()).toBeUndefined()
    await press(trigger())
    await frames()
    expect(heard).toEqual(['before-open', 'toggle open'])
    expect(panel()).toBeDefined()
    expect(trigger()?.props.accessibilityState?.expanded).toBe(true)
    /* A press leaves focus on the trigger, as on the web. */
    expect(focus.moved.length).toBe(0)
  })

  test('names the panel by its label and each group by its heading', async () => {
    await draw(megamenu({ defaultOpen: true }))
    expect(panel()?.props.accessibilityLabel).toBe('Products')
    const headings = viewsWhere((props) => roleOf(props) === 'header')
    expect(headings.length).toBeGreaterThanOrEqual(2)
    expect(link('Projects')).toBeDefined()
    expect(link('Reports')).toBeDefined()
  })

  test('a press on the open trigger closes it, and a refused close keeps it open', async () => {
    await draw(megamenu())
    await press(trigger())
    await frames()
    await press(trigger())
    await frames()
    await settle()
    expect(panel()).toBeUndefined()
    await draw(megamenu({ onBeforeClose: (event: Told) => event.preventDefault() }))
    await press(trigger())
    await frames()
    await press(trigger())
    await frames()
    expect(panel()).toBeDefined()
  })

  test('Down on the trigger opens it with focus on its first destination', async () => {
    await draw(megamenu())
    const [own] = listened
    await act(() => {
      expect(keys.press(own, 'ArrowDown')).toBe(true)
    })
    await frames()
    expect(panel()).toBeDefined()
    expect(focus.focused()).not.toBeNull()
    expect(focus.focused()).not.toBe(own)
  })

  test('Down on the trigger of an open panel moves focus into it, and Up does nothing', async () => {
    await draw(megamenu())
    const [own] = listened
    await press(trigger())
    await frames()
    expect(focus.moved.length).toBe(0)
    await act(() => {
      expect(keys.press(own, 'ArrowUp')).toBe(false)
    })
    expect(focus.moved.length).toBe(0)
    await act(() => {
      expect(keys.press(own, 'ArrowDown')).toBe(true)
    })
    await frames()
    expect(focus.focused()).not.toBeNull()
    expect(focus.focused()).not.toBe(own)
  })

  test('Escape inside the panel closes it, with focus back on the trigger', async () => {
    await draw(megamenu())
    const [own] = listened
    await act(() => {
      keys.press(own, 'ArrowDown')
    })
    await frames()
    const inside = focus.focused()
    await act(() => {
      keys.press(inside, 'Escape')
    })
    await frames()
    await settle()
    expect(panel()).toBeUndefined()
    expect(focus.focused() === own).toBe(true)
  })

  test('a touch outside closes it, with focus on the trigger, as the web dismisses it', async () => {
    await draw(megamenu())
    const [own] = listened
    await press(trigger())
    await frames()
    for (const one of viewsWhere((props) => typeof props.onTouchStartCapture === 'function')) {
      await act(async () => {
        fireEvent(one, 'touchStartCapture', { nativeEvent: { pageX: 1, pageY: 1 } })
      })
    }
    await settle()
    expect(panel()).toBeUndefined()
    expect(focus.focused() === own).toBe(true)
  })

  test('one stands open at a time: opening another asks the open one to close', async () => {
    const heard: string[] = []
    await draw(
      <>
        {megamenu({ onBeforeClose: () => heard.push('products closes') })}
        <HelixMegamenu label="Solutions">
          <HelixMegamenuGroup label="By team">
            <HelixMegamenuItem href="#engineering">Engineering</HelixMegamenuItem>
          </HelixMegamenuGroup>
        </HelixMegamenu>
      </>,
    )
    await press(trigger())
    await frames()
    const solutions = viewsWhere((props) => roleOf(props) === 'button').find(
      (node) => node.queryAll((inner) => inner.props.children === 'Solutions').length > 0,
    )
    await press(solutions)
    await frames()
    await settle()
    expect(heard).toEqual(['products closes'])
    expect(link('Engineering')).toBeDefined()
    expect(link('Projects')).toBeUndefined()
  })

  test('choosing a destination asks, says select, opens its link, and closes it', async () => {
    const heard: string[] = []
    await draw(megamenu({ onBeforeClose: () => heard.push('before-close') }))
    await press(trigger())
    await frames()
    await press(link('Documents'))
    await frames()
    expect(opened.opened).toEqual(['#documents'])
    expect(heard).toEqual(['before-close'])
    await settle()
    expect(panel()).toBeUndefined()
  })

  test('a refused before-select keeps the link closed and the panel open', async () => {
    await draw(
      <HelixMegamenu defaultOpen label="Products">
        <HelixMegamenuGroup label="Work">
          <HelixMegamenuItem
            href="#projects"
            onBeforeSelect={(event: Told) => event.preventDefault()}
          >
            Projects
          </HelixMegamenuItem>
        </HelixMegamenuGroup>
      </HelixMegamenu>,
    )
    await press(link('Projects'))
    await frames()
    expect(opened.opened).toEqual([])
    expect(panel()).toBeDefined()
  })

  test('says a destination that is the page is the current page', async () => {
    await draw(megamenu({ defaultOpen: true }, 'projects'))
    const said = link('Projects')?.props.accessibilityValue as { text?: string } | undefined
    expect(said?.text).toBe('Current page')
  })

  test('in a navigation, is one of its destinations for the arrow keys', async () => {
    await draw(
      <HelixNavigation arrows label="Main">
        <HelixNavigationItem href="#overview">Overview</HelixNavigationItem>
        {megamenu()}
        <HelixNavigationItem href="#pricing">Pricing</HelixNavigationItem>
      </HelixNavigation>,
    )
    const [overview, products, pricing] = listened
    await act(() => {
      keys.press(overview, 'ArrowRight')
    })
    expect(focus.focused() === products).toBe(true)
    await act(() => {
      keys.press(products, 'ArrowRight')
    })
    expect(focus.focused() === pricing).toBe(true)
  })
})
