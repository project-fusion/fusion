import { describe, expect, test } from 'bun:test'
import { Heights } from './heights.js'

/**
 * The geometry on its own, with no host, no box and no layout.
 *
 * A pure spec for the reason `order.pure.spec.ts` is one: what is asked here is
 * whether a set of measurements turns into the right offsets, which is a
 * function of numbers. Whether the right element is measured is a different
 * question, asked where there is a browser to ask it in.
 */
const heights = (estimate = 10) => new Heights(() => estimate)

describe('placing items that are not the same height', () => {
  test('estimates every item it has never seen', () => {
    const h = heights(10)
    expect(h.at(0)).toBe(10)
    expect(h.before(5, 100)).toBe(50)
    expect(h.total(100)).toBe(1000)
  })

  test('uses a measurement once it has one, and only for that item', () => {
    const h = heights(10)
    h.record(2, 40)
    expect(h.at(2)).toBe(40)
    expect(h.at(3)).toBe(10)
    // Items 0 and 1 at ten each, then the measured 40.
    expect(h.before(3, 100)).toBe(60)
    expect(h.total(100)).toBe(1030)
  })

  test('says whether a height was news, which is what stops a runaway', () => {
    /* The controller resets its settle counter on an outside cause. A height
       that differs from the estimate is one; a height that agrees with it is
       not, and neither is the same height arriving twice. An item can therefore
       surprise the controller once and never again, which is what bounds it. */
    const h = heights(10)
    expect(h.record(0, 25)).toBe(true)
    expect(h.record(0, 25)).toBe(false)
    expect(h.record(1, 10)).toBe(false)
  })

  test('refuses a size that cannot be a height', () => {
    const h = heights(10)
    expect(h.record(0, 0)).toBe(false)
    expect(h.record(0, -5)).toBe(false)
    expect(h.record(0, Number.NaN)).toBe(false)
    expect(h.at(0)).toBe(10)
  })

  test('finds the item at an offset, measured rows and all', () => {
    const h = heights(10)
    h.record(0, 100)
    // 0 spans 0..100, then 1 spans 100..110, 2 spans 110..120.
    expect(h.indexAt(0, 50)).toBe(0)
    expect(h.indexAt(99, 50)).toBe(0)
    expect(h.indexAt(100, 50)).toBe(1)
    expect(h.indexAt(115, 50)).toBe(2)
  })

  test('clamps rather than running off either end', () => {
    const h = heights(10)
    expect(h.indexAt(-40, 5)).toBe(0)
    expect(h.indexAt(10_000, 5)).toBe(4)
    expect(h.indexAt(0, 0)).toBe(0)
    expect(h.before(99, 5)).toBe(50)
  })

  test('moves every unmeasured item when the estimate changes', () => {
    let estimate = 10
    const h = new Heights(() => estimate)
    h.record(0, 100)
    expect(h.total(3)).toBe(120)
    estimate = 20
    /* The measured one holds and the other two follow the new estimate, which
       is the whole reason the estimate is read per call rather than captured. */
    expect(h.total(3)).toBe(140)
  })

  test('forgets, because a new set makes an old index a different item', () => {
    const h = heights(10)
    h.record(0, 100)
    h.forget()
    expect(h.at(0)).toBe(10)
    expect(h.total(3)).toBe(30)
  })

  test('rebuilds from the first index that changed rather than from zero', () => {
    /* Not observable as a number, so it is asserted as behavior: a recording
       far down the set must not disturb what is above it, and the sums either
       side of it have to stay right across repeated reads. */
    const h = heights(10)
    expect(h.before(500, 1000)).toBe(5000)
    h.record(900, 30)
    expect(h.before(500, 1000)).toBe(5000)
    expect(h.before(901, 1000)).toBe(9030)
    expect(h.total(1000)).toBe(10_020)
  })
})
