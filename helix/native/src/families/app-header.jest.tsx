/*
 * The generated App Header, drawn from its real intermediate form: the
 * page's banner, its regions in a row, the middle region folded behind a
 * toggle in a window narrower than `foldBelow`, and the page it follows as
 * it scrolls, which lifts it off the page and, under `hideOnScroll`, moves it
 * out of the way. `test:native` writes the component beside this file.
 */
import { environment, setEnvironment } from '@fusion.dev/helix-core/capabilities/environment'
import { type Measure, measure, setMeasure } from '@fusion.dev/helix-core/capabilities/measure'
import { type Scroll, scroll, setScroll } from '@fusion.dev/helix-core/capabilities/scroll'
import type { Rect, Scrolled } from '@fusion.dev/helix-core/capabilities/types'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Dimensions, type HostInstance, StyleSheet, Text, View } from 'react-native'
import { hearInsets, nativeEnvironment } from '../capabilities/environment'
import { reachOf } from '../render/safe-reach'
import { useTarget } from '../render/targets'
import { HelixRoot } from '../root/root'
import { HelixTheme } from '../theme/helix-theme'
import { HelixAppHeader, type HelixAppHeaderProps } from './app-header/index.native'

/* The scroll view the bar is drawn in, which a phone finds above its host. */
const mockView = { scrollTo: jest.fn() } as unknown as HostInstance
/* Whether the bar is drawn in that scroll view, or at the top of a window with none. */
const mockAbove = { inside: true }
jest.mock('../capabilities/scroll', () => ({
  ...jest.requireActual<typeof import('../capabilities/scroll')>('../capabilities/scroll'),
  scrollViewAbove: () => (mockAbove.inside ? mockView : null),
}))

/** The view each observer of the scroll follows, and what it hears. */
let observers: { node: unknown; changed: (at: Scrolled) => void }[] = []
const original = { environment: environment(), measure: measure(), scroll: scroll() }

/** Sets the window's width, as a phone turned on its side reports it. */
const atWidth = (width: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale: 1, width },
    window: { ...Dimensions.get('window'), fontScale: 1, width },
  })
}

beforeEach(() => {
  mockAbove.inside = true
  /* The window's width, which whether the bar folds is read from, as a phone reads it. */
  setEnvironment(nativeEnvironment)
  atWidth(390)
  observers = []
  setMeasure({
    /* The bar is 56 tall wherever it stands. */
    box: (): Rect | null => ({ height: 56, width: 390, x: 0, y: 0 }),
    observe: () => () => undefined,
  } as Measure<unknown>)
  setScroll({
    ...original.scroll,
    observe: (node: unknown, changed: (at: Scrolled) => void) => {
      const one = { changed, node }
      observers.push(one)
      return () => {
        observers = observers.filter((each) => each !== one)
      }
    },
  } as Scroll<unknown>)
})

afterEach(() => {
  setEnvironment(original.environment)
  setMeasure(original.measure)
  setScroll(original.scroll)
})

/** Scrolls the page every observer follows to `y`. */
const scrollTo = (y: number) =>
  act(() => {
    for (const one of observers) {
      one.changed({
        offset: { x: 0, y },
        settled: false,
        x: { end: true, start: true },
        y: { end: false, start: y <= 0 },
      })
    }
  })

/** What a view is drawn with, flattened. */
const styleOf = (view: { props: { style?: unknown } } | null | undefined) =>
  StyleSheet.flatten(view?.props.style as never) as Readonly<Record<string, unknown>>

/** The host, the page's banner. */
const banner = () => {
  const found = screen.container.queryAll((node) => node.props.role === 'banner')[0]
  if (found === undefined) {
    throw new Error('the bar draws no banner')
  }
  return found
}

/** A wordmark, two destinations, and an action, in the bar's three regions. */
const Bar = (props: Partial<HelixAppHeaderProps>) => (
  <HelixTheme mode="light">
    <HelixAppHeader end={<Text>Settings</Text>} start={<Text>Logo</Text>} {...props}>
      <Text>Overview</Text>
      <Text>Projects</Text>
    </HelixAppHeader>
  </HelixTheme>
)

/** The words of the drawn tree, in the order they are drawn. */
const order = (...words: string[]) => {
  const drawn = JSON.stringify(screen.toJSON())
  return words.map((one) => drawn.indexOf(one))
}

describe('app header', () => {
  test('is the page banner, its start, its middle, and its end in that order, with no toggle', async () => {
    await render(<Bar />)
    expect(screen.container.queryAll((node) => node.props.role === 'banner')).toHaveLength(1)
    const [logo, overview, settings] = order('Logo', 'Overview', 'Settings')
    expect(logo).toBeGreaterThan(-1)
    expect(overview).toBeGreaterThan(logo ?? 0)
    expect(settings).toBeGreaterThan(overview ?? 0)
    expect(screen.queryByLabelText('Menu')).toBeNull()
  })

  test('folds its middle region behind a toggle at its end where the window is narrower than foldBelow', async () => {
    await render(<Bar foldBelow={480} />)
    const toggle = screen.getByLabelText('Menu')
    expect(toggle.props.accessibilityState).toMatchObject({ expanded: false })
    expect(screen.queryByText('Overview')).toBeNull()
    const [settings, menu] = order('Settings', '"Menu"')
    expect(menu).toBeGreaterThan(settings ?? 0)
  })

  test('does not fold in a window as wide as foldBelow', async () => {
    atWidth(480)
    await render(<Bar foldBelow={480} />)
    expect(screen.queryByLabelText('Menu')).toBeNull()
    expect(screen.getByText('Overview')).toBeTruthy()
  })

  test('opens the folded region on a press, asking before-open first, and sends toggle once it stands open', async () => {
    const heard: string[] = []
    await render(
      <Bar
        foldBelow={480}
        onBeforeOpen={(event) => heard.push(`before-open ${event.detail.open}`)}
        onToggle={(event) => heard.push(`toggle ${event.oldState} ${event.newState}`)}
      />,
    )
    await fireEvent.press(screen.getByLabelText('Menu'))
    expect(heard).toEqual(['before-open true', 'toggle closed open'])
    expect(screen.getByLabelText('Menu').props.accessibilityState).toMatchObject({ expanded: true })
    expect(screen.getByText('Overview')).toBeTruthy()
    /* Below the row, after the actions and the toggle. */
    const [menu, overview] = order('"Menu"', 'Overview')
    expect(overview).toBeGreaterThan(menu ?? 0)
  })

  test('keeps the folded region closed where before-open is refused', async () => {
    await render(<Bar foldBelow={480} onBeforeOpen={(event) => event.preventDefault()} />)
    await fireEvent.press(screen.getByLabelText('Menu'))
    expect(screen.queryByText('Overview')).toBeNull()
  })

  test('draws the toggle before the start under togglePlacement start, and names it by menuLabel', async () => {
    await render(<Bar foldBelow={480} menuLabel="Sections" togglePlacement="start" />)
    const [menu, logo] = order('"Sections"', 'Logo')
    expect(menu).toBeGreaterThan(-1)
    expect(logo).toBeGreaterThan(menu ?? 0)
  })

  test('is scrolled once the page has moved 8 from its top, until it is back within 2, and says so each time it turns', async () => {
    const heard: boolean[] = []
    await render(<Bar onScrolled={(event) => heard.push(event.detail.scrolled)} />)
    expect(observers.map((one) => one.node)).toEqual([mockView])
    await scrollTo(6)
    expect(heard).toEqual([])
    await scrollTo(20)
    await scrollTo(5)
    expect(heard).toEqual([true])
    await scrollTo(1)
    expect(heard).toEqual([true, false])
  })

  test('takes the glass under material transparent once the page has scrolled', async () => {
    await render(<Bar material="transparent" />)
    expect(styleOf(banner()).backgroundColor).toBe('transparent')
    await scrollTo(40)
    expect(styleOf(banner()).backgroundColor).not.toBe('transparent')
  })

  test('moves out of the way on a scroll down past its height under hideOnScroll and sticky, and back on a scroll up', async () => {
    await render(<Bar hideOnScroll sticky />)
    const moved = () => JSON.stringify(styleOf(banner()).transform ?? [])
    await scrollTo(40)
    expect(moved()).not.toContain('-100%')
    await scrollTo(200)
    expect(moved()).toContain('-100%')
    await scrollTo(190)
    expect(moved()).not.toContain('-100%')
  })

  test('stays in view while its folded region stands open', async () => {
    await render(<Bar defaultOpen foldBelow={480} hideOnScroll sticky />)
    await scrollTo(40)
    await scrollTo(200)
    expect(JSON.stringify(styleOf(banner()).transform ?? [])).not.toContain('-100%')
  })

  test('follows the view registered under scroller, where the app draws its page beside the bar', async () => {
    const Page = () => {
      const content = useTarget('content')
      return (
        <HelixTheme mode="light">
          <HelixAppHeader scroller="content" start={<Text>Logo</Text>} />
          <View ref={content} testID="content" />
        </HelixTheme>
      )
    }
    await render(<Page />)
    const followed = observers.at(-1)?.node
    expect(followed === undefined || followed === mockView).toBe(false)
  })

  test('stands clear of the status bar by the share of the top safe area that reaches into it', async () => {
    mockAbove.inside = false
    await render(
      <HelixRoot mode="light">
        <HelixAppHeader start={<Text>Logo</Text>} />
      </HelixRoot>,
    )
    /* After HelixRoot has heard the safe area its provider gives a spec. */
    await act(() => hearInsets({ bottom: 34, left: 0, right: 0, top: 47 }))
    expect(styleOf(banner()).paddingTop ?? 0).toBe(0)
    /* Laid out at the top of the window. */
    await fireEvent(banner(), 'layout', {
      currentTarget: { getBoundingClientRect: () => ({ height: 56, width: 390, x: 0, y: 0 }) },
      nativeEvent: { layout: { height: 56, width: 390, x: 0, y: 0 } },
    })
    expect(styleOf(banner()).paddingTop).toBe(47)
    /* Laid out under a header of the router's, below the status bar. */
    await fireEvent(banner(), 'layout', {
      currentTarget: { getBoundingClientRect: () => ({ height: 56, width: 390, x: 0, y: 100 }) },
      nativeEvent: { layout: { height: 56, width: 390, x: 0, y: 100 } },
    })
    expect(styleOf(banner()).paddingTop ?? 0).toBe(0)
    await act(() => hearInsets({ bottom: 0, left: 0, right: 0, top: 0 }))
  })

  test('stands clear of the status bar from its first frame, measured before it is drawn', async () => {
    mockAbove.inside = false
    const view = await render(
      <HelixRoot mode="light">
        <Text>Opening</Text>
      </HelixRoot>,
    )
    await act(() => hearInsets({ bottom: 34, left: 0, right: 0, top: 47 }))
    /* A test renderer's views measure nothing, so each stands at the top of
       the window while the bar is first drawn, as a device lays it out. */
    Object.defineProperty(Object.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ height: 56, width: 390, x: 0, y: 0 }),
    })
    try {
      await view.rerender(
        <HelixRoot mode="light">
          <HelixAppHeader start={<Text>Logo</Text>} />
        </HelixRoot>,
      )
    } finally {
      Reflect.deleteProperty(Object.prototype, 'getBoundingClientRect')
    }
    /* No layout event has reached the bar. */
    expect(styleOf(banner()).paddingTop).toBe(47)
    await act(() => hearInsets({ bottom: 0, left: 0, right: 0, top: 0 }))
  })

  test('reads the reach of each inset from where a box stands in the window', () => {
    const insets = { bottom: 34, left: 0, right: 0, top: 47 }
    const window = { height: 844, width: 390 }
    expect(reachOf(insets, { height: 56, width: 390, x: 0, y: 0 }, window).top).toBe(47)
    expect(reachOf(insets, { height: 56, width: 390, x: 0, y: 20 }, window).top).toBe(27)
    expect(reachOf(insets, { height: 56, width: 390, x: 0, y: 300 }, window)).toEqual({
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
    })
    expect(reachOf(insets, { height: 44, width: 390, x: 0, y: 800 }, window).bottom).toBe(34)
  })

  test('reads no safe area inside a scroll view, which moves it under the status bar as it scrolls', async () => {
    await render(
      <HelixRoot mode="light">
        <HelixAppHeader start={<Text>Logo</Text>} />
      </HelixRoot>,
    )
    await act(() => hearInsets({ bottom: 34, left: 0, right: 0, top: 47 }))
    await fireEvent(banner(), 'layout', {
      currentTarget: { getBoundingClientRect: () => ({ height: 56, width: 390, x: 0, y: 0 }) },
      nativeEvent: { layout: { height: 56, width: 390, x: 0, y: 0 } },
    })
    expect(styleOf(banner()).paddingTop ?? 0).toBe(0)
    await act(() => hearInsets({ bottom: 0, left: 0, right: 0, top: 0 }))
  })
})
