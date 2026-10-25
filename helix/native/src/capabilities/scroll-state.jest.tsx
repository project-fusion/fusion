import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { type FakeTimers, fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import type { Scrolled } from '@fusion.dev/helix-core/capabilities/types'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import type { HostInstance, ScrollViewInstance } from 'react-native'
import {
  glides,
  nativeScroll,
  pairAcross,
  QUIET_MS,
  scrolled,
  settled,
  sizedScroll,
} from './scroll'

const original = timers()
let clock: FakeTimers

beforeEach(() => {
  clock = fakeTimers()
  setTimers(clock)
})

afterEach(() => {
  setTimers(original)
})

/** A scroll view as the capability reads one: a node with `scrollTo`. */
const view = () => {
  const scrollTo = jest.fn()
  return { node: { scrollTo } as unknown as ScrollViewInstance, scrollTo }
}

/** A scroll view 100 points square holding content 300 points down. */
const tall = (): ScrollViewInstance => {
  const { node } = view()
  sizedScroll(node, 'content', { height: 300, width: 100 })
  sizedScroll(node, 'frame', { height: 100, width: 100 })
  return node
}

describe('nativeScroll.observe', () => {
  test('tells where a scroll view stands as it scrolls, at each end of each axis', () => {
    const node = tall()
    const heard: Scrolled[] = []
    const stop = nativeScroll.observe(node, (one) => heard.push(one))
    scrolled(node, { x: 0, y: 200 })
    stop()
    scrolled(node, { x: 0, y: 0 })
    expect(heard).toEqual([
      {
        offset: { x: 0, y: 200 },
        settled: false,
        x: { end: true, start: true },
        y: { end: true, start: false },
      },
    ])
  })

  test('says it has settled once it goes a quiet wait without moving', () => {
    const node = tall()
    const heard: boolean[] = []
    nativeScroll.observe(node, (one) => heard.push(one.settled))
    scrolled(node, { x: 0, y: 40 })
    clock.advance(QUIET_MS - 1)
    scrolled(node, { x: 0, y: 80 })
    clock.advance(QUIET_MS - 1)
    expect(heard).toEqual([false, false])
    clock.advance(1)
    expect(heard).toEqual([false, false, true])
  })

  test('waits for a glide to end before it settles', () => {
    const node = tall()
    const heard: boolean[] = []
    nativeScroll.observe(node, (one) => heard.push(one.settled))
    scrolled(node, { x: 0, y: 40 })
    glides(node)
    scrolled(node, { x: 0, y: 120 })
    clock.advance(QUIET_MS * 5)
    expect(heard).toEqual([false, false])
    settled(node)
    expect(heard).toEqual([false, false, true])
  })

  test('reads a scroll view with no lengths reported as standing at every end', () => {
    const { node } = view()
    const heard: Scrolled[] = []
    nativeScroll.observe(node, (one) => heard.push(one))
    settled(node)
    expect(heard[0]).toMatchObject({ x: { end: true, start: true }, y: { end: true, start: true } })
  })
})

describe('nativeScroll.to', () => {
  test('scrolls a scroll view to an offset, gliding where asked', () => {
    const { node, scrollTo } = view()
    nativeScroll.to(node, 10, 20, true)
    nativeScroll.to(node, 0, 0, false)
    expect(scrollTo.mock.calls).toEqual([
      [{ animated: true, x: 10, y: 20 }],
      [{ animated: false, x: 0, y: 0 }],
    ])
  })

  test('moves both of a pair that scrolls both ways, each along its own axis', () => {
    const down = view()
    const across = view()
    pairAcross(down.node, across.node)
    nativeScroll.to(down.node, 30, 60, false)
    expect(across.scrollTo.mock.calls).toEqual([[{ animated: false, x: 30, y: 0 }]])
    expect(down.scrollTo.mock.calls).toEqual([[{ animated: false, x: 0, y: 60 }]])
    pairAcross(down.node, null)
    nativeScroll.to(down.node, 30, 60, false)
    expect(down.scrollTo.mock.calls.at(-1)).toEqual([{ animated: false, x: 30, y: 60 }])
  })

  test('scrolls nothing that is no scroll view', () => {
    expect(() => nativeScroll.to({} as HostInstance, 1, 1, false)).not.toThrow()
  })
})
