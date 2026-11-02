import { describe, expect, test } from 'bun:test'
import { type Compiled, conforms, coverage } from '../conformance.js'
import * as mark from './indicator.generated.js'
import {
  type IndicatorContext,
  type IndicatorInput,
  indicator,
  type Measurement,
  placement,
  type Rect,
  type Surface,
} from './machine.js'

/*
 * The compiled module held to the machine, from every context and reading
 * the machine tells apart, and where a measurement puts the mark.
 * `indicator-moves.pure.spec.ts` runs moves event after event through a host,
 * and the two are one spec split at the 400 lines a file may have.
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

/* Every context the machine tells apart: placed before or never, a
   measurement asked for or not, shown or hidden, a move under way or not,
   and reduced motion. Move 3 was handed out before measurement 4. */
const contexts: IndicatorContext[] = []
for (const at of [null, there]) {
  for (const asked of [0, 4]) {
    for (const shown of [false, true]) {
      for (const travel of [0, 3]) {
        for (const reduced of [false, true]) {
          contexts.push({ asked, at, reduced, shown, token: 4, travel })
        }
      }
    }
  }
}

/* The contexts a host can hold: a mark never placed is neither shown nor moving. */
const held = contexts.filter(
  (context) => context.at !== null || (!context.shown && !context.travel),
)

/* Every reading the machine tells apart, and none, each with a stale token,
   the move's, and the measurement's. */
const readings: Measurement[] = [
  { item: box(40, 0, 60, 30), surface: null },
  { item: null, surface: strip() },
  { item: box(0, 0, 0, 0), surface: strip() },
  { item: box(40, 0, 0, 30), surface: strip() },
  { item: box(40, 0, 60, 30), surface: strip() },
  { item: box(40, 0, 90, 30), surface: strip() },
  { item: box(140, 0, 60, 30), surface: strip() },
  { item: box(40, 10, 60, 30), surface: strip() },
  { item: box(40, 0, 60, 30), surface: strip(box(0, 0, 300, 30), 0, 'rtl') },
]
const inputs: IndicatorInput[] = [
  {},
  ...[1, 3, 4].flatMap((token) => [
    { token },
    ...readings.map((measurement) => ({ measurement, token })),
  ]),
]

describe('the compiled indicator module', () => {
  test('conforms to the machine, from every context and every reading', () => {
    expect(conforms(indicator, compiled, contexts, inputs)).toEqual([])
  })

  test('is held over every state and both answers of every guard', () => {
    expect([...coverage(indicator, contexts, inputs)].sort()).toEqual([
      'arrived false',
      'arrived true',
      'blank false',
      'blank true',
      'fresh false',
      'fresh true',
      'gone false',
      'gone true',
      'moves false',
      'moves true',
      'moving',
      'placed',
      'unplaced',
    ])
  })

  test('numbers the events in the order the machine writes them', () => {
    expect([mark.EVENT_CHANGE, mark.EVENT_MEASURED, mark.EVENT_LANDED]).toEqual(
      indicator.events.map((_, index) => index),
    )
  })

  /* A host may keep the state a move returns or read it again from the
     context, and the two agree. Checked from every context a host can hold,
     for every event with every reading and token, and for the deadline. */
  test('enters, with every move, the state its context reads back as', () => {
    const differing: unknown[] = []
    for (const context of held) {
      const state = mark.start(context)
      const answers = indicator.events.flatMap((_, event) =>
        inputs.map((input) => mark.step(state, context, event, input)),
      )
      for (const move of [...answers, mark.expire(state, context, owner)]) {
        if (move !== undefined && 'state' in move && mark.start(move.context) !== move.state) {
          differing.push({ context, move })
        }
      }
    }
    expect(differing).toEqual([])
  })
})

/* Restated from `indicator-controller.dom.spec.ts` in core, and from
   `tabs-indicator.dom.spec.ts` in styled, where they are named. */
describe('where the mark goes', () => {
  /* Controller: "the geometry of the marked child is written as the four properties". */
  test('is written as the four properties whoever draws the mark reads', () => {
    expect(there).toEqual({ block: 30, inline: 60, x: 40, y: 0 })
  })

  /* Controller: "with the surface's own border off both axes". */
  test('takes the surface’s own border off both axes', () => {
    expect(placement(box(40, 10, 60, 30), strip(box(0, 0, 300, 40), 2))).toMatchObject({
      x: 38,
      y: 8,
    })
  })

  /* Controller: "a right-to-left document measures from the right edge". */
  test('right to left, is measured from the right edge and travels the other way', () => {
    expect(placement(box(40, 0, 60, 30), strip(box(0, 0, 300, 30), 0, 'rtl')).x).toBe(-200)
  })

  /* Controller: "and takes the border off that edge too". */
  test('right to left, takes the border off that edge too', () => {
    expect(placement(box(40, 0, 60, 30), strip(box(0, 0, 300, 30), 2, 'rtl')).x).toBe(-198)
  })

  /* Styled Tabs: "the mark covers the selected tab", in a strip taller than
     its tabs, where a mark at the top of the strip misses the tab. */
  test('covers the selected tab in a strip taller than its tabs', () => {
    const tab = box(40, 16, 60, 32)
    expect(placement(tab, strip(box(0, 0, 300, 64)))).toMatchObject({ block: 32, y: 16 })
  })
})
