import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { createRef } from 'react'
import { type HostInstance, ScrollView, type ScrollViewInstance, View } from 'react-native'
import {
  nativeScroll,
  observeScrolled,
  observeScrollLock,
  pairAcross,
  scrolled,
  scrollLocked,
  scrollViewAbove,
} from './scroll'

type Rect = ReturnType<HostInstance['getBoundingClientRect']>

/** A rectangle in the viewport's coordinates, as `getBoundingClientRect` gives it. */
const rect = (x: number, y: number, width: number, height: number): Rect =>
  ({ height, width, x, y }) as Rect

/** Gives `node` the parent element a device's renderer would. */
const parent = (node: HostInstance, above: HostInstance | null): void => {
  Object.defineProperty(node, 'parentElement', { configurable: true, value: above })
}

/**
 * Draws a part in a view in a scroll view, and hands back the part and the
 * scroll view.
 *
 * **React Native's Jest preset draws each as a mock with none of the element
 * methods, and builds no tree of elements**, so the spec gives the part and
 * the scroll view the rectangle each reads, and gives each the parent element
 * a device's renderer would.
 */
const drawn = async (part: Rect, frame: Rect) => {
  const view = createRef<ScrollViewInstance>()
  const between = createRef<HostInstance>()
  const inside = createRef<HostInstance>()
  await render(
    <ScrollView ref={view}>
      <View ref={between}>
        <View ref={inside} />
      </View>
    </ScrollView>,
  )
  const scroller = Object.assign(view.current as ScrollViewInstance, {
    getBoundingClientRect: () => frame,
  })
  const node = Object.assign(inside.current as HostInstance, {
    getBoundingClientRect: () => part,
  })
  parent(node, between.current)
  parent(between.current as HostInstance, scroller)
  parent(scroller, null)
  return { node, scroller, scrollTo: jest.spyOn(scroller, 'scrollTo') }
}

/** The scroll view's box: 400 tall, starting 100 down the screen. */
const FRAME = rect(0, 100, 320, 400)

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('nativeScroll', () => {
  test('scrolls a scroll view by a distance at once, from the offset onScroll last reported', async () => {
    const { scroller, scrollTo } = await drawn(FRAME, FRAME)
    scrolled(scroller, { x: 0, y: 240 })
    nativeScroll.by(scroller, 0, 12)
    expect(scrollTo).toHaveBeenCalledWith({ animated: false, x: 0, y: 252 })
  })

  test('scrolls from the start of a scroll view whose onScroll has reported nothing', async () => {
    const { scroller, scrollTo } = await drawn(FRAME, FRAME)
    nativeScroll.by(scroller, 6, 8)
    expect(scrollTo).toHaveBeenCalledWith({ animated: false, x: 6, y: 8 })
  })

  test('scrolls nothing where the node is not a scroll view', async () => {
    const { node, scrollTo } = await drawn(FRAME, FRAME)
    nativeScroll.by(node, 0, 12)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  test('reads the offset onScroll last reported, and none before it reports', async () => {
    const { scroller } = await drawn(FRAME, FRAME)
    expect(nativeScroll.offset(scroller)).toEqual({ x: 0, y: 0 })
    scrolled(scroller, { x: 4, y: 90 })
    expect(nativeScroll.offset(scroller)).toEqual({ x: 4, y: 90 })
  })

  test('reveals a part below the view in the scroll view above it, the least that shows it', async () => {
    const { node, scroller, scrollTo } = await drawn(rect(0, 480, 320, 44), FRAME)
    scrolled(scroller, { x: 0, y: 200 })
    nativeScroll.reveal(node)
    expect(scrollTo).toHaveBeenCalledTimes(1)
    expect(scrollTo).toHaveBeenCalledWith({ animated: false, x: 0, y: 224 })
  })

  test('reveals a part above the view by scrolling back to its start', async () => {
    const { node, scroller, scrollTo } = await drawn(rect(0, 70, 320, 44), FRAME)
    scrolled(scroller, { x: 0, y: 200 })
    nativeScroll.reveal(node)
    expect(scrollTo).toHaveBeenCalledWith({ animated: false, x: 0, y: 170 })
  })

  test('reveals the start of a part longer than the view', async () => {
    const { node, scroller, scrollTo } = await drawn(rect(0, 60, 320, 900), FRAME)
    scrolled(scroller, { x: 0, y: 200 })
    nativeScroll.reveal(node)
    expect(scrollTo).toHaveBeenCalledWith({ animated: false, x: 0, y: 160 })
  })

  test('scrolls nothing to reveal a part already in view', async () => {
    const { node, scrollTo } = await drawn(rect(0, 300, 320, 44), FRAME)
    nativeScroll.reveal(node)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  test('scrolls nothing to reveal a part no scroll view holds', async () => {
    const { node, scrollTo } = await drawn(rect(0, 900, 320, 44), FRAME)
    parent(node, null)
    nativeScroll.reveal(node)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  test('holds the screen while a layer is open, and lets go when the last one closes', async () => {
    const { node, scroller } = await drawn(FRAME, FRAME)
    const told: boolean[] = []
    const stop = observeScrollLock((locked) => told.push(locked))
    const sheet = nativeScroll.lock(node)
    const dialog = nativeScroll.lock(scroller)
    expect(scrollLocked()).toBe(true)
    sheet()
    expect(scrollLocked()).toBe(true)
    dialog()
    expect(scrollLocked()).toBe(false)
    expect(told).toEqual([true, false])
    stop()
  })

  test('counts a layer that locks twice as one holder, and lets go once for each stop', async () => {
    const { node } = await drawn(FRAME, FRAME)
    const earlier = nativeScroll.lock(node)
    earlier()
    const later = nativeScroll.lock(node)
    nativeScroll.lock(node)
    earlier()
    expect(scrollLocked()).toBe(true)
    later()
    expect(scrollLocked()).toBe(false)
  })

  test('tells an observer nothing once stopped', async () => {
    const { node } = await drawn(FRAME, FRAME)
    const told: boolean[] = []
    observeScrollLock((locked) => told.push(locked))()
    nativeScroll.lock(node)()
    expect(told).toEqual([])
  })
})

describe('scrollViewAbove', () => {
  test('finds the scroll view a part is drawn in, and none above the scroll view itself', async () => {
    const { node, scroller } = await drawn(FRAME, FRAME)
    expect(scrollViewAbove(node)).toBe(scroller)
    expect(scrollViewAbove(scroller)).toBeNull()
  })

  test('finds the outer scroll view of a part that scrolls both ways, past the one across inside it', async () => {
    const { node, scroller } = await drawn(FRAME, FRAME)
    const outer = { scrollTo: jest.fn() } as unknown as ScrollViewInstance
    parent(scroller, outer as unknown as HostInstance)
    parent(outer as unknown as HostInstance, null)
    pairAcross(outer as unknown as HostInstance, scroller)
    expect(scrollViewAbove(node)).toBe(outer)
    pairAcross(outer as unknown as HostInstance, null)
    expect(scrollViewAbove(node)).toBe(scroller)
  })
})

describe('observeScrolled', () => {
  test('tells each offset a scroll view reports, until stopped', async () => {
    const { scroller } = await drawn(FRAME, FRAME)
    const told: number[] = []
    const stop = observeScrolled(scroller, (at) => told.push(at.y))
    scrolled(scroller, { x: 0, y: 40 })
    stop()
    scrolled(scroller, { x: 0, y: 80 })
    expect(told).toEqual([40])
  })
})
