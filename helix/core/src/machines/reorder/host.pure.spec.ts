import { afterEach, describe, expect, test } from 'bun:test'
import { fakeAnnounce } from '../../capabilities/announce/fake.js'
import { setAnnounce } from '../../capabilities/announce/index.js'
import { serverAnnounce } from '../../capabilities/announce/server.js'
import { fakeFocus } from '../../capabilities/focus/fake.js'
import { setFocus } from '../../capabilities/focus/index.js'
import { serverFocus } from '../../capabilities/focus/server.js'
import { fakeGesture } from '../../capabilities/gesture/fake.js'
import { setGesture } from '../../capabilities/gesture/index.js'
import { serverGesture } from '../../capabilities/gesture/server.js'
import { fakeHaptics } from '../../capabilities/haptics/fake.js'
import { setHaptics } from '../../capabilities/haptics/index.js'
import { serverHaptics } from '../../capabilities/haptics/server.js'
import { fakeMotion } from '../../capabilities/motion/fake.js'
import { setMotion } from '../../capabilities/motion/index.js'
import { serverMotion } from '../../capabilities/motion/server.js'
import { fakeScroll } from '../../capabilities/scroll/fake.js'
import { setScroll } from '../../capabilities/scroll/index.js'
import { serverScroll } from '../../capabilities/scroll/server.js'
import { fakeTimers } from '../../capabilities/timers/fake.js'
import { setTimers } from '../../capabilities/timers/index.js'
import { serverTimers } from '../../capabilities/timers/server.js'
import type { Transition } from '../../capabilities/types.generated.js'
import { type Runner, run } from '../runner.js'
import { type ReorderSet, type ReorderWords, reorderHost } from './host.js'
import type { ReorderContext, ReorderInput } from './machine.js'
import * as reorder from './reorder.generated.js'

afterEach(() => {
  setAnnounce(serverAnnounce)
  setFocus(serverFocus)
  setGesture(serverGesture)
  setHaptics(serverHaptics)
  setMotion(serverMotion)
  setScroll(serverScroll)
  setTimers(serverTimers)
})

/* The page's items stand 20 tall from 100 down the screen, in a box that
   scrolls from 0 to 200, so an item dragged past 160 nears its end. */
const TOP = 100
const TALL = 20
const BOX = { end: 200, node: 'page', start: 0 }

const NAMES: Readonly<Record<string, string>> = {
  a: 'Apples',
  b: 'Bread',
  c: 'Cheese',
  d: 'Dates',
  e: 'Eggs',
}

/* Words that say each place, so a spec reads which place each step names. */
const WORDS: ReorderWords = {
  canceled: '{name} back at position {position}',
  dropped: 'Dropped {name} at position {position} of {count}',
  moved: '{name} moved to position {position} of {count}',
  pickedUp: 'Picked up {name}',
}

const GLIDE: Transition = { duration: 150, easing: 'standard' }

/** Nothing held, on a host that draws glides where `glides`. */
const idle = (glides: boolean): ReorderContext => ({
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
})

/** How a page answers the move it is asked for, and whether the host draws glides. */
interface Page {
  readonly answer?: (order: readonly string[]) => boolean
  readonly glides?: boolean
}

/**
 * Runs a reorder over `keys` with a fake for each capability, as a family
 * hosts it: each item's drag heard on the item, and the page drawing the
 * order it holds. `asked` keeps each order the page is asked for.
 */
const reordering = (
  keys: readonly string[],
  { answer = () => true, glides = false }: Page = {},
) => {
  const announced = fakeAnnounce()
  const focused = fakeFocus<string>()
  const dragged = fakeGesture<string>()
  const touched = fakeHaptics()
  const moved = fakeMotion<string>()
  const scrolled = fakeScroll<string>()
  const timers = fakeTimers()
  setAnnounce(announced)
  setFocus(focused)
  setGesture(dragged)
  setHaptics(touched)
  setMotion(moved)
  setScroll(scrolled)
  setTimers(timers)
  const page = { order: [...keys] }
  const asked: string[] = []
  const set = (): ReorderSet => ({
    all: page.order,
    axis: 'block',
    enabled: true,
    keys: page.order,
    rtl: false,
  })
  const to: { runner?: Runner<ReorderContext, ReorderInput> } = {}
  const host = reorderHost<string>({
    grip: (key) => `grip ${key}`,
    item: (key) => `item ${key}`,
    locale: () => 'en-US',
    name: (key) => NAMES[key] ?? key,
    scroller: () => BOX,
    send: (event, input) => to.runner?.send(event, input),
    set,
    span: (key) => {
      const place = page.order.indexOf(key)
      const start = TOP + place * TALL - scrolled.offset('page').y
      return place < 0 ? undefined : { end: start + TALL, start }
    },
    transition: () => GLIDE,
    words: () => WORDS,
  })
  const runner = run(reorder, idle(glides), host, {
    ask: (_events, proposed) => {
      asked.push(proposed.order.join(','))
      return answer(proposed.order)
    },
    timers,
  })
  to.runner = runner
  const hearing = keys.map((key) => host.hear(key, `item ${key}`))
  /** Sends an event about the item with `key` from the keys, as the family does. */
  const send = (event: number, key: string, fields: Partial<ReorderInput> = {}): void => {
    runner.send(event, {
      ...set(),
      at: Number.NaN,
      end: 0,
      key,
      keyName: '',
      pointer: 0,
      spans: [],
      start: 0,
      token: 0,
      x: 0,
      y: 0,
      ...fields,
    })
  }
  /** Puts a pointer down on the item with `key`, `y` down the screen. */
  const down = (key: string, y: number, pointer = 1): void => {
    dragged.down(`item ${key}`, { x: 0, y }, pointer)
  }
  /** Moves the pointer down on the item with `key` through each of `ys`. */
  const move = (key: string, ...ys: number[]): void => {
    for (const y of ys) {
      dragged.move(`item ${key}`, { x: 0, y })
    }
  }
  const said = (): string[] => announced.said.map(({ message }) => message)
  return {
    announced,
    asked,
    down,
    dragged,
    focused,
    hearing,
    move,
    moved,
    page,
    runner,
    said,
    scrolled,
    send,
    timers,
    touched,
  }
}

/** `a` dragged down past `b` and `c` and let go: from 110 to 155, past their middles. */
const draggedPast = (one: ReturnType<typeof reordering>): void => {
  one.down('a', 110)
  one.move('a', 115, 135, 155)
  one.dragged.up('item a')
}

describe('reorderHost with the keys', () => {
  test('says each step, plays its touch, and gives the grip focus back once the page takes the move', () => {
    const one = reordering(['a', 'b', 'c'])
    one.send(reorder.EVENT_PICK, 'a')
    one.send(reorder.EVENT_STEP, 'a', { keyName: 'ArrowDown' })
    one.send(reorder.EVENT_STEP, 'a', { keyName: 'End' })
    one.send(reorder.EVENT_DROP, 'a')
    expect(one.asked).toEqual(['b,c,a'])
    expect(one.said()).toEqual([
      'Picked up Apples',
      'Apples moved to position 2 of 3',
      'Apples moved to position 3 of 3',
      'Dropped Apples at position 3 of 3',
    ])
    expect(one.announced.said.every(({ urgency }) => urgency === 'polite')).toBe(true)
    expect(one.touched.played).toEqual(['lift', 'pass', 'pass', 'drop'])
    expect(one.focused.moved).toEqual([{ node: 'grip a', preventScroll: false }])
  })

  test('leaves focus where the page put it, and says a refused nudge with the place the item stays at', () => {
    const kept = reordering(['a', 'b', 'c'])
    kept.focused.place('search')
    kept.send(reorder.EVENT_NUDGE, 'a', { keyName: 'ArrowDown' })
    expect(kept.said()).toEqual(['Apples moved to position 2 of 3'])
    expect(kept.focused.moved).toEqual([])
    const refused = reordering(['a', 'b', 'c'], { answer: () => false })
    refused.send(reorder.EVENT_NUDGE, 'a', { keyName: 'ArrowDown' })
    expect([refused.said(), refused.touched.played]).toEqual([
      ['Apples back at position 1'],
      ['cancel'],
    ])
    expect(refused.focused.moved).toEqual([])
  })
})

describe('reorderHost with a pointer', () => {
  test('presses, lifts past the slop, passes each middle, and drops on release', () => {
    const one = reordering(['a', 'b', 'c'])
    one.down('a', 110)
    one.move('a', 112)
    expect(one.runner.state()).toBe(reorder.STATE_PRESSED)
    expect(one.timers.pending().frames).toBe(0)
    one.move('a', 115)
    expect(one.runner.state()).toBe(reorder.STATE_DRAGGING)
    expect(one.timers.pending().frames).toBe(1)
    one.move('a', 135, 155)
    expect(one.runner.context().to).toBe(2)
    one.dragged.up('item a')
    expect(one.asked).toEqual(['b,c,a'])
    expect(one.touched.played).toEqual(['lift', 'pass', 'pass', 'drop'])
    expect(one.said()).toEqual(['Dropped Apples at position 3 of 3'])
    expect(one.runner.state()).toBe(reorder.STATE_IDLE)
    expect(one.timers.pending().frames).toBe(0)
    expect(one.moved.calls).toEqual([])
  })

  test('scrolls the box near its end each frame, passes what scrolls past the still pointer, and glides on from where the scroll carried the item', () => {
    const one = reordering(['a', 'b', 'c', 'd', 'e'], { glides: true })
    one.down('a', 110)
    one.move('a', 115, 135, 155, 175)
    expect(one.runner.context().to).toBe(3)
    one.timers.runFrame()
    one.timers.runFrame()
    one.timers.runFrame()
    /* 15 inside the last 40 of the box: 12 a frame at the edge, 5 here. */
    const step = { call: 'by', node: 'page', x: 0, y: 5 } as const
    expect(one.scrolled.calls).toEqual([step, step, step])
    expect(one.runner.context().to).toBe(3)
    one.timers.runFrame()
    expect(one.runner.context().to).toBe(4)
    expect(one.touched.played).toEqual(['lift', 'pass', 'pass', 'pass', 'pass'])
    one.dragged.up('item a')
    expect(one.asked).toEqual(['b,c,d,e,a'])
    expect(one.timers.pending().frames).toBe(0)
    /* Let go 65 below where it went down, over a box scrolled 20 under it.
       Its new place is 80 below its own, where `e` ends. */
    expect(one.moved.calls).toEqual([
      { call: 'place', node: 'item a', to: { y: 85 } },
      { call: 'glide', node: 'item a', to: { y: 80 }, transition: GLIDE },
    ])
  })

  test('hears only the pointer that went down first', () => {
    const one = reordering(['a', 'b', 'c'])
    one.down('a', 110, 1)
    one.down('b', 130, 2)
    one.move('b', 150)
    one.dragged.up('item b')
    expect([one.runner.state(), one.runner.context().key]).toEqual([reorder.STATE_PRESSED, 'a'])
    one.move('a', 135)
    expect([one.runner.state(), one.runner.context().to]).toEqual([reorder.STATE_DRAGGING, 1])
  })

  test('sends nothing more, ends the frame, and says nothing once stopped mid-drag', () => {
    const one = reordering(['a', 'b', 'c'])
    one.down('a', 110)
    one.move('a', 115)
    one.runner.stop()
    expect(one.timers.pending().frames).toBe(0)
    one.move('a', 135)
    one.dragged.up('item a')
    expect([one.asked, one.said(), one.touched.played]).toEqual([[], [], ['lift']])
    for (const stop of one.hearing) {
      stop()
    }
    expect(one.dragged.listening('item a')).toBe(0)
  })

  test('says nothing for a drop the page takes as it stops the runner', () => {
    const one = reordering(['a', 'b', 'c'], {
      answer: () => {
        one.runner.stop()
        return true
      },
    })
    draggedPast(one)
    expect([one.asked, one.said(), one.touched.played]).toEqual([
      ['b,c,a'],
      [],
      ['lift', 'pass', 'pass'],
    ])
  })
})

describe('reorderHost on a host that draws glides', () => {
  test('glides a dropped item on from where it was let go, and lands once the page draws the order', () => {
    const one = reordering(['a', 'b', 'c'], { glides: true })
    draggedPast(one)
    /* Let go 45 below where it went down. Its new place is 40 below its own:
       `b` and `c` close up behind it. */
    expect(one.moved.calls).toEqual([
      { call: 'place', node: 'item a', to: { y: 45 } },
      { call: 'glide', node: 'item a', to: { y: 40 }, transition: GLIDE },
    ])
    expect(one.runner.state()).toBe(reorder.STATE_LANDING)
    one.page.order = ['b', 'c', 'a']
    one.moved.arrive('item a')
    expect(one.runner.state()).toBe(reorder.STATE_IDLE)
    expect(one.timers.pending().timeouts).toBe(0)
  })

  test('glides from where it was let go to its new place where the page drew the order as it took the move', () => {
    const one = reordering(['a', 'b', 'c'], {
      answer: (order) => {
        one.page.order = [...order]
        return true
      },
      glides: true,
    })
    draggedPast(one)
    /* The item stands at its new place, 40 below its own, so 45 below its own
       is 5 below the new one. */
    expect(one.moved.calls).toEqual([
      { call: 'place', node: 'item a', to: { y: 5 } },
      { call: 'glide', node: 'item a', to: { y: 0 }, transition: GLIDE },
    ])
    one.moved.arrive('item a')
    expect(one.runner.state()).toBe(reorder.STATE_IDLE)
  })

  test('glides the item back where the page has not drawn the order a second after the drop', () => {
    const one = reordering(['a', 'b', 'c'], { glides: true })
    draggedPast(one)
    one.moved.arrive('item a')
    expect(one.runner.state()).toBe(reorder.STATE_LANDING)
    /* A press the machine does not take while the item lands moves nothing. */
    one.down('b', 130)
    one.move('b', 150)
    one.dragged.up('item b')
    one.timers.advance(1000)
    expect(one.runner.state()).toBe(reorder.STATE_RETURNING)
    expect(one.moved.calls.slice(1)).toEqual([
      { call: 'glide', node: 'item a', to: { y: 40 }, transition: GLIDE },
      { call: 'glide', node: 'item a', to: { y: 0 }, transition: GLIDE },
    ])
    one.moved.arrive('item a')
    expect(one.runner.state()).toBe(reorder.STATE_IDLE)
  })

  test('glides a refused drop back from where it was let go, and moves nothing else until it is back', () => {
    const one = reordering(['a', 'b', 'c'], { answer: () => false, glides: true })
    draggedPast(one)
    expect(one.said()).toEqual(['Apples back at position 1'])
    expect(one.touched.played).toEqual(['lift', 'pass', 'pass', 'cancel'])
    expect(one.moved.calls).toEqual([
      { call: 'place', node: 'item a', to: { y: 45 } },
      { call: 'glide', node: 'item a', to: { y: 0 }, transition: GLIDE },
    ])
    one.send(reorder.EVENT_NUDGE, 'b', { keyName: 'ArrowDown' })
    expect(one.asked).toEqual(['b,c,a'])
    one.moved.arrive('item a')
    expect(one.runner.state()).toBe(reorder.STATE_IDLE)
  })
})
