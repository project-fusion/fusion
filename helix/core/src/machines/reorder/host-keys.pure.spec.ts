import { afterEach, describe, expect, test } from 'bun:test'
import { fakeAnnounce } from '../../capabilities/announce/fake.js'
import { setAnnounce } from '../../capabilities/announce/index.js'
import { serverAnnounce } from '../../capabilities/announce/server.js'
import { fakeGesture } from '../../capabilities/gesture/fake.js'
import { setGesture } from '../../capabilities/gesture/index.js'
import { serverGesture } from '../../capabilities/gesture/server.js'
import { fakeHaptics } from '../../capabilities/haptics/fake.js'
import { setHaptics } from '../../capabilities/haptics/index.js'
import { serverHaptics } from '../../capabilities/haptics/server.js'
import { fakeKeys } from '../../capabilities/keys/fake.js'
import { setKeys } from '../../capabilities/keys/index.js'
import { serverKeys } from '../../capabilities/keys/server.js'
import { fakeMotion } from '../../capabilities/motion/fake.js'
import { setMotion } from '../../capabilities/motion/index.js'
import { serverMotion } from '../../capabilities/motion/server.js'
import type { Transition } from '../../capabilities/types.generated.js'
import { type Runner, run } from '../runner.js'
import { type ReorderSet, reorderHost } from './host.js'
import type { ReorderContext, ReorderInput } from './machine.js'
import * as reorder from './reorder.generated.js'

/*
 * The host and the keys: Escape while a pointer drags, heard anywhere, and a
 * press the machine did not take while the keys hold an item.
 * `host.pure.spec.ts` holds the rest of the host, and the two are one spec
 * split at the 400 lines a file may have.
 */

afterEach(() => {
  setAnnounce(serverAnnounce)
  setGesture(serverGesture)
  setHaptics(serverHaptics)
  setKeys(serverKeys)
  setMotion(serverMotion)
})

const GLIDE: Transition = { duration: 150, easing: 'standard' }

/**
 * Runs a reorder over `a`, `b`, and `c`, 20 tall from 100 down a page that
 * does not scroll, with a fake for each capability the keys and a pointer
 * reach, and each item's drag heard on the item.
 */
const reordering = (glides = false) => {
  const announced = fakeAnnounce()
  const dragged = fakeGesture<string>()
  const touched = fakeHaptics()
  const keys = fakeKeys<string>()
  const moved = fakeMotion<string>()
  setAnnounce(announced)
  setGesture(dragged)
  setHaptics(touched)
  setKeys(keys)
  setMotion(moved)
  const order = ['a', 'b', 'c']
  const set = (): ReorderSet => ({
    all: order,
    axis: 'block',
    enabled: true,
    keys: order,
    rtl: false,
  })
  const asked: string[] = []
  const to: { runner?: Runner<ReorderContext, ReorderInput> } = {}
  const host = reorderHost<string>({
    grip: (key) => `grip ${key}`,
    item: (key) => `item ${key}`,
    locale: () => 'en-US',
    name: (key) => key,
    scroller: () => null,
    send: (event, input) => to.runner?.send(event, input),
    set,
    span: (key) => {
      const start = 100 + order.indexOf(key) * 20
      return { end: start + 20, start }
    },
    transition: () => GLIDE,
    words: () => ({
      canceled: '{name} back',
      dropped: '{name} dropped',
      moved: '',
      pickedUp: '{name} held',
    }),
  })
  const seed: ReorderContext = {
    from: 0,
    glides,
    key: '',
    order: [],
    pointer: 0,
    speed: 0,
    to: 0,
    token: 0,
    x: 0,
    y: 0,
  }
  const runner = run(reorder, seed, host, {
    ask: (_events, proposed) => {
      asked.push(proposed.order.join(','))
      return true
    },
  })
  to.runner = runner
  for (const key of order) {
    host.hear(key, `item ${key}`)
  }
  /** Sends an event about the item with `key` from the keys, as the family does. */
  const send = (event: number, key: string): void => {
    const blank = { at: Number.NaN, end: 0, keyName: '', pointer: 0, spans: [], start: 0 }
    runner.send(event, { ...set(), ...blank, key, token: 0, x: 0, y: 0 })
  }
  /** Puts a pointer down on `a` at 110, lifts it, and drags it past the middle of `b`. */
  const lift = (): void => {
    dragged.down('item a', { x: 0, y: 110 })
    dragged.move('item a', { x: 0, y: 115 })
    dragged.move('item a', { x: 0, y: 135 })
  }
  const said = (): string[] => announced.said.map(({ message }) => message)
  return { asked, dragged, keys, lift, moved, runner, said, send, touched }
}

describe('reorderHost and Escape while a pointer drags', () => {
  test('puts the item back on Escape pressed anywhere, takes the key, and hears the pointer no more', () => {
    const one = reordering()
    one.lift()
    expect([one.runner.state(), one.runner.context().pointer]).toEqual([reorder.STATE_DRAGGING, 1])
    expect(one.keys.listeningAnywhere()).toBe(1)
    expect(one.keys.press('grip c', 'Escape')).toBe(true)
    expect([one.runner.state(), one.keys.listeningAnywhere()]).toEqual([reorder.STATE_IDLE, 0])
    one.dragged.move('item a', { x: 0, y: 155 })
    one.dragged.up('item a')
    expect([one.asked, one.said(), one.touched.played]).toEqual([
      [],
      ['a back'],
      ['lift', 'pass', 'cancel'],
    ])
  })

  test('leaves Escape alone before the item lifts, and every other key while it drags', () => {
    const one = reordering()
    one.dragged.down('item a', { x: 0, y: 110 })
    expect([one.keys.listeningAnywhere(), one.keys.press('grip a', 'Escape')]).toEqual([0, false])
    one.dragged.move('item a', { x: 0, y: 115 })
    const taken = [
      one.keys.press('grip a', 'ArrowDown'),
      one.keys.press('grip a', 'Escape', { claimed: true }),
    ]
    expect([taken, one.runner.state()]).toEqual([[false, false], reorder.STATE_DRAGGING])
  })

  test('glides the item back from where the pointer was, on a host that draws glides', () => {
    const one = reordering(true)
    one.lift()
    one.keys.press('page', 'Escape')
    /* Let go 25 below where the pointer went down. */
    expect([one.runner.state(), one.moved.calls]).toEqual([
      reorder.STATE_RETURNING,
      [
        { call: 'place', node: 'item a', to: { y: 25 } },
        { call: 'glide', node: 'item a', to: { y: 0 }, transition: GLIDE },
      ],
    ])
  })

  test('stops hearing the keys, and says nothing, once stopped mid-drag', () => {
    const one = reordering()
    one.lift()
    one.runner.stop()
    expect([one.keys.listeningAnywhere(), one.keys.press('page', 'Escape'), one.said()]).toEqual([
      0,
      false,
      [],
    ])
  })
})

describe('reorderHost with a press the machine did not take', () => {
  test('leaves an item the keys hold as the system takes the press, on that item or another', () => {
    const one = reordering()
    one.send(reorder.EVENT_PICK, 'a')
    for (const key of ['b', 'a']) {
      one.dragged.down(`item ${key}`, { x: 0, y: 110 })
      one.dragged.cancel(`item ${key}`)
    }
    expect([one.runner.state(), one.runner.context().key, one.said()]).toEqual([
      reorder.STATE_HELD,
      'a',
      ['a held'],
    ])
  })
})
