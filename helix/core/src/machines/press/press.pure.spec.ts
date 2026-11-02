import { describe, expect, test } from 'bun:test'
import { pressType, type RecentPress } from '../../utils/press-type/press-type.js'
import { type Compiled, conforms, coverage, effectNames, stateOf } from '../conformance.js'
import type { Asked, Moved } from '../reference.js'
import {
  byClick,
  HOLD_DELAY,
  HOLD_SLOP,
  type PressContext,
  type PressInput,
  press,
} from './machine.js'
import * as generated from './press.generated.js'

/*
 * Holds the compiled module to the machine, and the web's `pressType` to the
 * machine. `press-moves.pure.spec.ts` drives the module through the presses
 * the web specs describe.
 */

const compiled: Compiled<PressContext, PressInput> = generated

const STILL = { count: 0, key: '', over: false, pointer: '', primary: false, x: 0, y: 0 }

const PART: PressContext = {
  disabled: false,
  held: false,
  holds: false,
  key: false,
  pending: false,
  pointer: '',
  pointerType: '',
  x: 0,
  y: 0,
}

/* Every context the machine tells apart: each pair of `disabled` and
   `pending`, a part that holds and one that does not, a long press's claim
   and none, and each note, a named pointer, a kind no press is named by, a
   key, and none. */
const contexts: PressContext[] = []
for (const disabled of [false, true]) {
  for (const pending of [false, true]) {
    for (const [holds, held] of [
      [false, false],
      [true, false],
      [true, true],
    ] as const) {
      for (const [key, pointer] of [
        [false, ''],
        [false, 'pen'],
        [false, 'gamepad'],
        [true, ''],
      ] as const) {
        contexts.push({ ...PART, disabled, held, holds, key, pending, pointer })
      }
    }
  }
}

/* Every input the guards tell apart: each key, each pointer kind, a click
   with a count and one without, and a pointer that is over the part, primary,
   and past the slop, or none of these. */
const inputs: PressInput[] = []
for (const key of ['', 'Enter', ' ']) {
  for (const pointer of ['', 'touch', 'gamepad']) {
    for (const count of [0, 1]) {
      for (const on of [false, true]) {
        const x = on ? HOLD_SLOP + 1 : HOLD_SLOP
        inputs.push({ count, key, over: on, pointer, primary: on, x, y: 0 })
      }
    }
  }
}

/** The moves an answer may make: a move, or either outcome of a request. */
const outcomes = (answer: Moved<PressContext> | Asked<PressContext> | undefined) =>
  answer === undefined ? [] : 'ask' in answer ? [answer.accept, answer.refuse] : [answer]

/** Every move the samples make from a state, by an event or a deadline. */
const movesFrom = (state: number): Moved<PressContext>[] =>
  contexts.flatMap((context) => [
    ...compiled.EVENTS.flatMap((_, event) =>
      inputs.flatMap((input) => outcomes(compiled.step(state, context, event, input))),
    ),
    ...compiled.NODES.flatMap((_, owner) => outcomes(compiled.expire(state, context, owner))),
  ])

/** The states the samples reach from where the machine starts. */
const reached = (): string[] => {
  const seen = new Set(contexts.map((context) => compiled.start(context)))
  for (const state of seen) {
    for (const move of movesFrom(state)) {
      seen.add(move.state)
    }
  }
  return [...seen].sort().map((state) => `${compiled.STATES[state]}`)
}

/** Every guard the machine names. */
const GUARDS = [
  'claims',
  'drifted',
  'enabled',
  'enterClaimed',
  'enterClicks',
  'enterKey',
  'isSpace',
  'ready',
  'releasedOver',
  'space',
  'spaceClaimed',
  'spaceClicks',
  'starts',
  'startsHold',
]

describe('the compiled press module', () => {
  test('compiles as the reference reads the machine', () => {
    expect(conforms(press, compiled, contexts, inputs)).toEqual([])
  })

  /* `coverage` names the state the machine starts in and each guard's
     answers. The machine starts in one state, so a walk from it shows the
     samples reach the others. */
  test('is walked through every state and both answers of every guard', () => {
    const start = `${compiled.STATES[compiled.start(PART)]}`
    const answers = GUARDS.flatMap((guard) => [`${guard} false`, `${guard} true`])
    expect([...coverage(press, contexts, inputs)].sort()).toEqual([start, ...answers].sort())
    expect(reached()).toEqual([...compiled.STATES])
  })
})

/* **The web runs `pressType`, written by hand, and this holds it to the
   machine** over every note and every click it can read. */
describe('pressType, which the web runs', () => {
  test('names every click as the machine names it', () => {
    for (const recent of [{}, { key: true }, { pointer: 'pen' }, { pointer: 'gamepad' }]) {
      const pointer = (recent as RecentPress).pointer ?? ''
      const context = { ...PART, key: 'key' in recent, pointer }
      for (const own of ['', 'mouse', 'pen', 'touch', 'gamepad']) {
        for (const count of [0, 1, 2]) {
          const click = { detail: count, pointerType: own } as unknown as MouseEvent
          const web = pressType(click, recent)
          const machine = byClick(context, { ...STILL, count, pointer: own }).pointerType
          expect({ count, machine, own, recent }).toEqual({ count, machine: web, own, recent })
        }
      }
    }
  })
})

/* Two workarounds the old format forced, read off the module. The others
   are driven in `press-moves.pure.spec.ts`. */
describe('the press as the revised format says it', () => {
  const timing = stateOf(compiled, 'part(spaceUp, timing)')
  const pointing = stateOf(compiled, 'part(spaceUp, pointing)')
  const owner = compiled.NODES.indexOf('timing')

  /* `LongPress.down` starts a `DelayController`, and `up` and `cancel` stop
     it, in `long-press.ts`. The machine had a `wait` effect, a token, and an
     `EXPIRE` event for it. */
  test('the wait for a long press is a deadline on the state that times it', () => {
    expect(compiled.entering(timing)).toEqual([
      [generated.EFFECT_DEADLINE, { ms: HOLD_DELAY, owner }],
    ])
    const ended = compiled.expire(timing, { ...PART, holds: true }, owner)
    expect(effectNames(compiled, ended?.effects)).toEqual(['deadline-end', 'hold'])
    expect(ended?.context.held).toBe(true)
    expect(ended?.state).toBe(pointing)
    expect(compiled.expire(pointing, PART, owner)).toBeUndefined()
    expect(compiled.EVENTS).not.toContain('EXPIRE')
  })

  /* The machine had a state, `acted`, only to run `act` and `press` as it
     was entered, and an accepted click ended any press held. */
  test('a click that acts runs `act` and `press` on its move, and leaves the part where it was', () => {
    const asked = compiled.step(pointing, PART, generated.EVENT_CLICK, STILL) as Asked<PressContext>
    expect(effectNames(compiled, asked.accept.effects)).toEqual(['act', 'press'])
    expect(asked.accept.state).toBe(pointing)
    expect(compiled.NODES).not.toContain('acted')
  })
})
