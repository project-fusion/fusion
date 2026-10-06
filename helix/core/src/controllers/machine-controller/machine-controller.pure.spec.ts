import { describe, expect, test } from 'bun:test'
import { type ExhaustiveMachine, type Machine, step } from './machine-controller.js'

type Light = 'off' | 'on' | 'broken'
type Press = { type: 'PRESS' } | { type: 'BREAK' } | { type: 'SET'; to: number }
type Count = { presses: number }

/* A switch that counts its presses, refuses a third, and breaks for good. */
const light: Machine<Light, Press, Count> = {
  states: {
    broken: { on: { PRESS: 'ignore' } },
    off: {
      on: {
        BREAK: { to: 'broken' },
        PRESS: [
          { guard: (count) => count.presses >= 2 },
          {
            ask: () => new Event('before-on', { cancelable: true }),
            assign: (count) => ({ presses: count.presses + 1 }),
            to: 'on',
          },
        ],
        SET: { assign: (_, event) => ({ presses: event.type === 'SET' ? event.to : 0 }) },
      },
    },
    on: {
      on: {
        BREAK: { to: 'broken' },
        PRESS: { assign: (count) => ({ presses: count.presses + 1 }), to: 'off' },
        SET: { to: (_, event) => (event.type === 'SET' && event.to > 0 ? 'on' : 'off') },
      },
    },
  },
}

const none: Count = { presses: 0 }

describe('a step', () => {
  test('goes where the way it takes says, with the context it assigns', () => {
    const next = step(light, 'off', none, { type: 'PRESS' })
    expect([next.state, next.context, next.changed, next.entered]).toEqual([
      'on',
      { presses: 1 },
      true,
      true,
    ])
  })

  test('takes the first way whose guard passes, and a way that goes nowhere stays', () => {
    const next = step(light, 'off', { presses: 2 }, { type: 'PRESS' })
    expect([next.state, next.changed, next.entered]).toEqual(['off', false, false])
  })

  test('changes nothing for an event the state does not answer, or ignores', () => {
    expect(step(light, 'broken', none, { type: 'BREAK' }).changed).toBe(false)
    expect(step(light, 'broken', none, { type: 'PRESS' }).changed).toBe(false)
  })

  test('may change the context and stay, entering nothing', () => {
    const next = step(light, 'off', none, { to: 5, type: 'SET' })
    expect([next.state, next.context, next.changed, next.entered]).toEqual([
      'off',
      { presses: 5 },
      true,
      false,
    ])
  })

  test('enters a state again where `to` names the state it is in', () => {
    const next = step(light, 'on', none, { to: 1, type: 'SET' })
    expect([next.state, next.changed, next.entered]).toEqual(['on', true, true])
  })

  test('says which moves are requests, and makes the event to ask with', () => {
    expect(step(light, 'off', none, { type: 'PRESS' }).ask?.().type).toBe('before-on')
    expect(step(light, 'on', none, { type: 'PRESS' }).ask).toBeUndefined()
  })

  test('runs nothing and keeps the context it was given', () => {
    const count = { presses: 1 }
    step(light, 'on', count, { type: 'PRESS' })
    expect(count).toEqual({ presses: 1 })
  })
})

describe('an exhaustive machine', () => {
  test('names every event in every state, so the ignored pairs can be listed', () => {
    const door: ExhaustiveMachine<'open' | 'shut', { type: 'PUSH' } | { type: 'PULL' }, null> = {
      states: {
        open: { on: { PULL: 'ignore', PUSH: { to: 'shut' } } },
        shut: { on: { PULL: { to: 'open' }, PUSH: 'ignore' } },
      },
    }
    const ignored = Object.entries(door.states).flatMap(([state, { on }]) =>
      Object.entries(on)
        .filter(([, answer]) => answer === 'ignore')
        .map(([event]) => `${state} ${event}`),
    )
    expect(ignored).toEqual(['open PULL', 'shut PUSH'])
  })
})
