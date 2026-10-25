import { afterEach, describe, expect, test } from 'bun:test'
import { fakeGesture } from '../../capabilities/gesture/fake.js'
import { setGesture } from '../../capabilities/gesture/index.js'
import { serverGesture } from '../../capabilities/gesture/server.js'
import { fakeHaptics } from '../../capabilities/haptics/fake.js'
import { setHaptics } from '../../capabilities/haptics/index.js'
import { serverHaptics } from '../../capabilities/haptics/server.js'
import { fakeScroll } from '../../capabilities/scroll/fake.js'
import { setScroll } from '../../capabilities/scroll/index.js'
import { serverScroll } from '../../capabilities/scroll/server.js'
import { fakeTimers } from '../../capabilities/timers/fake.js'
import { setTimers } from '../../capabilities/timers/index.js'
import { serverTimers } from '../../capabilities/timers/server.js'
import { type Runner, run } from '../runner.js'
import { type ReorderSet, reorderHost } from './host.js'
import type { ReorderContext, ReorderInput } from './machine.js'
import * as reorder from './reorder.generated.js'

/*
 * The host and an item heard again during a press, as a family hears the
 * held item once a scroll moves the items under a still pointer.
 * `host.pure.spec.ts` holds the rest of the host, and the two are one spec
 * split at the 400 lines a file may have.
 */

afterEach(() => {
  setGesture(serverGesture)
  setHaptics(serverHaptics)
  setScroll(serverScroll)
  setTimers(serverTimers)
})

/* The items stand 20 tall from 100 down the screen, in a box that scrolls
   from 0 to 200, so an item dragged past 160 nears its end. */
const KEYS = ['a', 'b', 'c', 'd', 'e']
const BOX = { end: 200, node: 'page', start: 0 }

const IDLE: ReorderContext = {
  from: 0,
  glides: false,
  key: '',
  order: [],
  pointer: 0,
  speed: 0,
  to: 0,
  token: 0,
  x: 0,
  y: 0,
}

/**
 * Runs a reorder over `KEYS` with a fake for each capability a pointer's drag
 * reaches, and each item's drag heard on the item, as a family hosts it.
 */
const reordering = () => {
  const dragged = fakeGesture<string>()
  const scrolled = fakeScroll<string>()
  const timers = fakeTimers()
  const touched = fakeHaptics()
  setGesture(dragged)
  setHaptics(touched)
  setScroll(scrolled)
  setTimers(timers)
  const set = (): ReorderSet => ({
    all: KEYS,
    axis: 'block',
    enabled: true,
    keys: KEYS,
    rtl: false,
  })
  const asked: string[] = []
  const to: { runner?: Runner<ReorderContext, ReorderInput> } = {}
  const host = reorderHost<string>({
    grip: (key) => `grip ${key}`,
    item: (key) => `item ${key}`,
    locale: () => 'en-US',
    name: (key) => key,
    scroller: () => BOX,
    send: (event, input) => to.runner?.send(event, input),
    set,
    span: (key) => {
      const start = 100 + KEYS.indexOf(key) * 20 - scrolled.offset('page').y
      return { end: start + 20, start }
    },
    transition: () => ({ duration: 150, easing: 'standard' }),
    words: () => ({ canceled: '', dropped: '', moved: '', pickedUp: '' }),
  })
  const runner = run(reorder, IDLE, host, {
    ask: (_events, proposed) => {
      asked.push(proposed.order.join(','))
      return true
    },
    timers,
  })
  to.runner = runner
  const hearing = KEYS.map((key) => host.hear(key, `item ${key}`))
  /** Hears `a` again, with the stops where the items stand now, as a family does once they move. */
  const again = () => host.hear('a', 'item a')
  /** Moves the pointer down on `a` through each of `ys`. */
  const move = (...ys: number[]): void => {
    for (const y of ys) {
      dragged.move('item a', { x: 0, y })
    }
  }
  /** Drags `a` from 110 to 175, near the box's end, and lets four frames scroll the box 20. */
  const scrolledUnder = (): void => {
    dragged.down('item a', { x: 0, y: 110 })
    move(115, 135, 155, 175)
    for (let frame = 0; frame < 4; frame += 1) {
      timers.runFrame()
    }
  }
  return { again, asked, dragged, hearing, move, runner, scrolled, scrolledUnder, touched }
}

describe('reorderHost with an item heard again during a press', () => {
  test('passes the middles where the items stand once a scroll moved them under the pointer', () => {
    const one = reordering()
    one.scrolledUnder()
    /* `b` stands from 100 to 120 now, its middle at 110, and `e` ends at 180. */
    expect([one.scrolled.offset('page').y, one.runner.context().to]).toEqual([20, 4])
    one.again()
    one.move(125)
    expect(one.runner.context().to).toBe(1)
    /* Only `b`'s middle where it stands now lies between 125 and 105. */
    one.move(105)
    expect(one.runner.context().to).toBe(0)
    expect(one.touched.played).toEqual(['lift', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass'])
    expect(one.dragged.listening('item a')).toBe(1)
    one.move(155)
    one.dragged.up('item a')
    expect(one.asked).toEqual(['b,c,d,a,e'])
    expect(one.runner.state()).toBe(reorder.STATE_IDLE)
  })

  test('keeps hearing the item once the stop of its earlier hearing runs after the press', () => {
    const one = reordering()
    one.dragged.down('item a', { x: 0, y: 110 })
    one.move(115)
    const again = one.again()
    one.dragged.up('item a')
    one.hearing[0]?.()
    one.dragged.down('item a', { x: 0, y: 110 }, 2)
    expect([one.runner.state(), one.runner.context().pointer]).toEqual([reorder.STATE_PRESSED, 2])
    again()
    expect(one.dragged.listening('item a')).toBe(0)
  })
})
