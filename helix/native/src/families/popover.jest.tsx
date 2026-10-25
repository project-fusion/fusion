/*
 * The generated Popover, drawn from its real intermediate form in the layer
 * host: a panel placed against its trigger, which a press on the trigger
 * opens and closes and which says whether it is open, named by its label or
 * its fallback, dismissed by a close request or a press outside, holding the
 * reader under `modal`, with a point under `arrow`, and moving in once it is
 * placed. Floating UI's hook stands in for the one that measures views on a
 * device, as in `layer-place.jest.tsx`. `test:native` writes the component
 * beside this file.
 */
import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { type FakeAnnounce, fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { LayerHostView } from '../root/layers'
import { light } from '../theme/light.generated'
import { ThemeProvider } from '../theme/theme'
import { HelixButton } from './button/index.native'
import { styleOf } from './drawn'
import { HelixPopover } from './popover/index.native'

/** What the stand-in hook was last asked. */
const mockFloating = { crossOffset: 0, flips: true, offset: 0 }

jest.mock('@floating-ui/react-native', () => {
  const actual = jest.requireActual<Record<string, unknown>>('@floating-ui/react-native')
  return {
    ...actual,
    useFloating: (options: {
      readonly middleware: readonly {
        readonly name?: string
        readonly options?: readonly unknown[]
      }[]
    }) => {
      const found = (name: string) => options.middleware.find((one) => one.name === name)
      const offset = found('offset')?.options?.[0] as
        | { readonly crossAxis?: number; readonly mainAxis?: number }
        | undefined
      mockFloating.offset = Number(offset?.mainAxis ?? 0)
      mockFloating.crossOffset = Number(offset?.crossAxis ?? 0)
      mockFloating.flips = found('flip') !== undefined
      const size = found('size')?.options?.[0] as
        | { readonly apply: (state: Readonly<Record<string, unknown>>) => void }
        | undefined
      size?.apply({
        availableHeight: 240,
        availableWidth: 360,
        rects: { reference: { height: 40, width: 120, x: 20, y: 300 } },
      })
      return {
        middlewareData: {},
        placement: 'bottom-start',
        refs: {
          reference: { current: null },
          setFloating: () => undefined,
          setReference: () => undefined,
        },
        update: () => undefined,
        x: 20,
        y: 344,
      }
    },
  }
})

let drawn: Awaited<ReturnType<typeof render>> | undefined
let keys: FakeKeys<unknown>
let announced: FakeAnnounce

/** The app, with what the spec draws in it, under the layer host. */
const app = (content: ReactNode) => (
  <ThemeProvider tokens={light}>
    <LayerHostView>
      <Text>Page</Text>
      {content}
    </LayerHostView>
  </ThemeProvider>
)

/** A frame or two, which the host and the focus scope wait for. */
const frames = () => act(() => new Promise<void>((done) => setTimeout(done, 40)))

const draw = async (content: ReactNode) => {
  drawn = await render(app(content))
  await frames()
}

/** Every view drawn whose props pass `test`. */
const viewsWhere = (test: (props: Readonly<Record<string, unknown>>) => boolean) =>
  drawn?.container.queryAll((node) => test(node.props)) ?? []

/** The panel, the layer's own view, which a screen reader hears as a dialog. */
const panel = () =>
  viewsWhere(
    (props) =>
      (props.role === 'dialog' || props.accessibilityRole === 'dialog') &&
      props.onAccessibilityEscape !== undefined,
  )[0]

/** The trigger's press. */
const trigger = () =>
  viewsWhere((props) => props.accessibilityRole === 'button' || props.role === 'button').find(
    (node) => node.queryAll((inner) => inner.props.children === 'Filters').length > 0,
  )

/** Whether the words are drawn. */
const shows = (words: string) =>
  viewsWhere(() => true).some(
    (node) =>
      node.type === 'Text' &&
      [node.props.children].flat(3).some((child) => typeof child === 'string' && child === words),
  )

/** A popover of filters, opened from its trigger. */
const filters = (props: Readonly<Record<string, unknown>> = {}) => (
  <HelixPopover label="Filters" trigger={<HelixButton>Filters</HelixButton>} {...props}>
    <Text>Show archived files</Text>
  </HelixPopover>
)

beforeEach(() => {
  keys = fakeKeys()
  announced = fakeAnnounce()
  setKeys(keys)
  setFocus(fakeFocus())
  setAnnounce(announced)
})

describe('the generated Popover', () => {
  test('opens on a press on its trigger, which says it is expanded, and closes on the next', async () => {
    const heard: string[] = []
    await draw(
      filters({
        onBeforeOpen: () => heard.push('before-open'),
        onToggle: (event: { detail: { newState: string } }) =>
          heard.push(`toggle ${event.detail.newState}`),
      }),
    )
    expect(shows('Show archived files')).toBe(false)
    expect(trigger()?.props.accessibilityState).toMatchObject({ expanded: false })
    await act(async () => {
      fireEvent.press(trigger() as never)
    })
    await frames()
    expect(shows('Show archived files')).toBe(true)
    expect(trigger()?.props.accessibilityState).toMatchObject({ expanded: true })
    expect(heard).toEqual(['before-open', 'toggle open'])
    await act(async () => {
      fireEvent.press(trigger() as never)
    })
    await frames()
    expect(heard.at(-1)).toBe('toggle closed')
  })

  test('is named by its label, and by its fallback where it has none, and says its name as it opens', async () => {
    await draw(filters({ open: true }))
    expect(panel()?.props.accessibilityLabel).toBe('Filters')
    expect(announced.said.map((one) => one.message)).toContain('Filters')
    await draw(
      <HelixPopover fallbackLabel="Aufklappfeld" open trigger={<HelixButton>Filters</HelixButton>}>
        <Text>Words</Text>
      </HelixPopover>,
    )
    expect(panel()?.props.accessibilityLabel).toBe('Aufklappfeld')
  })

  test('closes on Escape and on a touch outside it, and a refused close keeps it open', async () => {
    const closing = jest.fn((event: { preventDefault: () => void }) => event.preventDefault())
    await draw(filters({ onBeforeClose: closing, open: true }))
    await act(async () => {
      keys.press(null, 'Escape')
    })
    expect(closing).toHaveBeenCalledTimes(1)
    expect(shows('Show archived files')).toBe(true)
    const shut = jest.fn()
    await draw(filters({ onBeforeClose: shut, open: true }))
    const page = viewsWhere((props) => typeof props.onTouchStartCapture === 'function')[0]
    await act(async () => {
      fireEvent(page as never, 'touchStartCapture', { nativeEvent: { pageX: 1, pageY: 1 } })
    })
    expect(shut).toHaveBeenCalledTimes(1)
  })

  test('holds the reader under `modal`, over a scrim a press on which closes it', async () => {
    const closing = jest.fn()
    await draw(filters({ modal: true, onBeforeClose: closing, open: true }))
    expect(panel()?.props.accessibilityViewIsModal).toBe(true)
    const scrim = viewsWhere(
      (props) => props.importantForAccessibility === 'no' && props.accessible === false,
    )[0]
    await act(async () => {
      fireEvent.press(scrim as never)
    })
    expect(closing).toHaveBeenCalledTimes(1)
  })

  test('stands where Floating UI puts it, offset by `offset` and slid by `cross-offset`, and moves in once placed', async () => {
    await draw(filters({ crossOffset: 6, flip: false, offset: 12, open: true }))
    expect(mockFloating.offset).toBe(12)
    expect(mockFloating.crossOffset).toBe(6)
    expect(mockFloating.flips).toBe(false)
    const style = styleOf(panel() ?? { props: {} })
    expect(style.opacity).toBe(1)
    expect(style.borderRadius).toBe(4)
    /* Below its trigger, it grows down out of the edge it opened against. */
    expect(style.transformOrigin).toBe('50% 0px')
  })

  test('draws its point under `arrow`, hidden from a screen reader', async () => {
    await draw(filters({ arrow: true, open: true }))
    const point = viewsWhere(
      (props) =>
        props.importantForAccessibility === 'no-hide-descendants' &&
        styleOf({ props }).transform !== undefined,
    )
    expect(point.length).toBeGreaterThan(0)
    /* Below its trigger, the point draws the panel's edge on its top and its start. */
    const edge = styleOf(point[0] ?? { props: {} })
    expect(edge.borderTopWidth).toBe(1)
    expect(edge.borderStartWidth).toBe(1)
    expect(edge.borderBottomWidth).toBeUndefined()
  })
})
