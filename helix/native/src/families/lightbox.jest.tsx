/*
 * The generated Lightbox, drawn from its real intermediate form in the layer
 * host: a modal viewer over the whole window that shows one item at a time,
 * named by its label, which moves by its controls, its keys, and a swipe,
 * which asks `before-activate` first, says each place, zooms by its controls and
 * its keys, hides its chrome while the reader is still, and draws in the dark
 * scheme on a light page. The pan and pinch are `drivers/zoom.jest.tsx`'s; here
 * the driver is wrapped, so the spec answers as a release would. `test:native`
 * writes the component beside this file.
 */
import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { type FakeAnnounce, fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { setEnvironment } from '@fusion.dev/helix-core/capabilities/environment'
import { fakeEnvironment } from '@fusion.dev/helix-core/capabilities/environment/fake'
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { StyleSheet, Text } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import type { ZoomSetup } from '../drivers/zoom'
import { LayerHostView } from '../root/layers'
import { dark } from '../theme/dark.generated'
import { HelixTheme } from '../theme/helix-theme'
import { HelixLightbox, HelixLightboxItem } from './lightbox/index.native'

let drawn: Awaited<ReturnType<typeof render>> | undefined
let keys: FakeKeys<unknown>
let announced: FakeAnnounce
let clock: FakeTimers
const real = timers()

/** What the viewer last asked of the pan and pinch driver. */
const mockZoom = { setup: undefined as ZoomSetup | undefined }

jest.mock('../drivers/zoom', () => {
  const actual = jest.requireActual<typeof import('../drivers/zoom')>('../drivers/zoom')
  return {
    ...actual,
    useZoom: (setup: ZoomSetup) => {
      mockZoom.setup = setup
      return actual.useZoom(setup)
    },
  }
})

const app = (content: ReactNode) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>
        <Text>Page</Text>
        {content}
      </LayerHostView>
    </HelixTheme>
  </GestureHandlerRootView>
)

const frames = () => act(() => new Promise<void>((done) => setTimeout(done, 40)))

const draw = async (content: ReactNode) => {
  drawn = await render(app(content))
  await frames()
}

/** Every view drawn whose props pass `test`. */
const viewsWhere = (test: (props: Readonly<Record<string, unknown>>) => boolean) =>
  drawn?.container.queryAll((node) => test(node.props)) ?? []

/** The views a screen reader reaches by `label`. */
const labeled = (label: string) => viewsWhere((props) => props.accessibilityLabel === label)

/** The press a screen reader names `label`. */
const press = async (label: string) => {
  const found = labeled(label)[0]
  if (found === undefined) {
    throw new Error(`no press named ${label}`)
  }
  await act(async () => fireEvent.press(found))
  await frames()
}

type Told = [string, unknown][]

const viewer = (told: Told, extra: Readonly<Record<string, unknown>> = {}) => (
  <HelixLightbox
    controls
    counter
    label="Beach photos"
    max-zoom={3}
    maxZoom={3}
    onActivate={(event: { detail: unknown }) => told.push(['activate', event.detail])}
    onBeforeActivate={(event: { detail: unknown }) => told.push(['before-activate', event.detail])}
    open
    {...extra}
  >
    <HelixLightboxItem label="Seawater" value="seawater">
      <Text>Water</Text>
    </HelixLightboxItem>
    <HelixLightboxItem value="sun">
      <Text>Sun</Text>
    </HelixLightboxItem>
  </HelixLightbox>
)

beforeEach(() => {
  keys = fakeKeys()
  announced = fakeAnnounce()
  clock = fakeTimers()
  setKeys(keys)
  setAnnounce(announced)
  setEnvironment(fakeEnvironment())
  setFocus(fakeFocus())
  setTimers(clock)
})

afterEach(async () => {
  await drawn?.unmount()
  drawn = undefined
  setTimers(real)
})

describe('Lightbox', () => {
  test('shows the item active names, each a slide named by its label or its place', async () => {
    await draw(viewer([]))
    expect(labeled('Beach photos').length).toBeGreaterThan(0)
    const groups = viewsWhere(
      (props) => props.role === 'group' && props.accessibilityHint === 'slide',
    )
    const shown = groups.filter((node) => StyleSheet.flatten(node.props.style)?.display !== 'none')
    expect(groups.map((node) => node.props.accessibilityLabel)).toEqual(['Seawater', '2 of 2'])
    expect(shown.map((node) => node.props.accessibilityLabel)).toEqual(['Seawater'])
    expect(drawn?.queryByText('1 of 2', { includeHiddenElements: true })).not.toBeNull()
    expect(announced.said.map((one) => one.message)).toContain('1 of 2')
  })

  test('next asks before-activate, then moves and says the new place', async () => {
    const told: Told = []
    await draw(viewer(told))
    await press('Next')
    expect(told).toEqual([
      ['before-activate', { value: 'sun' }],
      ['activate', { previous: 'seawater', value: 'sun' }],
    ])
    expect(drawn?.queryByText('2 of 2', { includeHiddenElements: true })).not.toBeNull()
    expect(announced.said.at(-1)?.message).toBe('2 of 2')
  })

  test('the arrow keys step, and End and Home go to the ends', async () => {
    const told: Told = []
    await draw(viewer(told))
    await act(async () => {
      keys.press({}, 'End')
    })
    await act(async () => {
      keys.press({}, 'ArrowLeft')
    })
    expect(told.filter(([name]) => name === 'activate').map(([, detail]) => detail)).toEqual([
      { previous: 'seawater', value: 'sun' },
      { previous: 'sun', value: 'seawater' },
    ])
  })

  test('zooms in by half again and out from its controls and its keys, and says the scale', async () => {
    await draw(viewer([]))
    await press('Zoom in')
    await act(async () => clock.advance(0))
    expect(announced.said.at(-1)?.message).toBe('Zoomed to 150%')
    await act(async () => {
      keys.press({}, '0')
    })
    await act(async () => clock.advance(0))
    expect(announced.said.at(-1)?.message).toBe('Zoomed to 100%')
  })

  test('a swipe across the item at its own size steps the way the line runs', async () => {
    const told: Told = []
    await draw(viewer(told))
    await act(async () => mockZoom.setup?.swiped?.(-200, 0, 0))
    expect(told.at(-1)).toEqual(['activate', { previous: 'seawater', value: 'sun' }])
    await act(async () => mockZoom.setup?.swiped?.(200, 0, 0))
    expect(told.at(-1)).toEqual(['activate', { previous: 'sun', value: 'seawater' }])
  })

  test('hides its chrome once the reader is still for idle-delay, and a touch brings it back', async () => {
    await draw(viewer([], { idleDelay: 2000 }))
    const opacity = () =>
      StyleSheet.flatten(
        drawn?.getByText('1 of 2', { includeHiddenElements: true }).parent?.props.style,
      )?.opacity
    expect(opacity()).not.toBe(0)
    await act(async () => clock.advance(2000))
    await frames()
    expect(opacity()).toBe(0)
    await act(async () => mockZoom.setup?.touched?.())
    await frames()
    expect(opacity()).not.toBe(0)
  })

  test('its ref steps and closes it, as the web element’s methods do', async () => {
    const told: Told = []
    const ref: { current: { close(): void; next(): void } | null } = { current: null }
    const closed: string[] = []
    await draw(viewer(told, { onClose: () => closed.push('close'), ref }))
    await act(async () => ref.current?.next())
    expect(told.at(-1)).toEqual(['activate', { previous: 'seawater', value: 'sun' }])
    await act(async () => ref.current?.close())
    await frames()
    expect(closed).toEqual(['close'])
  })

  test('draws its chrome in the dark scheme on a light page', async () => {
    await draw(viewer([]))
    const words = drawn?.getByText('1 of 2', { includeHiddenElements: true })
    let node = words ?? null
    let color: unknown
    while (node !== null && color === undefined) {
      color = (StyleSheet.flatten(node.props.style) as { color?: unknown } | undefined)?.color
      node = node.parent
    }
    expect(String(color).toLowerCase()).toBe(dark['color-foreground'].toLowerCase())
  })
})
