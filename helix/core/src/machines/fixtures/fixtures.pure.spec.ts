import { describe, expect, test } from 'bun:test'
import { type Compiled, conforms, effectNames, stateOf } from '../conformance.js'
import type { Moved } from '../reference.js'
import { type NestedContext, type NestedInput, nested } from './nested/machine.js'
import * as nestedModule from './nested/nested.generated.js'
import { type ParallelContext, type ParallelInput, parallel } from './parallel/machine.js'
import * as parallelModule from './parallel/parallel.generated.js'
import { type ToggleContext, type ToggleInput, toggle } from './toggle/machine.js'
import * as toggleModule from './toggle/toggle.generated.js'

/*
 * The format's own fixtures. `conforms` holds each compiled module to the
 * reference over every pair of state and event; the cases after it pin what
 * a move does in plain words, so the compiler and the reference cannot be
 * wrong the same way unseen.
 */

const toggled: Compiled<ToggleContext, ToggleInput> = toggleModule
const held: Compiled<NestedContext, NestedInput> = nestedModule
const landing: Compiled<ParallelContext, ParallelInput> = parallelModule

const switches: ToggleContext[] = [false, true].flatMap((on) =>
  [false, true].map((stuck) => ({ on, refused: 0, stuck })),
)
const presses: ToggleInput[] = [{ by: 1 }, { by: 2 }]

/** A move's names: where it leaves the machine, and its effects in order. */
const read = <C, I>(compiled: Compiled<C, I>, move: unknown) => {
  const moved = move as Moved<C> | undefined
  return {
    effects: effectNames(compiled, moved?.effects),
    state: moved === undefined ? undefined : compiled.STATES[moved.state],
  }
}

describe('a request, effects with arguments, and a deadline', () => {
  test('compile as the reference reads them', () => {
    expect(conforms(toggle, toggled, switches, presses)).toEqual([])
  })

  const off = stateOf(toggled, 'off')
  const on = stateOf(toggled, 'on')
  const context = { on: false, refused: 0, stuck: false }

  test('a move runs its own effects, then those of the state it enters', () => {
    const move = toggled.step(off, context, toggleModule.EVENT_FLIP, { by: 1 })
    expect(read(toggled, move)).toEqual({ effects: ['glow', 'deadline'], state: 'on' })
  })

  test('leaving a state ends its deadline and runs its exit effects first', () => {
    const move = toggled.step(on, { ...context, on: true }, toggleModule.EVENT_FLIP, { by: 1 })
    expect(read(toggled, move)).toEqual({ effects: ['deadline-end', 'glow', 'say'], state: 'off' })
  })

  test('a request asks with each of its events in order, and either outcome may change the context', () => {
    const asked = toggled.step(off, context, toggleModule.EVENT_ASK, { by: 2 })
    expect(asked !== undefined && 'ask' in asked).toBe(true)
    if (asked === undefined || !('ask' in asked)) {
      return
    }
    expect(asked.ask.map((code) => toggled.ASKS[code])).toEqual(['before-turn', 'turn'])
    expect(asked.accept.effects[0]).toEqual([
      toggleModule.EFFECT_HUM,
      { level: 2, loud: true, tone: 'low' },
    ])
    expect(asked.refuse).toEqual({ context: { ...context, refused: 2 }, effects: [], state: off })
  })

  test('a guard that does not pass falls to what the list ends with', () => {
    expect(toggled.step(off, context, toggleModule.EVENT_ASK, { by: 1 })).toBeUndefined()
  })

  test('a deadline ends in its way', () => {
    const move = toggled.expire(on, { ...context, on: true }, toggled.NODES.indexOf('on'))
    expect(read(toggled, move)).toEqual({
      effects: ['deadline-end', 'glow', 'say', 'say'],
      state: 'off',
    })
    expect(toggled.expire(off, context, toggled.NODES.indexOf('on'))).toBeUndefined()
  })
})

describe('one level of nesting, a deadline on a parent, marks, and a cancel', () => {
  const pages: NestedContext[] = [{ turned: 0 }, { turned: 2 }]
  const turns: NestedInput[] = [{ wraps: false }, { wraps: true }]
  const first = stateOf(held, 'first')
  const second = stateOf(held, 'second')
  const open = held.NODES.indexOf('open')

  test('compile as the reference reads them', () => {
    expect(conforms(nested, held, pages, turns)).toEqual([])
  })

  test('entering a parent runs its entry and starts its deadline, then its first child', () => {
    const move = held.step(
      stateOf(held, 'closed'),
      { turned: 0 },
      nestedModule.EVENT_OPEN,
      turns[0] as NestedInput,
    )
    expect(read(held, move)).toEqual({ effects: ['show', 'deadline', 'focus'], state: 'first' })
  })

  test('a child leaves to its parent what it does not answer, and a move between children leaves the parent alone', () => {
    const move = held.step(first, { turned: 0 }, nestedModule.EVENT_NEXT, turns[0] as NestedInput)
    expect(read(held, move)).toEqual({ effects: [], state: 'second' })
  })

  test('a move to the state around the leaf leaves it and enters it again', () => {
    const move = held.step(second, { turned: 1 }, nestedModule.EVENT_OPEN, turns[0] as NestedInput)
    expect(read(held, move)).toEqual({
      effects: ['deadline-end', 'hide', 'show', 'deadline', 'focus'],
      state: 'first',
    })
  })

  test('a parent marks every leaf it holds, and a marked leaf adds its own', () => {
    expect(held.mark(first)).toEqual(['open'])
    expect(held.mark(second)).toEqual(['open', 'second'])
  })

  test("a parent's deadline and the cancel each leave every state they must", () => {
    expect(read(held, held.expire(second, { turned: 3 }, open))).toEqual({
      effects: ['deadline-end', 'hide'],
      state: 'closed',
    })
    expect(read(held, held.cancel(second, { turned: 3 }))).toEqual({
      effects: ['deadline-end', 'hide', 'reset'],
      state: 'closed',
    })
  })
})

describe('parallel regions, final states, and done', () => {
  const counts: ParallelContext[] = [{ drops: 0 }, { drops: 1 }]
  const draws: ParallelInput[] = [{ ready: false }, { ready: true }]
  const idle = stateOf(landing, 'idle')
  const both = stateOf(landing, 'dropping(gliding, drawing)')
  const ready = { ready: true }

  test('compile as the reference reads them', () => {
    expect(conforms(parallel, landing, counts, draws)).toEqual([])
  })

  test('entering a parallel state enters each region, in order', () => {
    const move = landing.step(idle, { drops: 0 }, parallelModule.EVENT_DROP, ready)
    expect(read(landing, move)).toEqual({
      effects: ['land', 'draw', 'deadline'],
      state: 'dropping(gliding, drawing)',
    })
  })

  test('a region moves alone', () => {
    const move = landing.step(both, { drops: 0 }, parallelModule.EVENT_LANDED, ready)
    expect(read(landing, move)).toEqual({ effects: [], state: 'dropping(landed, drawing)' })
  })

  test("the last region to finish takes the parallel state's done", () => {
    const halfway = stateOf(landing, 'dropping(landed, drawing)')
    const move = landing.step(halfway, { drops: 0 }, parallelModule.EVENT_DRAWN, ready)
    expect(read(landing, move)).toEqual({ effects: ['deadline-end', 'settle'], state: 'idle' })
    expect((move as Moved<ParallelContext>).context).toEqual({ drops: 1 })
  })

  test('a region that leaves the parallel state leaves every region', () => {
    const move = landing.step(both, { drops: 0 }, parallelModule.EVENT_ABORT, ready)
    expect(read(landing, move)).toEqual({ effects: ['deadline-end'], state: 'idle' })
  })

  test("a move from outside into one region's state starts the others where they start", () => {
    const move = landing.step(idle, { drops: 0 }, parallelModule.EVENT_SKIP, ready)
    expect(read(landing, move)).toEqual({
      effects: ['draw', 'deadline'],
      state: 'dropping(landed, drawing)',
    })
  })

  test("a region's deadline moves its region", () => {
    const move = landing.expire(both, { drops: 0 }, landing.NODES.indexOf('drawing'))
    expect(read(landing, move)).toEqual({
      effects: ['deadline-end'],
      state: 'dropping(gliding, drawn)',
    })
  })
})
