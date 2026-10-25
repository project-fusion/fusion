/*
 * The generated Drawer, drawn from its real intermediate form in the layer
 * host: a panel along an edge of the window, the end where `placement` names
 * none, modal unless `modal` is false, that a close request, a press
 * outside, a swipe, or its close control asks to close, as `closedby` and
 * `persistent` allow; whose content scrolls between its header and its
 * footer; and that says its name as it opens. `test:native` writes the
 * component beside this file.
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
import { Dimensions, Text } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { LayerHostView } from '../root/layers'
import { light } from '../theme/light.generated'
import { ThemeProvider } from '../theme/theme'
import { HelixDrawer } from './drawer/index.native'
import { styleOf } from './drawn'

let drawn: Awaited<ReturnType<typeof render>> | undefined
let keys: FakeKeys<unknown>
let announced: FakeAnnounce

const app = (content: ReactNode) => (
  <GestureHandlerRootView>
    <ThemeProvider tokens={light}>
      <LayerHostView>
        <Text>Page</Text>
        {content}
      </LayerHostView>
    </ThemeProvider>
  </GestureHandlerRootView>
)

/** A frame or two, which the host and the focus scope wait for. */
const frames = () => act(() => new Promise<void>((done) => setTimeout(done, 40)))

const draw = async (content: ReactNode) => {
  drawn = await render(app(content))
  await frames()
}

const viewsWhere = (test: (props: Readonly<Record<string, unknown>>) => boolean) =>
  drawn?.container.queryAll((node) => test(node.props)) ?? []

/** The panel, the layer's own view, which a screen reader hears as a dialog. */
const panel = () =>
  viewsWhere(
    (props) =>
      (props.role === 'dialog' || props.accessibilityRole === 'dialog') &&
      props.onAccessibilityEscape !== undefined,
  )[0]

const scrim = () =>
  viewsWhere((props) => props.importantForAccessibility === 'no' && props.accessible === false)[0]

/** A drawer of filters, with a title, a long list, and its actions. */
const filters = (props: Readonly<Record<string, unknown>> = {}) => (
  <HelixDrawer footer={<Text>Apply</Text>} header={<Text>Filters</Text>} open {...props}>
    <Text>Status</Text>
  </HelixDrawer>
)

beforeEach(() => {
  keys = fakeKeys()
  announced = fakeAnnounce()
  setKeys(keys)
  setFocus(fakeFocus())
  setAnnounce(announced)
})

describe('the generated Drawer', () => {
  test('stands along the end edge, as long as the window and 20rem across, named by its title', async () => {
    await draw(filters())
    const style = styleOf(panel() ?? { props: {} })
    expect(style.width).toBe(20 * 16)
    expect(style.height).toBe('100%')
    /* Square where it meets the window, at the end. */
    expect(style.borderTopEndRadius ?? style.borderTopRightRadius).toBe(0)
    expect(panel()?.props.accessibilityLabel).toBe('Filters')
    expect(panel()?.props.accessibilityViewIsModal).toBe(true)
    const along = viewsWhere((props) => {
      const placed = styleOf({ props })
      return placed.flexDirection === 'row' && placed.justifyContent === 'flex-end'
    })
    expect(along.length).toBeGreaterThan(0)
  })

  test('stands along the bottom edge under `placement="bottom"`, at most 20rem tall', async () => {
    await draw(filters({ placement: 'bottom' }))
    const style = styleOf(panel() ?? { props: {} })
    expect(style.height).toBe(20 * 16)
    expect(style.borderBottomStartRadius ?? style.borderBottomLeftRadius).toBe(0)
  })

  test('keeps a step under a title passed in as words, as its slotted span takes on the web', async () => {
    await draw(
      <HelixDrawer header="Filters" open>
        <Text>Status</Text>
      </HelixDrawer>,
    )
    const title = viewsWhere(
      (props) => [props.children].flat(3).includes('Filters') && props.style !== undefined,
    )[0]
    expect(styleOf(title ?? { props: {} }).marginBottom).toBe(16)
  })

  test('says its name as it opens', async () => {
    await draw(filters())
    expect(announced.said.map((one) => one.message)).toContain('Filters')
  })

  test('closes on a press outside, and tells before-close, toggle, and close in that order', async () => {
    const heard: string[] = []
    await draw(
      filters({
        onBeforeClose: () => heard.push('before-close'),
        onClose: () => heard.push('close'),
        onToggle: () => heard.push('toggle'),
      }),
    )
    await act(async () => {
      fireEvent.press(scrim() as never)
    })
    await frames()
    expect(heard).toEqual(['before-close', 'toggle', 'close'])
  })

  test('that is not modal holds no one, keeps a touch outside, and closes on Escape', async () => {
    const closing = jest.fn()
    await draw(filters({ modal: false, onBeforeClose: closing }))
    expect(panel()?.props.accessibilityViewIsModal).toBeUndefined()
    expect(scrim()).toBeUndefined()
    const [page] = viewsWhere((props) => typeof props.onTouchStartCapture === 'function')
    await fireEvent(page as never, 'touchStartCapture', { nativeEvent: { pageX: 1, pageY: 1 } })
    expect(closing).not.toHaveBeenCalled()
    await act(async () => {
      keys.press(null, 'Escape')
    })
    expect(closing).toHaveBeenCalledTimes(1)
  })

  test('`persistent` keeps a close request and a press outside, and its close control still closes it', async () => {
    const closing = jest.fn()
    await draw(filters({ dismissible: true, onBeforeClose: closing, persistent: true }))
    await act(async () => {
      keys.press(null, 'Escape')
      fireEvent.press(scrim() as never)
    })
    expect(closing).not.toHaveBeenCalled()
    const close = viewsWhere((props) => props.accessibilityLabel === 'Close')[0]
    await act(async () => {
      fireEvent.press(close as never)
    })
    expect(closing).toHaveBeenCalledTimes(1)
  })

  test('scrolls its content between its header and its footer, which stay put', async () => {
    await draw(filters())
    const scrollers = viewsWhere((props) => props.contentContainerStyle !== undefined)
    expect(scrollers).toHaveLength(1)
  })

  test('is swiped through a pan around its panel, where `swipe` is not false', async () => {
    const swipes = () =>
      viewsWhere((props) => typeof props.onLayout === 'function' && props.collapsable === false)
    await draw(filters())
    expect(swipes().length).toBeGreaterThan(0)
    expect(Dimensions.get('window').width).toBeGreaterThan(0)
  })

  test('takes no drag on its scrim, which a press on closes it, where the pan hears its panel alone', async () => {
    /* The components a view is drawn inside, outermost last. */
    const around = (view: unknown): string[] => {
      const names: string[] = []
      // biome-ignore lint/suspicious/noExplicitAny: the renderer's fibers are untyped
      for (let fiber: any = (view as any)?.unstable_fiber; fiber; fiber = fiber.return) {
        const type = fiber.type
        names.push(typeof type === 'function' ? (type.displayName ?? type.name ?? '') : '')
      }
      return names
    }
    const closing = jest.fn()
    await draw(filters({ onBeforeClose: closing }))
    expect(around(panel())).toContain('GestureDetector')
    expect(around(scrim())).not.toContain('GestureDetector')
    await act(async () => {
      fireEvent(scrim() as never, 'responderMove', { nativeEvent: { pageX: 40, pageY: 300 } })
    })
    expect(closing).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.press(scrim() as never)
    })
    expect(closing).toHaveBeenCalledTimes(1)
  })
})
