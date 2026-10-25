/*
 * The generated Scroll Area and a hardware keyboard: a stop of keyboard focus
 * while it overflows, scrolled by the arrows, the page keys, Space, Home,
 * and End, as a browser scrolls a box that overflows, and ringed while it
 * shows keyboard focus. `test:native` writes the component beside this file.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { type FakeFocus, fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { scroll, setScroll } from '@fusion.dev/helix-core/capabilities/scroll'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { heardKey, heardTouch } from '../capabilities/focus-visible'
import { nativeScroll } from '../capabilities/scroll'
import { scrolledBy } from '../machines/scroll-keys'
import { HelixTheme } from '../theme/helix-theme'
import { type Drawn, nodes, styleOf } from './drawn'
import { HelixScrollArea } from './scroll-area/index.native'

const original = { scroll: scroll(), timers: timers() }
let keys: FakeKeys<unknown>
let focus: FakeFocus<unknown>
/** The views each listener hears keys on, in the order they started. */
let listened: unknown[]
/** Each offset the part was scrolled to. */
let moved: { x: number; y: number }[]

beforeEach(() => {
  setTimers(fakeTimers())
  moved = []
  setScroll({
    ...nativeScroll,
    to: (node, x, y, smooth) => {
      moved.push({ x, y })
      nativeScroll.to(node, x, y, smooth)
    },
  })
  focus = fakeFocus<unknown>()
  setFocus(focus)
  keys = fakeKeys<unknown>()
  listened = []
  setKeys({
    ...keys,
    listen: (node, heard) => {
      listened.push(node)
      return keys.listen(node, heard)
    },
  })
})

afterEach(() => {
  heardTouch()
  setTimers(original.timers)
  setScroll(original.scroll)
})

/** The scroll view that reports the part's length down. */
const scroller = (): Drawn | undefined =>
  screen.root?.queryAll((node) => typeof node.props.onMomentumScrollEnd === 'function')[0]

/** Lays the part out with a frame and content of these heights, and scrolls it to `y`. */
const laidOut = async (frame: number, content: number, y = 0) => {
  const view = scroller()
  await fireEvent(view as never, 'layout', {
    nativeEvent: { layout: { height: frame, width: 100, x: 0, y: 0 } },
  })
  await fireEvent(view as never, 'contentSizeChange', 100, content)
  await fireEvent.scroll(view as never, { nativeEvent: { contentOffset: { x: 0, y } } })
}

/** The frame around the scroll view, which takes keyboard focus. */
const frame = (): Drawn | undefined =>
  nodes(screen.toJSON()).find((node) => typeof node.props.focusable === 'boolean')

const drawn = () =>
  render(
    <HelixTheme mode="light">
      <HelixScrollArea label="Changes" orientation="vertical">
        <Text>Words</Text>
      </HelixScrollArea>
    </HelixTheme>,
  )

describe('a Scroll Area and a hardware keyboard', () => {
  test('is a stop of keyboard focus only while it overflows', async () => {
    await drawn()
    await laidOut(100, 80)
    expect(frame()?.props.focusable).toBe(false)
    await laidOut(100, 400)
    expect(frame()?.props.focusable).toBe(true)
  })

  test('scrolls by a line, a page, and to each end, and leaves a key that moves nothing', async () => {
    await drawn()
    await laidOut(100, 400)
    const on = listened.at(-1)
    expect(await act(() => keys.press(on, 'ArrowDown'))).toBe(true)
    expect(moved.at(-1)).toEqual({ x: 0, y: 40 })
    expect(await act(() => keys.press(on, 'End'))).toBe(true)
    expect(moved.at(-1)).toEqual({ x: 0, y: 300 })
    expect(await act(() => keys.press(on, 'PageDown'))).toBe(true)
    expect(moved.at(-1)).toEqual({ x: 0, y: 87.5 })
    expect(await act(() => keys.press(on, 'Home'))).toBe(false)
    expect(await act(() => keys.press(on, 'ArrowUp'))).toBe(false)
    expect(await act(() => keys.press(on, 'ArrowDown', { meta: true }))).toBe(false)
    expect(await act(() => keys.press(on, 'ArrowDown', { claimed: true }))).toBe(false)
  })

  test('shows the focus ring while it has keyboard focus after a key', async () => {
    await drawn()
    await laidOut(100, 400)
    const ringed = () =>
      nodes(screen.toJSON()).some((node) => Number(styleOf(node).outlineWidth ?? 0) > 0)
    expect(ringed()).toBe(false)
    await act(() => {
      focus.place(listened.at(-1))
      heardKey()
    })
    expect(ringed()).toBe(true)
  })
})

describe('where a key scrolls a part', () => {
  const lengths = (width: number, height: number) => ({
    content: { height, width },
    frame: { height: 100, width: 100 },
  })

  test('takes Space as a page down, and Shift and Space as a page up', () => {
    expect(scrolledBy({ key: ' ', shift: false }, { x: 0, y: 0 }, lengths(100, 400))).toEqual({
      x: 0,
      y: 87.5,
    })
    expect(scrolledBy({ key: ' ', shift: true }, { x: 0, y: 200 }, lengths(100, 400))).toEqual({
      x: 0,
      y: 112.5,
    })
  })

  test('moves Home, End, and the page keys across in a part that scrolls across alone', () => {
    const across = lengths(500, 100)
    expect(scrolledBy({ key: 'End', shift: false }, { x: 0, y: 0 }, across)).toEqual({
      x: 400,
      y: 0,
    })
    expect(scrolledBy({ key: 'PageUp', shift: false }, { x: 400, y: 0 }, across)).toEqual({
      x: 312.5,
      y: 0,
    })
    expect(scrolledBy({ key: 'ArrowRight', shift: false }, { x: 390, y: 0 }, across)).toEqual({
      x: 400,
      y: 0,
    })
  })

  test('takes no key it does not scroll with', () => {
    expect(scrolledBy({ key: 'a', shift: false }, { x: 0, y: 0 }, lengths(100, 400))).toBe(
      undefined,
    )
  })
})
