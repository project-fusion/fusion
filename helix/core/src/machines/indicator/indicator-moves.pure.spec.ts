import { describe, expect, test } from 'bun:test'
import { type Compiled, effectNames, stateOf } from '../conformance.js'
import * as mark from './indicator.generated.js'
import {
  type IndicatorContext,
  type IndicatorInput,
  placement,
  type Rect,
  type Surface,
} from './machine.js'

/*
 * Moves event after event, through a host that keeps the state each move
 * returns. `indicator.pure.spec.ts` holds the compiled module to the machine
 * and checks where a measurement puts the mark, and the two are one spec
 * split at the 400 lines a file may have.
 */

const compiled: Compiled<IndicatorContext, IndicatorInput> = mark

const box = (left: number, top: number, width: number, height: number): Rect => ({
  height,
  left,
  top,
  width,
})

const strip = (
  own = box(0, 0, 300, 30),
  border = 0,
  direction: 'ltr' | 'rtl' = 'ltr',
): Surface => ({
  ...own,
  borderLeft: border,
  borderTop: border,
  direction,
})

/* Where the mark sits on the second of three tabs in a 300 by 30 strip. */
const there = placement(box(40, 0, 60, 30), strip())

/* The number a deadline names `moving` by. */
const owner = mark.NODES.indexOf('moving')

/* A host in miniature: it holds the context and the state each move
   returns, and keeps the effects of the last move. */
const host = (context: Partial<IndicatorContext> = {}) => {
  let now: IndicatorContext = {
    asked: 0,
    at: null,
    reduced: false,
    shown: false,
    token: 0,
    travel: 0,
    ...context,
  }
  let state = mark.start(now)
  let last: readonly mark.Effect[] = []
  /* The machine makes no requests, so an event moves it or is ignored. */
  const run = (move: mark.Move | mark.Asking | undefined): string[] => {
    if (move === undefined || !('state' in move)) {
      last = []
      return []
    }
    now = move.context
    state = move.state
    last = move.effects
    return effectNames(compiled, last)
  }
  const send = (event: number, input: IndicatorInput = {}): string[] =>
    run(mark.step(state, now, event, input))
  /* Asks for a measurement and answers it, as every placement on the web does. */
  const measure = (item: Rect | null, surface: Surface | null = strip()): string[] => {
    send(mark.EVENT_CHANGE)
    return send(mark.EVENT_MEASURED, { measurement: { item, surface }, token: now.asked })
  }
  /* Lets the deadline of the move under way run out. */
  const expire = (): string[] => run(mark.expire(state, now, owner))
  return {
    expire,
    last: () => last,
    measure,
    now: () => now,
    send,
    state: () => mark.STATES[state],
  }
}

/* A host whose mark was placed on the second tab, where `there` says. */
const placedOnce = (context: Partial<IndicatorContext> = {}) => {
  const one = host(context)
  one.measure(box(40, 0, 60, 30))
  return one
}

/* A host whose mark is on its way from the second tab to the third. */
const moved = () => {
  const one = placedOnce()
  return { effects: one.measure(box(140, 0, 60, 30)), one }
}

/* Restated from `indicator-controller.dom.spec.ts` in core, and from
   `tabs-indicator.dom.spec.ts` in styled, where they are named. */
describe('the first placement', () => {
  /* Controller: "a component whose children have not upgraded is not
     measured, and the mark is not placed". */
  test('waits for a chosen item with a box, and writes nothing before it', () => {
    const one = host()
    expect(one.measure(box(0, 0, 0, 0))).toEqual([])
    expect(one.now()).toMatchObject({ at: null, shown: false })
    expect(one.state()).toBe('unplaced')
    expect(one.measure(box(40, 0, 0, 30))).toEqual(['put'])
  })

  /* Controller: "a mark on its way ... but not on arrival, which is not a
     journey", and "the geometry of the marked child is written as the four
     properties". */
  test('puts the mark in place with no travel', () => {
    const one = host()
    expect(one.measure(box(40, 0, 60, 30))).toEqual(['put'])
    expect(one.now()).toMatchObject({ at: there, shown: true, travel: 0 })
    expect(one.state()).toBe('placed')
  })

  /* Styled Tabs: "the mark is placed at all, without anything having to
     update it". The tabs upgrade after the first measurement, and the
     `slotchange` they cause measures again. */
  test('comes with the measurement after the items arrive', () => {
    const one = host()
    expect(one.measure(null)).toEqual([])
    expect(one.measure(box(40, 0, 60, 30))).toEqual(['put'])
  })
})

describe('a set with nothing marked', () => {
  /* Controller: "a set with nothing marked takes the mark away". */
  test('takes the mark away', () => {
    const one = placedOnce()
    expect(one.measure(null)).toEqual(['hide'])
    expect(one.now().shown).toBe(false)
    expect(one.state()).toBe('placed')
  })
})

describe('a mark that has nothing to be drawn against', () => {
  /* Controller: "a mark that has nothing to be drawn against writes nothing". */
  test('writes nothing', () => {
    const one = placedOnce()
    expect(one.measure(box(140, 0, 60, 30), null)).toEqual([])
    expect(one.now()).toMatchObject({ at: there, shown: true, travel: 0 })
  })
})

describe('a mark on its way somewhere', () => {
  /* Controller: "says so, so a stylesheet can say something about the travel". */
  test('says so, so a stylesheet can say something about the travel', () => {
    const { effects, one } = moved()
    expect(effects).toEqual(['glide', 'deadline'])
    expect(one.now().travel).not.toBe(0)
    expect(one.state()).toBe('moving')
  })

  /* Controller: "nor on a placement that put it back where it was". */
  test('is no move where a placement puts it back where it was', () => {
    const one = placedOnce()
    expect(one.measure(box(40, 0, 60, 30))).toEqual(['put'])
    expect(one.now().travel).toBe(0)
  })

  /* Controller: "and lands when the travel ends". The web listens for the end
     of `translate` alone, and a host sends `LANDED` for that end alone. */
  test('lands when the travel ends', () => {
    const { one } = moved()
    expect(one.send(mark.EVENT_LANDED, { token: one.now().travel })).toEqual([
      'deadline-end',
      'land',
    ])
    expect(one.now().travel).toBe(0)
  })

  /* Controller: "or lands on the guard, for the move that has no transition to end". */
  test('or lands on its deadline, for the move that has no transition to end', () => {
    const { one } = moved()
    expect(one.expire()).toEqual(['deadline-end', 'land'])
    expect(one.now().travel).toBe(0)
  })
})

describe('a second move before the first has settled', () => {
  /* Controller: "takes the first listener off before adding its own". The
     web removes the listener and clears the timer. Here the second move ends
     the first's deadline, and the first move's token goes stale. */
  test('takes over from the first, whose end is then ignored', () => {
    const { one } = moved()
    const first = one.now().travel
    expect(one.measure(box(200, 0, 60, 30))).toEqual(['deadline-end', 'glide', 'deadline'])
    expect(one.send(mark.EVENT_LANDED, { token: first })).toEqual([])
    expect(one.send(mark.EVENT_LANDED, { token: one.now().travel })).toEqual([
      'deadline-end',
      'land',
    ])
  })
})

describe('what makes it measure again', () => {
  /* Controller: "is every update, which is when the marked child may have
     moved". Every change asks again, and the answer to an earlier ask is stale. */
  test('is every change, each with a new token', () => {
    const one = placedOnce()
    expect(one.send(mark.EVENT_CHANGE)).toEqual(['measure'])
    const earlier = one.now().asked
    expect(one.send(mark.EVENT_CHANGE)).toEqual(['measure'])
    const measurement = { item: box(140, 0, 60, 30), surface: strip() }
    expect(one.send(mark.EVENT_MEASURED, { measurement, token: earlier })).toEqual([])
    const last = one.send(mark.EVENT_MEASURED, { measurement, token: one.now().asked })
    expect(last).toEqual(['glide', 'deadline'])
  })

  /* The same spec: the controller measures on every update before the first
     placement too, and writes nothing until a measurement finds an item. */
  test('and every change before the first placement, which writes nothing else', () => {
    const one = host()
    expect(one.send(mark.EVENT_CHANGE)).toEqual(['measure'])
    expect(one.send(mark.EVENT_CHANGE)).toEqual(['measure'])
    expect(one.state()).toBe('unplaced')
    expect(one.measure(box(140, 0, 60, 30))).toEqual(['put'])
  })

  /* Controller: "and the host changing size, which a rewrap also does". A
     change of size moves the mark only where it moves the chosen item. */
  test('and a change of size alone writes the new size with no move', () => {
    const one = placedOnce()
    expect(one.measure(box(40, 0, 90, 30))).toEqual(['put'])
    expect(one.now().at).toEqual({ ...there, inline: 90 })
  })
})

/* No web spec covers these. Each restates what the controller and the base
   stylesheet do, where they are named. */
describe('reduced motion', () => {
  /* `base.css` sets every duration to 0.01ms, so a move on the web ends as it
     starts. The machine puts the mark in place with no travel. */
  test('puts a moved mark in its new place with no travel', () => {
    const one = placedOnce({ reduced: true })
    expect(one.measure(box(140, 0, 60, 30))).toEqual(['put'])
    expect(one.now()).toMatchObject({ at: { x: 140 }, travel: 0 })
  })
})

describe('a mark hidden while nothing was chosen', () => {
  /* The controller keeps where it last put the mark when it takes it away,
     and a placement after that is a move where the place differs. */
  test('travels on its return to a new place', () => {
    const one = placedOnce()
    one.measure(null)
    expect(one.measure(box(140, 0, 60, 30))).toEqual(['glide', 'deadline'])
    expect(one.now().shown).toBe(true)
  })

  test('comes back with no travel to the place it left', () => {
    const one = placedOnce()
    one.measure(null)
    expect(one.measure(box(40, 0, 60, 30))).toEqual(['put'])
  })
})

/* No web spec covers these. Each restates what `place`, `settle`, and
   `stopWaiting` in the controller do with a move under way. */
describe('a move under way', () => {
  /* `settle` takes `data-moving` off and stops waiting, and nothing else, so
     a measurement asked for before the end of the travel is still answered. */
  test('lands in the state its context reads back as, with its measurement still out', () => {
    const { one } = moved()
    one.send(mark.EVENT_CHANGE)
    one.send(mark.EVENT_LANDED, { token: one.now().travel })
    expect(one.state()).toBe('placed')
    expect(mark.start(one.now())).toBe(stateOf(compiled, 'placed'))
    const measurement = { item: box(140, 0, 60, 30), surface: strip() }
    expect(one.send(mark.EVENT_MEASURED, { measurement, token: one.now().asked })).toEqual(['put'])
  })

  /* `place` writes the four properties and `data-placed`, and returns before
     `data-moving` and the timer where the mark did not move. */
  test('goes on through a placement that does not move the mark, deadline and all', () => {
    const { one } = moved()
    const travel = one.now().travel
    expect(one.measure(box(140, 0, 90, 30))).toEqual(['put'])
    expect(one.state()).toBe('moving')
    expect(one.now().travel).toBe(travel)
    expect(one.expire()).toEqual(['deadline-end', 'land'])
  })

  /* `place` clears the timer of the move before with `stopWaiting`, then
     calls `setTimeout(settle, 1000)`. The deadline is the state's own, and
     no event stands for it. */
  test('has a deadline a second long, which a second move starts again', () => {
    const { one } = moved()
    expect(one.last()).toEqual([[mark.EFFECT_GLIDE], [mark.EFFECT_DEADLINE, { ms: 1000, owner }]])
    one.measure(box(200, 0, 60, 30))
    expect(one.last()).toEqual([
      [mark.EFFECT_DEADLINE_END, { owner }],
      [mark.EFFECT_GLIDE],
      [mark.EFFECT_DEADLINE, { ms: 1000, owner }],
    ])
    expect(mark.EVENTS).toEqual(['CHANGE', 'MEASURED', 'LANDED'])
  })

  /* `place` takes `data-placed` off where nothing is chosen, and returns
     before `data-moving` and the timer, so a hidden mark moves on until its
     travel or its timer ends. */
  test('keeps its deadline while it is measured again and while the mark is hidden', () => {
    const { one } = moved()
    expect(one.send(mark.EVENT_CHANGE)).toEqual(['measure'])
    expect(one.state()).toBe('moving')
    expect(one.measure(null)).toEqual(['hide'])
    expect(one.state()).toBe('moving')
    expect(one.expire()).toEqual(['deadline-end', 'land'])
    expect(one.now()).toMatchObject({ shown: false, travel: 0 })
  })
})
