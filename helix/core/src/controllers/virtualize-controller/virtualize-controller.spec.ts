import { describe, expect, test } from 'bun:test'
import { VirtualizeController } from './virtualize-controller.js'

/**
 * The arithmetic on its own, with a box that reports numbers and nothing else.
 *
 * No DOM and no layout: what is being asked here is whether an offset and a
 * height turn into the right slice, which is a function of three numbers. A
 * browser is needed to know whether the scroller is the right element, and that
 * is a different question asked in a different place.
 */
const box = (scrollTop: number, clientHeight: number): HTMLElement =>
  ({
    addEventListener: () => {},
    clientHeight,
    removeEventListener: () => {},
    scrollTop,
  }) as unknown as HTMLElement

const host = () => {
  let updates = 0
  return {
    addController: () => {},
    addEventListener: () => {},
    removeController: () => {},
    requestUpdate: () => {
      updates += 1
    },
    updateComplete: Promise.resolve(true),
    get updates(): number {
      return updates
    },
  }
}

const windowFor = (
  scrollTop: number,
  { count = 10_000, estimate = 32, height = 320, overscan = 4 } = {},
) => {
  const owner = host()
  const controller = new VirtualizeController(owner, {
    container: () => box(scrollTop, height),
    count: () => count,
    estimate: () => estimate,
    overscan,
  })
  controller.measure()
  return { owner, window: controller.window }
}

describe('the window a scroll offset asks for', () => {
  test('starts at the top, with overscan clamped away', () => {
    /* `first` cannot go below zero however much overscan is asked for, or the
       spacer before it is negative and the list starts above its own box. */
    expect(windowFor(0).window).toEqual({ after: 319_424, before: 0, first: 0, last: 18 })
  })

  test('moves with the offset, and the spacers move with it', () => {
    const { window } = windowFor(3200)
    /* 3200 / 32 is row 100, less four of overscan. Ten rows fit in 320, plus
       eight of overscan either side. */
    expect([window.first, window.last]).toEqual([96, 114])
    /* The room the absent rows would have taken, which is what keeps the
       scrollbar honest: 96 rows above and 9,886 below, at 32 each. */
    expect([window.before, window.after]).toEqual([3072, 316_352])
  })

  test('stops at the end rather than running past it', () => {
    const { window } = windowFor(10_000 * 32)
    expect(window.last).toBe(10_000)
    expect(window.after).toBe(0)
  })

  test('an empty set asks for nothing', () => {
    expect(windowFor(0, { count: 0 }).window).toEqual({ after: 0, before: 0, first: 0, last: 0 })
  })

  test('the spacers and the rendered rows account for every item', () => {
    const { window } = windowFor(5000)
    const rendered = window.last - window.first
    const total = window.before / 32 + rendered + window.after / 32
    expect(total).toBe(10_000)
  })
})

describe('what it asks the host to do', () => {
  test('asks for one update when the slice moves', () => {
    const owner = host()
    let top = 0
    const controller = new VirtualizeController(owner, {
      container: () => box(top, 320),
      count: () => 10_000,
      estimate: () => 32,
    })
    controller.measure()
    top = 3200
    controller.measure()
    expect(owner.updates).toBe(2)
  })

  test('and none at all while it has not', () => {
    /* A scroll fires many events a frame and most land inside the row already
       at the top. Asking for an update per event re-renders the list for every
       pixel, which is the cost this whole controller exists to avoid. */
    const owner = host()
    let top = 0
    const controller = new VirtualizeController(owner, {
      container: () => box(top, 320),
      count: () => 10_000,
      estimate: () => 32,
    })
    controller.measure()
    const after = owner.updates
    for (top = 1; top < 32; top += 1) {
      controller.measure()
    }
    expect(owner.updates).toBe(after)
  })

  test('and nothing at all before there is a box to read', () => {
    const owner = host()
    const controller = new VirtualizeController(owner, {
      container: () => null,
      count: () => 10_000,
      estimate: () => 32,
    })
    controller.measure()
    expect([owner.updates, controller.window.last]).toEqual([0, 0])
  })
})
