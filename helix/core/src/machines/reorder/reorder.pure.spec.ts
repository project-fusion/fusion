import { describe, expect, test } from 'bun:test'
import { type Compiled, conforms, coverage, effectNames, stateOf } from '../conformance.js'
import type { ReorderContext, ReorderInput } from './machine.js'
import { reorder } from './machine.js'
import * as compiled from './reorder.generated.js'

/*
 * The compiled module held to the machine, and the web's `reorderStep` case by
 * case. Each case starts from a state and a context and reads the one move
 * the module makes. `reorder-moves.pure.spec.ts` runs whole moves, and the
 * two are one spec split at the 400 lines a file may have.
 */

const reorders: Compiled<ReorderContext, ReorderInput> = compiled

/* Three items, `b` in the middle. Beside `b`, `a` runs 0 to 20 and `c` 40 to
   60, so `at` 5 is place 0, 30 is place 1, and 55 is place 2. */
const base: ReorderInput = {
  all: ['a', 'b', 'c'],
  at: Number.NaN,
  axis: 'block',
  enabled: true,
  end: 400,
  key: 'b',
  keyName: 'ArrowDown',
  keys: ['a', 'b', 'c'],
  pointer: 1,
  rtl: false,
  spans: [
    { end: 20, start: 0 },
    { end: 60, start: 40 },
  ],
  start: 0,
  token: 3,
  x: 0,
  y: 0,
}

const input = (over: Partial<ReorderInput> = {}): ReorderInput => ({ ...base, ...over })

/* Every reading a guard tells apart: `b` held where it started or moved on,
   on a host that draws glides and one that draws none. */
const held: ReorderContext = {
  from: 1,
  glides: false,
  key: 'b',
  order: ['a', 'c', 'b'],
  pointer: 1,
  speed: 0,
  to: 1,
  token: 3,
  x: 0,
  y: 0,
}
const contexts: ReorderContext[] = [false, true].flatMap((glides) =>
  [1, 2].map((to) => ({ ...held, glides, to })),
)
const overs: Partial<ReorderInput>[] = [
  {},
  { enabled: false },
  { key: 'z' },
  { key: 'a' },
  { at: 30, key: 'a' },
  { key: 'c' },
  { keyName: 'End' },
  { keyName: 'Home' },
  { keyName: 'a' },
  { at: 5 },
  { at: 55 },
  { pointer: 2, y: 10 },
  { y: 10 },
  { y: 2 },
  { token: 2 },
  { all: ['a', 'c', 'b'] },
  { at: 55, axis: 'inline', keyName: 'ArrowLeft', rtl: true },
]
const inputs = overs.map((over) => input(over))

/** Every guard the machine names. */
const GUARDS = [
  'drawn',
  'elsewhere',
  'elsewhereStill',
  'fresh',
  'lifts',
  'movable',
  'nudges',
  'nudging',
  'own',
  'ownStill',
  'passes',
  'same',
  'sameGlides',
  'sameStill',
  'sameStillGlides',
  'stepping',
  'steps',
]

type Answer = compiled.Move | compiled.Asking | undefined

/** The states an answer can leave the machine in: a move's, or each outcome of a request. */
const outcomes = (answer: Answer): number[] => {
  if (answer === undefined) {
    return []
  }
  return 'ask' in answer ? [answer.accept.state, answer.refuse.state] : [answer.state]
}

/** The states one move takes the module to from `state`, by an event or a deadline, under the samples. */
const nextOf = (state: number): number[] =>
  contexts.flatMap((context) => [
    ...inputs.flatMap((one) =>
      reorders.EVENTS.flatMap((_, event) => outcomes(reorders.step(state, context, event, one))),
    ),
    ...reorders.NODES.flatMap((_, owner) => outcomes(reorders.expire(state, context, owner))),
  ])

describe('the compiled reorder module', () => {
  test('answers every event, deadline, and cancel in every state as the machine does', () => {
    expect(conforms(reorder, reorders, contexts, inputs)).toEqual([])
  })

  test('numbers the events in the order the machine writes them', () => {
    const codes = reorder.events.map(
      (name) => (compiled as Record<string, unknown>)[`EVENT_${name}`],
    )
    expect(codes).toEqual(reorder.events.map((_, index) => index))
  })

  test('the samples start at rest and give every guard both answers', () => {
    const answers = GUARDS.flatMap((name) => [`${name} false`, `${name} true`])
    expect(coverage(reorder, contexts, inputs)).toEqual(new Set(['idle', ...answers]))
  })

  /* The machine starts at rest from every context, so `coverage` names one
     state, and this walk reaches the others. */
  test('the samples reach every state from the start', () => {
    const reached = new Set([reorders.start(held)])
    for (const state of reached) {
      for (const next of nextOf(state)) {
        reached.add(next)
      }
    }
    const names = [...reached].map((state) => reorders.STATES[state])
    expect(new Set(names)).toEqual(new Set(reorders.STATES))
  })
})

const send = (from: string, event: number, over: Partial<ReorderInput> = {}, context = held) =>
  reorders.step(stateOf(reorders, from), context, event, input(over))

/** A move's names: where it leaves the machine, and its effects in order. */
const read = (answer: Answer) => {
  const move = answer !== undefined && 'ask' in answer ? undefined : answer
  return {
    effects: effectNames(reorders, move?.effects),
    state: move === undefined ? undefined : reorders.STATES[move.state],
  }
}

/** A request's outcomes by their names, and the events it asks with. */
const asked = (answer: Answer) => {
  const request = answer !== undefined && 'ask' in answer ? answer : undefined
  return {
    accept: read(request?.accept),
    ask: request?.ask.map((code) => reorders.ASKS[code]),
    refuse: read(request?.refuse),
  }
}

/** The context after a move, or after a request's acceptance. */
const after = (answer: Answer) =>
  answer !== undefined && 'ask' in answer ? answer.accept.context : answer?.context

const {
  EVENT_CANCEL: CANCEL,
  EVENT_DRAG: DRAG,
  EVENT_DROP: DROP,
  EVENT_NUDGE: NUDGE,
  EVENT_PICK: PICK,
  EVENT_PRESS: PRESS,
  EVENT_RELEASE: RELEASE,
  EVENT_STEP: STEP,
  EVENT_TARGET: TARGET,
  EVENT_TICK: TICK,
} = compiled

/** A request that asks with both events, and ends at rest either way. */
const atRest = (accept: string[], refuse = ['canceled']) => ({
  accept: { effects: accept, state: 'idle' },
  ask: ['before-reorder', 'reorder'],
  refuse: { effects: refuse, state: 'idle' },
})

describe('a pointer on a grip (reorder.pure.spec.ts)', () => {
  const pressed = { ...held, x: 10, y: 10 }

  /* The family hears the pointer before it goes down, so a press asks for
     nothing, and only the drag hears the keys. */
  test('a press is held as pressed, and only from idle', () => {
    const move = send('idle', PRESS, { x: 10, y: 10 })
    expect([read(move), after(move)]).toEqual([{ effects: [], state: 'pressed' }, pressed])
    expect(send('held', PRESS)).toBeUndefined()
  })

  test('a press becomes a drag once it has traveled the slop, and the keys are heard anywhere', () => {
    expect(send('pressed', DRAG, { at: 55, x: 12, y: 11 }, pressed)).toBeUndefined()
    const move = send('pressed', DRAG, { at: 55, x: 10, y: 16 }, pressed)
    const lifted = { effects: ['lift', 'frame', 'listen'], state: 'dragging' }
    expect([read(move), after(move)?.from, after(move)?.to]).toEqual([lifted, 1, 2])
  })

  test('a drag moves the place, and a drag over the same place changes nothing', () => {
    const two = { ...held, to: 2 }
    const move = send('dragging', DRAG, { at: 5 }, two)
    expect([read(move), after(move)?.to]).toEqual([{ effects: ['pass'], state: 'dragging' }, 0])
    expect(send('dragging', DRAG, { at: 55 }, two)).toBeUndefined()
  })

  test('a drag does not move an item the keys hold', () => {
    expect(send('held', DRAG, { at: 55 })).toBeUndefined()
  })

  test('a release ends a press with nothing moved, and drops a dragged item', () => {
    expect(read(send('pressed', RELEASE)).state).toBe('idle')
    const move = send('dragging', RELEASE, {}, { ...held, to: 2 })
    const ending = ['unlisten', 'untrack']
    expect(asked(move)).toEqual(atRest([...ending, 'dropped'], [...ending, 'canceled']))
    expect(send('held', RELEASE)).toBeUndefined()
  })
})

describe('a key or a click on a grip (reorder.pure.spec.ts)', () => {
  test('a pick holds the item where it is, with no press', () => {
    const move = send('idle', PICK)
    const { from, pointer, to } = after(move) ?? held
    expect([read(move), from, to, pointer]).toEqual([
      { effects: ['picked-up'], state: 'held' },
      1,
      1,
      0,
    ])
  })

  test('a second pick on the same grip drops it, and a pick on another grip does nothing', () => {
    const moved = { ...held, to: 2 }
    expect(asked(send('held', PICK, {}, moved))).toEqual(atRest(['dropped', 'refocus']))
    expect(send('held', PICK, { key: 'a' }, moved)).toBeUndefined()
  })

  test('a step moves the place, and a step to the same place changes nothing', () => {
    const move = send('held', STEP, { keyName: 'ArrowUp' })
    expect([read(move), after(move)?.to]).toEqual([{ effects: ['moved'], state: 'held' }, 0])
    const end = { ...held, to: 2 }
    expect(send('held', STEP, { keyName: 'End' }, end)).toEqual({
      context: end,
      effects: [],
      state: stateOf(reorders, 'held'),
    })
    expect(send('idle', STEP, { keyName: 'ArrowUp' })).toBeUndefined()
  })

  test('a click on another item drops the held one there', () => {
    const move = send('held', TARGET, { key: 'c' })
    expect([asked(move), after(move)?.to]).toEqual([atRest(['dropped', 'refocus']), 2])
    expect(send('dragging', TARGET, { key: 'c' })).toBeUndefined()
  })

  test('drop and cancel end a hold', () => {
    expect(read(send('held', DROP))).toEqual({ effects: ['dropped'], state: 'idle' })
    expect(read(send('held', CANCEL))).toEqual({ effects: ['canceled'], state: 'idle' })
    expect(read(send('dragging', CANCEL))).toEqual({
      effects: ['unlisten', 'untrack', 'canceled'],
      state: 'idle',
    })
    expect(read(send('pressed', CANCEL))).toEqual({ effects: ['untrack'], state: 'idle' })
    expect([send('idle', CANCEL), send('idle', DROP)]).toEqual([undefined, undefined])
  })
})

describe('the place, the keys, the order, and the scroll (reorder.pure.spec.ts)', () => {
  const place = (over: Partial<ReorderInput>) =>
    after(send('dragging', DRAG, over, { ...held, to: -1 }))?.to

  test('counts the middles the pointer has passed, from the right on a right-to-left row', () => {
    expect([5, 30, 99].map((at) => place({ at }))).toEqual([0, 1, 2])
    const rtl = { axis: 'inline', rtl: true } as const
    expect([place({ ...rtl, at: 55 }), place({ ...rtl, at: 5 })]).toEqual([0, 2])
  })

  test('puts an item a window did not draw before or after the drawn ones', () => {
    const spans = [undefined, { end: 20, start: 0 }, undefined, { end: 60, start: 40 }, undefined]
    expect([place({ at: -5, spans }), place({ at: 999, spans })]).toEqual([1, 4])
  })

  test('the keys move a held item, held to the ends, along the writing direction', () => {
    const to = (keyName: string, at: number, over: Partial<ReorderInput> = {}) =>
      after(send('held', STEP, { keyName, ...over }, { ...held, to: at }))?.to
    expect([to('ArrowDown', 1), to('ArrowUp', 1), to('ArrowUp', 0), to('ArrowDown', 2)]).toEqual([
      2, 0, 0, 2,
    ])
    expect([to('Home', 1), to('End', 1), to('ArrowLeft', 1), to('a', 1)]).toEqual([
      0,
      2,
      undefined,
      undefined,
    ])
    const columns = { axis: 'inline' } as const
    expect([to('ArrowRight', 1, columns), to('ArrowDown', 1, columns)]).toEqual([2, undefined])
    expect(to('ArrowLeft', 1, { ...columns, rtl: true })).toBe(2)
  })

  test('the new order puts the key at its new place, and a hidden key keeps its place', () => {
    const order = (key: string, from: number, to: number, all = ['a', 'b', 'c', 'd']) => {
      const keys = ['a', 'b', 'c', 'd'].filter((one) => all.includes(one))
      return after(send('held', DROP, { all, key, keys }, { ...held, from, key, to }))?.order
    }
    expect(order('a', 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(order('d', 3, 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(order('c', 2, 0, ['a', 'x', 'b', 'c'])).toEqual(['c', 'a', 'x', 'b'])
    expect(order('a', 0, 1, ['a', 'x', 'b', 'c'])).toEqual(['x', 'b', 'a', 'c'])
    const alone = { ...held, from: 0, key: 'a', to: 0 }
    const lone = send('held', DROP, { all: ['a'], key: 'a', keys: ['a'] }, alone)
    expect([read(lone).state, asked(lone).ask]).toEqual(['idle', undefined])
  })

  test('the page scrolls faster nearer an edge, and is still away from both', () => {
    const speed = (at: number, start = 0, end = 400) =>
      after(send('dragging', TICK, { at, end, start }))?.speed
    expect([200, 30, 0, -50, 380, 500].map((at) => speed(at))).toEqual([0, -3, -12, -12, 6, 12])
    expect([speed(25, 0, 50), speed(0, 0, 50), speed(5, 5, 5)]).toEqual([0, -12, 0])
  })
})

/* **What the revised format let the machine say as the web does.** */
describe('the moves the old format could not write (reorder-controller.ts)', () => {
  /* The web's `settle` input turns a drop or a cancel into idle at once, and
     the controller says the words as the move ends (reorder.pure.spec.ts). */
  test('a move that ends is at rest in the same step, its words riding the move', () => {
    expect(read(send('held', CANCEL)).state).toBe('idle')
    expect(read(send('dragging', RELEASE)).state).toBe('idle')
    expect(asked(send('idle', NUDGE))).toEqual(atRest(['moved', 'refocus']))
    const ended = ['canceled', 'declined', 'dropped', 'nudged', 'placed']
    expect(reorders.STATES.filter((name) => ended.includes(name))).toEqual([])
  })

  /* `requestReorder` sends `helix-before-reorder`, then `helix-reorder`, and
     stops at the first refused (reorder-controller.dom.spec.ts). */
  test('every request asks with helix-before-reorder, then helix-reorder', () => {
    const moved = { ...held, to: 2 }
    const requests = [
      send('idle', NUDGE),
      send('held', DROP, {}, moved),
      send('held', PICK, {}, moved),
      send('held', TARGET, { key: 'c' }),
      send('dragging', RELEASE, {}, moved),
      send('dragging', RELEASE, {}, { ...moved, glides: true }),
    ]
    expect(requests.map((one) => asked(one).ask)).toEqual(
      requests.map(() => ['before-reorder', 'reorder']),
    )
  })

  /* The controller says a refused nudge with the item's own name and place
     (reorder-controller.dom.spec.ts, "a refused move is said as canceled"). */
  test('a refused nudge names the item it was for, where the last move named another', () => {
    const nudged = send('idle', NUDGE, { key: 'c', keyName: 'Home' }, { ...held, key: 'a' })
    const refused = nudged !== undefined && 'ask' in nudged ? nudged.refuse : undefined
    expect(read(refused)).toEqual({ effects: ['canceled'], state: 'idle' })
    expect([refused?.context.key, refused?.context.from, refused?.context.to]).toEqual(['c', 2, 0])
  })

  /* The native pilot's retired renderer gave a landing a second, then put
     the item back. The web draws no landing. */
  test('a landing has a deadline of one second, which glides the item back', () => {
    const owner = reorders.NODES.indexOf('landing')
    const drop = send('dragging', RELEASE, {}, { ...held, glides: true, to: 2 })
    const landing = drop !== undefined && 'ask' in drop ? drop.accept : undefined
    expect(landing?.effects).toContainEqual([compiled.EFFECT_DEADLINE, { ms: 1000, owner }])
    const late = reorders.expire(landing?.state ?? -1, held, owner)
    expect([read(late), late?.context.token]).toEqual([
      { effects: ['deadline-end', 'back'], state: 'returning' },
      held.token + 1,
    ])
    expect(reorders.expire(stateOf(reorders, 'idle'), held, owner)).toBeUndefined()
  })

  /* The controller's `hostDisconnected` stops hearing the pointer and the
     keys on the window, and sets the move to idle, with no words. */
  test('unmounting leaves any state for idle with no words, and lets go of the press and the keys', () => {
    const left = (name: string) => read(reorders.cancel(stateOf(reorders, name), held))
    expect(['held', 'dragging', 'landing'].map(left)).toEqual([
      { effects: [], state: 'idle' },
      { effects: ['unlisten', 'untrack'], state: 'idle' },
      { effects: ['deadline-end'], state: 'idle' },
    ])
  })
})
