import { describe, expect, test } from 'bun:test'
import { type ToggleState, toggled } from '../../utils/toggled/toggled.js'
import { type Compiled, conforms, coverage, effectNames, stateOf } from '../conformance.js'
import { type Asked, type Moved, Reference } from '../reference.js'
import { type ToggleContext, toggle } from './machine.js'
import * as toggleModule from './toggle.generated.js'
import { VECTORS, type VectorStep } from './vectors.js'

const compiled: Compiled<ToggleContext, undefined> = toggleModule

/* Every context the machine can be read from: each of the four flags, both
   ways. A press carries nothing. */
const contexts: ToggleContext[] = []
for (const checked of [false, true]) {
  for (const disabled of [false, true]) {
    for (const mixed of [false, true]) {
      for (const readOnly of [false, true]) {
        contexts.push({ checked, disabled, mixed, readOnly })
      }
    }
  }
}
const inputs: undefined[] = [undefined]

type Answer = Moved<ToggleContext> | Asked<ToggleContext> | undefined

/** A press, from the state the host reads from the context. */
const press = (context: ToggleContext): Answer =>
  compiled.step(compiled.start(context), context, toggleModule.EVENT_PRESS, undefined)

/** The request an answer makes, where it is one. */
const asked = (answer: Answer): Asked<ToggleContext> | undefined =>
  answer !== undefined && 'ask' in answer ? answer : undefined

describe('the compiled toggle module', () => {
  test('numbers the events in the order the machine writes them', () => {
    expect([toggleModule.EVENT_PRESS]).toEqual(toggle.events.map((_, index) => index))
  })

  test('compiles as the reference reads the machine, over every state, deadline, and cancel', () => {
    expect(conforms(toggle, compiled, contexts, inputs)).toEqual([])
  })

  test('is sampled in every state and on both answers of every guard', () => {
    expect([...coverage(toggle, contexts, inputs)].sort()).toEqual([
      'changeable false',
      'changeable true',
      'mixed',
      'off',
      'on',
      'resolvesOn false',
      'resolvesOn true',
    ])
  })

  test('has no deadline and no cancel, so unmounting leaves the control as it stands', () => {
    for (const [state] of compiled.STATES.entries()) {
      for (const context of contexts) {
        expect(compiled.cancel(state, context)).toBeUndefined()
        for (const [owner] of compiled.NODES.entries()) {
          expect(compiled.expire(state, context, owner)).toBeUndefined()
        }
      }
    }
  })

  /* checkbox-root.ts and switch-root.ts report the value they hold on every
     update, the first included, so the form holds a value before any press. */
  test('reports to the form as it mounts, in whichever state it starts', () => {
    for (const context of contexts) {
      expect(effectNames(compiled, compiled.entering(compiled.start(context)))).toEqual(['report'])
    }
  })
})

/** One press of a vector, by the compiled module: what it reads as, and the context it leaves. */
const pressOnce = (context: ToggleContext, step: VectorStep) => {
  const state = compiled.start(context)
  const answer = compiled.step(state, context, toggleModule.EVENT_PRESS, undefined)
  const request = asked(answer)
  const move =
    request === undefined
      ? (answer as Moved<ToggleContext> | undefined)
      : request[step.refuse === true ? 'refuse' : 'accept']
  const left = move?.context ?? context
  const read = {
    asks: request?.ask.map((code) => compiled.ASKS[code]) ?? [],
    checked: left.checked,
    effects: effectNames(compiled, move?.effects),
    mixed: left.mixed,
    state: compiled.STATES[move?.state ?? state],
  }
  return { answer, left, read, state }
}

/** A vector's step, as `pressOnce` reads a press. */
const wanted = (step: VectorStep) => ({
  asks: [...step.asks],
  checked: step.checked,
  effects: [...step.effects],
  mixed: step.mixed,
  state: step.state,
})

/* The vectors restate the web specs each names. A host reads the machine
   from the context before each press, so each press starts where the last
   left the context. */
describe('the toggle vectors', () => {
  const reference = new Reference(toggle)

  for (const vector of VECTORS) {
    test(vector.name, () => {
      let context = vector.from
      for (const step of vector.steps) {
        const { answer, left, read, state } = pressOnce(context, step)
        expect(answer).toEqual(reference.step(state, 'PRESS', context, undefined))
        expect(read).toEqual(wanted(step))
        context = left
      }
    })
  }
})

describe('what the machine says of every press', () => {
  /* switch-root.dom.spec.ts, "a refused change leaves the control where it
     was", and checkbox-root.dom.spec.ts, "a refused toggle sends no change". */
  test('a refused press keeps the context and the state, and runs nothing', () => {
    for (const context of contexts) {
      const request = asked(press(context))
      if (request !== undefined) {
        expect(request.refuse).toEqual({
          context,
          effects: [],
          state: compiled.start(context),
        })
      }
    }
  })

  /* The host reads the machine from `checked` and `mixed` before each press,
     so the state a move leaves is the state the host reads next. */
  test('every move leaves the machine in the state its context starts in', () => {
    const outcomes = contexts.flatMap((context) => {
      const request = asked(press(context))
      return request === undefined ? [] : [request.accept, request.refuse]
    })
    expect(outcomes.filter((move) => move.state !== compiled.start(move.context))).toEqual([])
  })

  /* checkbox-root.dom.spec.ts, "announces a boolean, and not a word that
     reads like one": the request carries the state it would leave. */
  test('an accepted press is never mixed, and turns `checked` the other way', () => {
    for (const context of contexts) {
      const request = asked(press(context))
      if (request !== undefined) {
        expect(request.accept.context).toEqual({
          ...context,
          checked: !context.checked,
          mixed: false,
        })
        expect(request.accept.state).not.toBe(stateOf(compiled, 'mixed'))
      }
    }
  })
})

/* **The web runs `toggled`, written by hand, and this holds it to the
   machine.** A press is one event from a state the context gives, so every
   context is every press the web can meet. */
describe('toggled, which the web runs', () => {
  test('asks where the machine asks, and proposes the context the machine accepts', () => {
    for (const context of contexts) {
      const state: ToggleState = context
      const request = asked(press(context))
      expect({ context, proposed: toggled(state) }).toEqual({
        context,
        proposed: request === undefined ? null : request.accept.context,
      })
      expect(press(context) === undefined || request !== undefined).toBe(true)
    }
  })

  /** One press through `toggled`: what it asks, and the state it leaves. */
  const turn = (state: ToggleState, step: VectorStep) => {
    const proposed = toggled(state)
    const left = proposed === null || step.refuse === true ? state : proposed
    const read = {
      asks: proposed === null ? [] : ['toggle'],
      checked: left.checked,
      mixed: left.mixed,
    }
    return { left, read }
  }

  test('answers every vector as the machine does', () => {
    for (const vector of VECTORS) {
      let state: ToggleState = vector.from
      for (const step of vector.steps) {
        const { left, read } = turn(state, step)
        expect({ ...read, vector: vector.name }).toEqual({
          asks: [...step.asks],
          checked: step.checked,
          mixed: step.mixed,
          vector: vector.name,
        })
        state = left
      }
    }
  })
})
