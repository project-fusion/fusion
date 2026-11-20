import { describe, expect, test } from 'bun:test'
import { type RoveMove, rove } from '../../utils/rove/rove.js'
import { type Compiled, conforms, coverage, effectNames, stateOf } from '../conformance.js'
import { type RovingContext, rovingFocus } from './machine.js'
import * as roving from './roving-focus.generated.js'

const compiled: Compiled<RovingContext, undefined> = roving

/* Every reading a press can take, small enough to walk whole: a set of one
   item and a set of three, each start, and every flag. */
const contexts: RovingContext[] = []
for (const count of [1, 3]) {
  for (let at = -1; at < count; at += 1) {
    for (const focus of [false, true]) {
      for (const selects of [false, true]) {
        for (const wrap of [false, true]) {
          contexts.push({ at, count, focus, selects, wrap })
        }
      }
    }
  }
}

/* Every event carries nothing. */
const inputs: undefined[] = [undefined]

/** A press from where the context says it starts. The machine makes no requests, so a press moves or is ignored. */
const press = (context: RovingContext, event: number): roving.Move | undefined =>
  roving.step(roving.start(context), context, event, undefined) as roving.Move | undefined

/** Where a press lands, and the effects it runs by name. */
const lands = (context: RovingContext, event: number) => {
  const move = press(context, event)
  return move === undefined
    ? undefined
    : { at: move.context.at, effects: effectNames(compiled, move.effects) }
}

describe('the compiled roving-focus module', () => {
  test('conforms to the machine, from every reading and every event', () => {
    expect(conforms(rovingFocus, compiled, contexts, inputs)).toEqual([])
  })

  test('is held over every state and both answers of every guard', () => {
    expect([...coverage(rovingFocus, contexts, inputs)].sort()).toEqual([
      'away',
      'placed',
      'selects false',
      'selects true',
      'unplaced',
    ])
  })

  test('numbers the events in the order the machine writes them', () => {
    expect([
      roving.EVENT_NEXT,
      roving.EVENT_PREVIOUS,
      roving.EVENT_FIRST,
      roving.EVENT_LAST,
    ]).toEqual(rovingFocus.events.map((_, index) => index))
  })
})

/* Restated from
   `helix/core/src/controllers/keyboard-navigation-controller/keyboard-navigation-controller.dom.spec.ts`.
   Each press there starts from the selection, chooses on arrival, and joins
   the ends, unless the case says otherwise. */
describe('roving focus', () => {
  const ring = { at: 1, count: 3, focus: false, selects: true, wrap: true }
  const arrived = ['focus', 'select']

  /* "the two ends": "join up, which is what a radio group does", and "and the
     other way round". */
  test('wraps past either end of a ring', () => {
    expect(lands({ ...ring, at: 2 }, roving.EVENT_NEXT)).toEqual({ at: 0, effects: arrived })
    expect(lands({ ...ring, at: 0 }, roving.EVENT_PREVIOUS)).toEqual({ at: 2, effects: arrived })
  })

  /* "a set whose ends do not join up": "stays on the last item rather than
     starting over", and "and on the first, rather than swallowing the press
     and doing nothing". */
  test('holds both ends of a scale', () => {
    const scale = { ...ring, wrap: false }
    expect(lands({ ...scale, at: 2 }, roving.EVENT_NEXT)).toEqual({ at: 2, effects: arrived })
    expect(lands({ ...scale, at: 0 }, roving.EVENT_PREVIOUS)).toEqual({ at: 0, effects: arrived })
  })

  /* "where a move starts from": "which is also the only reading that can tell
     a press on an item from one beside it". */
  test('moves nothing for a press from outside the items, where moves start from focus', () => {
    const outside = { ...ring, at: -1, focus: true }
    expect(roving.STATES[roving.start(outside)]).toBe('away')
    expect(roving.EVENTS.map((_, event) => press(outside, event))).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ])
  })

  /* "a set with nothing chosen in it": "moves forward onto the first item",
     and "and backward onto the last, not the one before it". */
  test('from nothing chosen, lands forward on the first item and back on the last', () => {
    const nothing = { ...ring, at: -1 }
    expect(lands(nothing, roving.EVENT_NEXT)).toEqual({ at: 0, effects: arrived })
    expect(lands(nothing, roving.EVENT_PREVIOUS)).toEqual({ at: 2, effects: arrived })
  })

  /* "whether arriving also chooses": "it does, because a pointer user
     chooses by arriving and so does a reader", and "unless the component says
     otherwise, which is what `manual` is". */
  test('chooses on arrival only where the set chooses on arrival', () => {
    expect(lands(ring, roving.EVENT_NEXT)).toEqual({ at: 2, effects: ['focus', 'select'] })
    expect(lands({ ...ring, selects: false }, roving.EVENT_NEXT)).toEqual({
      at: 2,
      effects: ['focus'],
    })
  })
})

/* **One state holds a press from an item, and each move carries its own
   effects.** The machine had two such states, `chosen` and `focused`, so
   that arriving could focus and choose as each one's entry effects. A host
   that starts the machine runs the effects of the state it starts in, and
   starting a press from an item then focused that item before the press
   moved anywhere. */
describe('a press from an item', () => {
  /* Restated from "a set with nothing chosen in it": "moves on from the item
     that has focus, rather than arriving at it again", where the web focuses
     and chooses `item-1` and does nothing before that. */
  test('runs nothing as it starts, and then arrives on the item it moves to', () => {
    const tabbedIn = { at: 0, count: 3, focus: false, selects: true, wrap: true }
    const state = roving.start(tabbedIn)
    const move = press(tabbedIn, roving.EVENT_NEXT)
    expect(roving.STATES[state]).toBe('placed')
    expect([
      ...effectNames(compiled, roving.entering(state)),
      ...effectNames(compiled, move?.effects),
    ]).toEqual(['focus', 'select'])
    expect(move?.context.at).toBe(1)
    expect(contexts.flatMap((context) => roving.entering(roving.start(context)))).toEqual([])
  })

  /* Restated from "whether arriving also chooses": "and it is asked every
     press rather than read once", where the web focuses `item-2`, then
     focuses and chooses `item-0`. */
  test('lands in the same state with or without choosing, and the next press chooses where its context says so', () => {
    const manual = { at: 1, count: 3, focus: false, selects: false, wrap: true }
    const moved = press(manual, roving.EVENT_NEXT)
    const again =
      moved === undefined
        ? undefined
        : (roving.step(
            moved.state,
            { ...moved.context, selects: true },
            roving.EVENT_FIRST,
            undefined,
          ) as roving.Move | undefined)
    expect([moved?.state, again?.state]).toEqual([
      stateOf(compiled, 'placed'),
      stateOf(compiled, 'placed'),
    ])
    expect([
      ...effectNames(compiled, moved?.effects),
      ...effectNames(compiled, again?.effects),
    ]).toEqual(['focus', 'focus', 'select'])
    expect([moved?.context.at, again?.context.at]).toEqual([2, 0])
  })
})

/* **The web runs `rove`, written by hand, and this holds it to the machine.**
   A press is one machine: it starts where the context says and takes one
   event, so every context and every event is every pair the web can meet. */
describe('rove, which the web runs', () => {
  const moves: Record<(typeof roving.EVENTS)[number], RoveMove> = {
    FIRST: 'first',
    LAST: 'last',
    NEXT: 'next',
    PREVIOUS: 'previous',
  }

  test('moves where the machine moves, and nowhere where it moves nothing', () => {
    for (const context of contexts) {
      roving.EVENTS.forEach((name, event) => {
        const to = rove(context.at, context.count, moves[name], context.wrap, context.focus)
        expect({ context, name, to }).toEqual({
          context,
          name,
          to: press(context, event)?.context.at,
        })
      })
    }
  })
})
