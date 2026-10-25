import { describe, expect, test } from 'bun:test'
import { type Compiled, effectNames } from '../conformance.js'
import type { ReorderContext, ReorderInput, ReorderSpan } from './machine.js'
import * as compiled from './reorder.generated.js'

/*
 * Whole moves, event after event, as the web's dom specs and the native
 * pilot's spec make them. `reorder.pure.spec.ts` holds the compiled module to
 * the machine and reads one move at a time, and the two are one spec split at
 * the 400 lines a file may have. Each step's words are an effect, and the
 * host writes them: `list-words.dom.spec.ts` holds the web's wording.
 */

const reorders: Compiled<ReorderContext, ReorderInput> = compiled

/* The rows of the web's specs: `a`, `b`, and `c`, 20 tall from the top. */
const others = (key: string, tall = 20): ReorderSpan[] =>
  ['a', 'b', 'c'].flatMap((one, index) =>
    one === key ? [] : [{ end: (index + 1) * tall, start: index * tall }],
  )

/* What the keys and a click send, which carry no press. A pointer's moments
   go through `point`, as the press the host numbers 1. */
const base: ReorderInput = {
  all: ['a', 'b', 'c'],
  at: Number.NaN,
  axis: 'block',
  enabled: true,
  end: 400,
  key: 'b',
  keyName: 'ArrowDown',
  keys: ['a', 'b', 'c'],
  pointer: 0,
  rtl: false,
  spans: others('b'),
  start: 0,
  token: 0,
  x: 0,
  y: 0,
}

const input = (over: Partial<ReorderInput> = {}): ReorderInput => ({ ...base, ...over })

/** Whether a listener refuses a request event, given the order it asks for. */
type Refuses = (ask: string, order: readonly string[]) => boolean

/* **A host, as a page runs the module**: it keeps the state and the context,
   sends each event a request asks with until a listener refuses one, takes
   the outcome, and records the effects it runs, each order it asks for, and
   each request event it sends. */
const host = (glides = false, refuses: Refuses = () => false) => {
  const run = {
    context: {
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
    } as ReorderContext,
    state: 0,
  }
  run.state = reorders.start(run.context)
  const log: string[] = []
  const asked: string[] = []
  const apply = (move: compiled.Move | undefined): boolean => {
    if (move !== undefined) {
      run.context = move.context
      run.state = move.state
      log.push(...effectNames(reorders, move.effects))
    }
    return move !== undefined
  }
  const ask = (request: compiled.Asking): compiled.Move => {
    const order = request.accept.context.order
    log.push(`ask ${order.join(',')}`)
    for (const name of request.ask.map((code) => reorders.ASKS[code] ?? '')) {
      asked.push(name)
      if (refuses(name, order)) {
        return request.refuse
      }
    }
    return request.accept
  }
  const send = (event: number, over: Partial<ReorderInput> = {}): boolean => {
    const answer = reorders.step(run.state, run.context, event, input(over))
    return apply(answer !== undefined && 'ask' in answer ? ask(answer) : answer)
  }
  /* Sends a moment of the press the host numbered 1. */
  const point = (event: number, over: Partial<ReorderInput> = {}): boolean =>
    send(event, { pointer: 1, ...over })
  /* The timers capability ends a deadline its state is still in. */
  const expire = (node: string): boolean =>
    apply(reorders.expire(run.state, run.context, reorders.NODES.indexOf(node)))
  const now = () => reorders.STATES[run.state]
  return { asked, expire, log, now, point, run, send }
}

const refuseAll: Refuses = () => true

const {
  EVENT_CANCEL: CANCEL,
  EVENT_DRAG: DRAG,
  EVENT_DROP: DROP,
  EVENT_GLIDED: GLIDED,
  EVENT_LANDED: LANDED,
  EVENT_NUDGE: NUDGE,
  EVENT_PICK: PICK,
  EVENT_PRESS: PRESS,
  EVENT_RELEASE: RELEASE,
  EVENT_STEP: STEP,
  EVENT_TARGET: TARGET,
  EVENT_TICK: TICK,
} = compiled

describe('the keys and a click (reorder-controller.dom.spec.ts, list-reorder.dom.spec.ts)', () => {
  test('takes hold of the item, and the arrows move it, saying where it is', () => {
    const one = host()
    one.send(PICK, { key: 'a' })
    one.send(STEP, { key: 'a' })
    one.send(STEP, { key: 'a', keyName: 'End' })
    expect([one.log, one.run.context.to]).toEqual([['picked-up', 'moved', 'moved'], 2])
  })

  test('a second click on the grip drops it, asking first, once', () => {
    const one = host()
    one.send(PICK, { key: 'c' })
    one.send(STEP, { key: 'c', keyName: 'Home' })
    one.send(PICK, { key: 'c' })
    expect(one.log.filter((line) => line.startsWith('ask'))).toEqual(['ask c,a,b'])
    expect(one.log.slice(-2)).toEqual(['dropped', 'refocus'])
  })

  test('Escape puts it back and asks for nothing, and a refused drop is said as canceled', () => {
    const back = host()
    back.send(PICK, { key: 'a' })
    back.send(STEP, { key: 'a' })
    back.send(CANCEL, { key: 'a' })
    expect(back.log).toEqual(['picked-up', 'moved', 'canceled'])
    const refused = host(false, refuseAll)
    refused.send(PICK, { key: 'a' })
    refused.send(STEP, { key: 'a' })
    refused.send(DROP, { key: 'a' })
    expect([refused.log.slice(-2), refused.now()]).toEqual([['ask b,a,c', 'canceled'], 'idle'])
  })

  test('a pointer click on another item drops it by the half it lands in', () => {
    const one = host()
    one.send(PICK, { key: 'c' })
    one.send(TARGET, { at: 24, key: 'b', spans: others('c') })
    expect([one.run.context.to, one.run.context.order]).toEqual([1, ['a', 'c', 'b']])
  })

  test('a click on an item the held one does not move among drops nothing', () => {
    const one = host()
    one.send(PICK, { key: 'a', keys: ['a', 'b'] })
    expect(one.send(TARGET, { key: 'c', keys: ['a', 'b'] })).toBe(false)
  })

  test('a move with the keys draws no preview, and a pointer drag lifts one', () => {
    const keys = host()
    keys.send(PICK)
    keys.send(STEP)
    const drag = host()
    drag.point(PRESS, { key: 'a', spans: others('a'), y: 10 })
    drag.point(DRAG, { at: 55, key: 'a', spans: others('a'), y: 55 })
    expect([keys.log.includes('lift'), drag.log]).toEqual([false, ['lift', 'frame', 'listen']])
  })
})

describe('Alt with an arrow (reorder-controller.dom.spec.ts)', () => {
  test('moves the item a place at once, says where it went, and gives it focus back', () => {
    const one = host()
    one.send(NUDGE, { key: 'a' })
    expect([one.log, one.now()]).toEqual([['ask b,a,c', 'moved', 'refocus'], 'idle'])
    one.send(NUDGE, { key: 'c', keyName: 'Home' })
    expect([one.run.context.from, one.run.context.to]).toEqual([2, 0])
  })

  test('keeps the key at an end and moves nothing', () => {
    const one = host()
    expect(one.send(NUDGE, { key: 'a', keyName: 'ArrowUp' })).toBe(true)
    expect(one.log).toEqual([])
  })

  test('a refused move is said as canceled, every time', () => {
    const one = host(false, refuseAll)
    one.send(NUDGE)
    one.send(NUDGE)
    one.send(NUDGE)
    expect(one.log.filter((line) => line === 'canceled')).toHaveLength(3)
  })

  test('a refused move is said with the name of the item it was for', () => {
    const one = host(false, (_ask, order) => order[0] === 'c')
    one.send(NUDGE, { key: 'a' })
    one.send(NUDGE, { key: 'c', keyName: 'Home' })
    expect([one.log.at(-1), one.run.context.key, one.run.context.to]).toEqual(['canceled', 'c', 0])
  })

  test('leaves the key alone while items may not move', () => {
    expect(host().send(NUDGE, { enabled: false })).toBe(false)
    expect(host().send(PICK, { enabled: false })).toBe(false)
    expect(host().point(PRESS, { enabled: false })).toBe(false)
  })

  test('moves an item among its siblings, and a key a filter hides keeps its place', () => {
    const tree = host()
    tree.send(NUDGE, { all: ['b', 'c'], keys: ['b', 'c'] })
    expect([tree.run.context.from, tree.run.context.to]).toEqual([0, 1])
    const filtered = host()
    filtered.send(NUDGE, { all: ['a', 'x', 'b', 'c'], key: 'a' })
    expect(filtered.run.context.order).toEqual(['x', 'b', 'a', 'c'])
  })
})

describe('asking for a move (reorder-controller.dom.spec.ts)', () => {
  test('sends helix-before-reorder, then helix-reorder', () => {
    const one = host()
    one.send(NUDGE, { key: 'a' })
    expect([one.asked, one.log.at(-2)]).toEqual([['before-reorder', 'reorder'], 'moved'])
  })

  test('stops at a refused helix-before-reorder, and a refused helix-reorder puts the item back', () => {
    const before = host(false, (ask) => ask === 'before-reorder')
    before.send(NUDGE, { key: 'a' })
    const after = host(false, (ask) => ask === 'reorder')
    after.send(NUDGE, { key: 'a' })
    expect([before.asked, before.log.at(-1)]).toEqual([['before-reorder'], 'canceled'])
    expect([after.asked, after.log.at(-1)]).toEqual([['before-reorder', 'reorder'], 'canceled'])
  })
})

describe('a pointer dragging a grip (reorder-controller.dom.spec.ts, list-reorder.dom.spec.ts)', () => {
  test('holds the item once it travels, places it under the pointer, and drops it on release', () => {
    const one = host()
    const spans = others('a')
    one.point(PRESS, { key: 'a', y: 10 })
    expect(one.point(DRAG, { at: 12, key: 'a', spans, y: 12 })).toBe(false)
    one.point(DRAG, { at: 55, key: 'a', spans, y: 55 })
    one.point(RELEASE, { key: 'a' })
    const ending = ['unlisten', 'untrack', 'dropped']
    expect(one.log).toEqual(['lift', 'frame', 'listen', 'ask b,c,a', ...ending])
  })

  test('a press that does not travel, or a canceled pointer, moves nothing', () => {
    const one = host()
    one.point(PRESS, { y: 30 })
    one.point(RELEASE)
    const canceled = host()
    canceled.point(PRESS)
    canceled.point(DRAG, { at: 55, y: 10 })
    canceled.point(CANCEL)
    expect([one.log, canceled.log.slice(-2)]).toEqual([['untrack'], ['untrack', 'canceled']])
    expect(canceled.log.some((line) => line.startsWith('ask'))).toBe(false)
  })
})

/* **The host sends every moment of the press it hears**, a press the machine
   did not take included, and the keys send events about the grip that has
   focus. Only the move's own press and item move it or end it. */
describe('the events of another press or another item', () => {
  test('a press the machine did not take leaves an item the keys hold, even as the system takes it', () => {
    const one = host()
    one.send(PICK, { key: 'a' })
    const stray = [
      one.point(PRESS, { key: 'b' }),
      one.point(CANCEL, { key: 'b' }),
      one.point(CANCEL, { key: 'a' }),
      one.send(CANCEL, { key: 'b' }),
      one.send(STEP, { key: 'b' }),
    ]
    expect([stray, one.now()]).toEqual([[false, false, false, false, false], 'held'])
    expect([one.send(CANCEL, { key: 'a' }), one.log]).toEqual([true, ['picked-up', 'canceled']])
  })

  /* The controller hears Escape on the window while a pointer drags, and
     the host sends it as `CANCEL` for the press (reorder-controller.dom.spec.ts). */
  test('a drag moves and ends only for its own press and item, and Escape for the press puts it back', () => {
    const one = host()
    const spans = others('a')
    one.point(PRESS, { key: 'a', y: 10 })
    one.point(DRAG, { at: 55, key: 'a', spans, y: 55 })
    const stray = [
      one.point(DRAG, { at: 5, key: 'a', pointer: 2, spans }),
      one.point(DRAG, { at: 5, key: 'b' }),
      one.point(RELEASE, { key: 'a', pointer: 2 }),
      one.point(CANCEL, { key: 'b' }),
      one.send(DROP, { key: 'a' }),
      one.send(CANCEL, { key: 'a' }),
    ]
    expect([stray, one.now(), one.run.context.to]).toEqual([stray.map(() => false), 'dragging', 2])
    one.point(CANCEL, { key: 'a' })
    expect([one.now(), one.log.slice(-3)]).toEqual(['idle', ['unlisten', 'untrack', 'canceled']])
  })
})

/* **The native pilot's renderer, now retired,** kept `lifted`,
   `landing`, and `ticking` as flags. Each is a state here, each frame and
   glide ends in an event with a token, and the wait for the page is a
   deadline. Its rows are 40 tall, and a held row is placed by its own
   middle. */
describe('the native pilot (render.pure.spec.ts)', () => {
  /** A host that draws glides, with `a` dragged past both others and let go. */
  const dropped = (refuses?: Refuses) => {
    const one = host(true, refuses)
    one.point(PRESS, { key: 'a' })
    one.point(DRAG, { at: 20 + 90, key: 'a', spans: others('a', 40), y: 90 })
    one.point(RELEASE, { key: 'a' })
    return one
  }

  test('a held item goes where it is dropped, and lands once the page draws the order', () => {
    const one = dropped()
    const landed = ['ask b,c,a', 'unlisten', 'untrack', 'dropped', 'land', 'deadline']
    expect(one.log.slice(-6)).toEqual(landed)
    expect(one.send(LANDED, { all: ['a', 'b', 'c'] })).toBe(false)
    one.send(LANDED, { all: ['b', 'c', 'a'] })
    expect([one.now(), one.log.at(-1)]).toEqual(['idle', 'deadline-end'])
  })

  test('a refused move goes back, and nothing else moves until it is back', () => {
    const one = host(true, refuseAll)
    one.point(PRESS, { key: 'c' })
    one.point(DRAG, { at: 100 - 90, key: 'c', spans: others('c', 40), y: 90 })
    one.point(RELEASE, { key: 'c' })
    expect([one.now(), one.log.slice(-5)]).toEqual([
      'returning',
      ['ask c,a,b', 'unlisten', 'untrack', 'canceled', 'back'],
    ])
    expect([one.send(NUDGE), one.point(PRESS)]).toEqual([false, false])
    one.send(GLIDED, { token: one.run.context.token })
    expect(one.now()).toBe('idle')
    expect(one.send(NUDGE, { key: 'a', keyName: 'ArrowUp' })).toBe(true)
  })

  test('a refused move gives its glide back a token of its own', () => {
    const one = dropped(refuseAll)
    const { token } = one.run.context
    expect([one.send(GLIDED, { token: token - 1 }), one.now()]).toEqual([false, 'returning'])
  })

  test('a release where it started, and a cancel, glide back', () => {
    const still = host(true)
    still.point(PRESS)
    still.point(DRAG, { at: 30, y: 10 })
    still.point(RELEASE)
    const canceled = host(true)
    canceled.point(PRESS)
    canceled.point(DRAG, { at: 55, y: 10 })
    canceled.point(CANCEL)
    expect([still.now(), canceled.now()]).toEqual(['returning', 'returning'])
    expect(still.log.slice(-3)).toEqual(['untrack', 'dropped', 'back'])
    expect(canceled.log.slice(-3)).toEqual(['untrack', 'canceled', 'back'])
  })

  test('a page that does not draw within a second sends a landed item back, and a stale end is ignored', () => {
    const one = dropped()
    const { token } = one.run.context
    one.expire('landing')
    expect([one.now(), one.log.slice(-2)]).toEqual(['returning', ['deadline-end', 'back']])
    expect(one.send(GLIDED, { token })).toBe(false)
    one.send(GLIDED, { token: token + 1 })
    expect([one.now(), one.expire('landing')]).toEqual(['idle', false])
  })

  test('each frame asks for the next while the drag lasts, and a stale frame ends its loop', () => {
    const one = host(true)
    one.point(PRESS)
    one.point(DRAG, { at: 30, y: 10 })
    const first = one.run.context.token
    one.send(TICK, { at: 395, token: first })
    expect([one.now(), one.run.context.speed, one.log.slice(-2)]).toEqual([
      'dragging',
      11,
      ['scroll', 'frame'],
    ])
    expect(one.send(TICK, { token: first })).toBe(false)
    one.point(RELEASE)
    expect(one.send(TICK, { token: one.run.context.token })).toBe(false)
  })

  test('a held item stays under the finger as the page scrolls, and passes what it scrolls past', () => {
    const one = host(true)
    one.point(PRESS, { key: 'a' })
    one.point(DRAG, { at: 20 + 4, key: 'a', spans: others('a', 40), y: 4 })
    /* The finger is still, and the page scrolled 90 under it. */
    one.point(DRAG, { at: 20 + 4 + 90, key: 'a', spans: others('a', 40), y: 4 })
    expect([one.now(), one.run.context.to, one.log.at(-1)]).toEqual(['dragging', 2, 'pass'])
  })

  test('nothing moves where the set does not allow it', () => {
    expect(host(true).point(PRESS, { enabled: false })).toBe(false)
  })
})
