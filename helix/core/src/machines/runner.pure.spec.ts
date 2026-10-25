import { afterEach, describe, expect, test } from 'bun:test'
import { fakeTimers } from '../capabilities/timers/fake.js'
import { setTimers } from '../capabilities/timers/index.js'
import { serverTimers } from '../capabilities/timers/server.js'
import * as nested from './fixtures/nested/nested.generated.js'
import * as toggle from './fixtures/toggle/toggle.generated.js'
import { type Host, type Performed, type Platform, run } from './runner.js'
import type { Argument } from './statechart.js'

type ToggleEffect = Performed<typeof toggle>
type NestedEffect = Performed<typeof nested>

/** A host that writes down each effect it performs, with the context it read. */
const writing = <C, E extends string>(
  names: readonly E[],
  notifies: readonly E[] = [],
): Host<C, E> & { readonly done: string[] } => {
  const done: string[] = []
  const perform = {} as Record<E, (context: C, argument: Argument | undefined) => void>
  for (const name of names) {
    perform[name] = (_context, argument) => {
      done.push(argument === undefined ? name : `${name} ${JSON.stringify(argument)}`)
    }
  }
  return { done, notifies, perform }
}

const TOGGLE_EFFECTS: readonly ToggleEffect[] = ['glow', 'hum', 'say']
const NESTED_EFFECTS: readonly NestedEffect[] = ['focus', 'hide', 'reset', 'show']

const off: toggle.ToggleContext = { on: false, refused: 0, stuck: false }

afterEach(() => {
  setTimers(serverTimers)
})

/** A platform that accepts every request, or refuses every one. */
const answering = <C>(accepts: boolean, heard: string[] = []): Platform<C> => ({
  ask: (events) => {
    heard.push(...events)
    return accepts
  },
})

describe('run', () => {
  test('starts in the state its context reads as, and runs that state’s effects once mounted', () => {
    const host = writing<toggle.ToggleContext, ToggleEffect>(TOGGLE_EFFECTS)
    const runner = run(toggle, off, host, { ...answering(true), timers: fakeTimers() })
    expect(runner.state()).toBe(toggle.STATE_OFF)
    expect(host.done).toEqual([])
    runner.mount()
    expect(host.done).toEqual(['say'])
  })

  test('commits a move before it runs the move’s effects', () => {
    const order: string[] = []
    const host: Host<toggle.ToggleContext, ToggleEffect> = {
      notifies: [],
      perform: {
        glow: (context) => order.push(`glow while on is ${context.on}`),
        hum: () => undefined,
        say: () => undefined,
      },
    }
    const runner = run(toggle, off, host, {
      ...answering(true),
      changed: (state) => order.push(`changed to ${toggle.STATES[state]}`),
      timers: fakeTimers(),
    })
    runner.send(toggle.EVENT_FLIP, { by: 1 })
    expect(order).toEqual(['changed to on', 'glow while on is true'])
  })

  test('takes a deadline when its state lasts, and drops it when the state is left first', () => {
    const timers = fakeTimers()
    const host = writing<toggle.ToggleContext, ToggleEffect>(TOGGLE_EFFECTS)
    const runner = run(toggle, off, host, { ...answering(true), timers })
    runner.send(toggle.EVENT_FLIP, { by: 1 })
    timers.advance(999)
    expect(runner.state()).toBe(toggle.STATE_ON)
    timers.advance(1)
    expect(runner.state()).toBe(toggle.STATE_OFF)
    expect(host.done).toEqual(['glow', 'glow', 'say', 'say'])

    runner.send(toggle.EVENT_FLIP, { by: 1 })
    runner.send(toggle.EVENT_FLIP, { by: 1 })
    expect(timers.pending().timeouts).toBe(0)
    host.done.length = 0
    timers.advance(1000)
    expect(runner.state()).toBe(toggle.STATE_OFF)
    expect(host.done).toEqual([])
  })

  test('asks with every event of a request in order, and takes the accepted move', () => {
    const heard: string[] = []
    const host = writing<toggle.ToggleContext, ToggleEffect>(TOGGLE_EFFECTS)
    const runner = run(toggle, off, host, { ...answering(true, heard), timers: fakeTimers() })
    runner.send(toggle.EVENT_ASK, { by: 2 })
    expect(heard).toEqual(['before-turn', 'turn'])
    expect(runner.state()).toBe(toggle.STATE_ON)
    expect(host.done).toEqual(['hum {"level":2,"loud":true,"tone":"low"}'])
  })

  test('takes the refused move, with its own update, where a request is refused', () => {
    const host = writing<toggle.ToggleContext, ToggleEffect>(TOGGLE_EFFECTS)
    const runner = run(toggle, off, host, { ...answering(false), timers: fakeTimers() })
    runner.send(toggle.EVENT_ASK, { by: 2 })
    expect(runner.state()).toBe(toggle.STATE_OFF)
    expect(runner.context().refused).toBe(2)
    expect(host.done).toEqual([])
  })

  test('hands the platform the context a request would leave', () => {
    const proposed: boolean[] = []
    const host = writing<toggle.ToggleContext, ToggleEffect>(TOGGLE_EFFECTS)
    const runner = run(toggle, off, host, {
      ask: (_events, would) => {
        proposed.push(would.on)
        return true
      },
      timers: fakeTimers(),
    })
    runner.send(toggle.EVENT_ASK, { by: 2 })
    expect(proposed).toEqual([true])
  })

  test('holds an event an effect sends until the one before it has run its effects', () => {
    const done: string[] = []
    let runner: ReturnType<typeof run<toggle.ToggleContext, toggle.ToggleInput, ToggleEffect>>
    const host: Host<toggle.ToggleContext, ToggleEffect> = {
      notifies: [],
      perform: {
        glow: (context) => {
          done.push(`glow ${context.on}`)
          if (context.on) {
            runner.send(toggle.EVENT_FLIP, { by: 1 })
          }
        },
        hum: () => undefined,
        say: () => done.push('say'),
      },
    }
    const timers = fakeTimers()
    runner = run(toggle, off, host, { ...answering(true), timers })
    runner.send(toggle.EVENT_FLIP, { by: 1 })
    expect(done).toEqual(['glow true', 'glow false', 'say'])
    expect(runner.state()).toBe(toggle.STATE_OFF)
    /* Run at once, the second flip would have left `on` before the first had
       started its deadline, which would then wait in `off`. */
    expect(timers.pending().timeouts).toBe(0)
  })

  test('runs the events waiting behind an effect that throws, and then throws', () => {
    let runner: ReturnType<typeof run<toggle.ToggleContext, toggle.ToggleInput, ToggleEffect>>
    const host: Host<toggle.ToggleContext, ToggleEffect> = {
      notifies: [],
      perform: {
        glow: (context) => {
          if (context.on) {
            runner.send(toggle.EVENT_FLIP, { by: 1 })
            throw new Error('the platform failed')
          }
        },
        hum: () => undefined,
        say: () => undefined,
      },
    }
    runner = run(toggle, off, host, { ...answering(true), timers: fakeTimers() })
    expect(() => runner.send(toggle.EVENT_FLIP, { by: 1 })).toThrow('the platform failed')
    expect(runner.state()).toBe(toggle.STATE_OFF)
  })

  test('hands each effect the input of the event that caused it, and none to a deadline', () => {
    const inputs: string[] = []
    const timers = fakeTimers()
    const host: Host<toggle.ToggleContext, ToggleEffect, toggle.ToggleInput> = {
      notifies: [],
      perform: {
        glow: (_context, _argument, input) => inputs.push(`glow ${input?.by}`),
        hum: () => undefined,
        say: (_context, _argument, input) => inputs.push(`say ${input?.by}`),
      },
    }
    const runner = run(toggle, off, host, { ...answering(true), timers })
    runner.send(toggle.EVENT_FLIP, { by: 3 })
    timers.advance(1000)
    expect(inputs).toEqual(['glow 3', 'glow undefined', 'say undefined', 'say undefined'])
  })

  test('keeps time on the timers set once a deadline starts, not those in use when it was made', () => {
    const host = writing<toggle.ToggleContext, ToggleEffect>(TOGGLE_EFFECTS)
    const runner = run(toggle, off, host, answering(true))
    const timers = fakeTimers()
    setTimers(timers)
    runner.send(toggle.EVENT_FLIP, { by: 1 })
    timers.advance(1000)
    expect(runner.state()).toBe(toggle.STATE_OFF)
  })

  test('takes a revised context between events, with no move and no effect', () => {
    const changes: boolean[] = []
    const host = writing<toggle.ToggleContext, ToggleEffect>(TOGGLE_EFFECTS)
    const runner = run(toggle, off, host, {
      ...answering(true),
      changed: (_state, context) => changes.push(context.stuck),
      timers: fakeTimers(),
    })
    runner.send(toggle.EVENT_FLIP, { by: 1 })
    runner.revise((context) => ({ ...context, stuck: true }))
    runner.send(toggle.EVENT_FLIP, { by: 1 })
    expect(runner.state()).toBe(toggle.STATE_ON)
    expect(runner.context().refused).toBe(1)
    expect(changes).toEqual([false, true, true])
    expect(host.done).toEqual(['glow'])
  })

  test('keeps running after an effect throws, with the move that threw committed', () => {
    let broken = true
    const host: Host<toggle.ToggleContext, ToggleEffect> = {
      notifies: [],
      perform: {
        glow: () => {
          if (broken) {
            throw new Error('the platform failed')
          }
        },
        hum: () => undefined,
        say: () => undefined,
      },
    }
    const runner = run(toggle, off, host, { ...answering(true), timers: fakeTimers() })
    expect(() => runner.send(toggle.EVENT_FLIP, { by: 1 })).toThrow('the platform failed')
    expect(runner.state()).toBe(toggle.STATE_ON)
    broken = false
    runner.send(toggle.EVENT_FLIP, { by: 1 })
    expect(runner.state()).toBe(toggle.STATE_OFF)
  })

  test('takes a context a property wrote, in the state it reads as, with no effect', () => {
    const timers = fakeTimers()
    const host = writing<toggle.ToggleContext, ToggleEffect>(TOGGLE_EFFECTS)
    const runner = run(toggle, off, host, { ...answering(true), timers })
    runner.send(toggle.EVENT_FLIP, { by: 1 })
    host.done.length = 0
    runner.reseat({ ...off, refused: 4 })
    expect(runner.state()).toBe(toggle.STATE_OFF)
    expect(runner.context().refused).toBe(4)
    expect(host.done).toEqual([])
    expect(timers.pending().timeouts).toBe(0)
  })

  test('runs the rest of a move without what tells the consumer once an effect stops it', () => {
    const timers = fakeTimers()
    const done: string[] = []
    let runner: ReturnType<typeof run<toggle.ToggleContext, toggle.ToggleInput, ToggleEffect>>
    const host: Host<toggle.ToggleContext, ToggleEffect> = {
      notifies: ['say'],
      perform: {
        glow: (context) => {
          done.push('glow')
          if (!context.on) {
            runner.stop()
          }
        },
        hum: () => undefined,
        say: () => done.push('say'),
      },
    }
    runner = run(toggle, off, host, { ...answering(true), timers })
    runner.send(toggle.EVENT_FLIP, { by: 1 })
    timers.advance(1000)
    expect(done).toEqual(['glow', 'glow'])
    runner.mount()
    runner.send(toggle.EVENT_FLIP, { by: 1 })
    expect(runner.state()).toBe(toggle.STATE_OFF)
    expect(done).toEqual(['glow', 'glow'])
    expect(timers.pending().timeouts).toBe(0)
  })

  test('takes the cancel when stopped, leaving out what tells the consumer, and ends every deadline', () => {
    const timers = fakeTimers()
    const host = writing<nested.NestedContext, NestedEffect>(NESTED_EFFECTS, ['reset'])
    const runner = run(nested, { turned: 0 }, host, { ...answering(true), timers })
    runner.send(nested.EVENT_OPEN, { wraps: false })
    host.done.length = 0
    runner.stop()
    expect(runner.state()).toBe(nested.STATE_CLOSED)
    expect(host.done).toEqual(['hide'])
    runner.send(nested.EVENT_OPEN, { wraps: false })
    timers.advance(3000)
    expect(runner.state()).toBe(nested.STATE_CLOSED)
    expect(host.done).toEqual(['hide'])
  })
})
