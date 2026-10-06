import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { Machine } from './machine.js'
import type * as Subject from './machine-controller.js'

/* The page first, then the module: `requestChange` loads an event class that
   extends the `CustomEvent` it finds as it loads, and a DOM spec later in the
   same run dispatches it. */
let MachineController: typeof Subject.MachineController

beforeAll(async () => {
  registerDom()
  ;({ MachineController } = await import('./machine-controller.js'))
})

type Door = 'open' | 'shut'
type Push = { type: 'OPEN' } | { type: 'SHUT' } | { type: 'KNOCK' }
type Effect = 'draft' | 'greet'

/* A door that opens on request, asking first, and lets a draft in while open. */
const door: Machine<Door, Push, { knocks: number }, Effect> = {
  states: {
    open: {
      atStart: ['draft'],
      effects: ['draft', 'greet'],
      mark: true,
      on: { KNOCK: { to: 'open' }, SHUT: { to: 'shut' } },
    },
    shut: {
      on: {
        KNOCK: { assign: ({ knocks }) => ({ knocks: knocks + 1 }) },
        OPEN: { ask: () => new Event('before-open', { cancelable: true }), to: 'open' },
      },
    },
  },
}

const made: HTMLElement[] = []

afterEach(() => {
  for (const one of made.splice(0)) {
    one.remove()
  }
})

const setup = async (initial: Door = 'shut') => {
  const { ReactiveElement } = await import('lit')
  const log: string[] = []
  const marks = new Set<string>()
  class Host extends ReactiveElement {
    machine = new MachineController(this, door, {
      context: { knocks: 0 },
      effects: {
        draft: (_, by) => {
          log.push(`draft in by ${by?.type ?? 'nobody'}`)
          return () => log.push('draft out')
        },
        greet: (_, by) => {
          log.push(`greet by ${by?.type ?? 'nobody'}`)
          return undefined
        },
      },
      initial,
      mark: (state, on) => (on ? marks.add(state) : marks.delete(state)),
    })
  }
  const name = `machine-host-${Math.random().toString(36).slice(2)}`
  customElements.define(name, Host)
  const host = document.createElement(name) as InstanceType<typeof Host>
  made.push(host)
  document.body.append(host)
  await host.updateComplete
  return { host, log, marks }
}

describe('a machine controller', () => {
  test('runs no effect at the first update but the ones the state asks for', async () => {
    const { log, marks } = await setup('open')
    expect([log, [...marks]]).toEqual([['draft in by nobody'], ['open']])
  })

  test('runs the effects of a state it enters after the next update, told the event', async () => {
    const { host, log, marks } = await setup()
    expect(host.machine.send({ type: 'OPEN' })).toBe(true)
    expect(log).toEqual([])
    await host.updateComplete
    expect([log, [...marks]]).toEqual([['draft in by OPEN', 'greet by OPEN'], ['open']])
  })

  test('ends them when the state is left, by any event, before the next update', async () => {
    const { host, log, marks } = await setup()
    host.machine.send({ type: 'OPEN' })
    await host.updateComplete
    host.machine.send({ type: 'SHUT' })
    expect(log.at(-1)).toBe('draft out')
    expect(host.machine.state).toBe('shut')
    expect([...marks]).toEqual([])
  })

  test('enters a state again, ending and running its effects, where `to` names it', async () => {
    const { host, log } = await setup()
    host.machine.send({ type: 'OPEN' })
    await host.updateComplete
    log.length = 0
    host.machine.send({ type: 'KNOCK' })
    await host.updateComplete
    expect(log).toEqual(['draft out', 'draft in by KNOCK', 'greet by KNOCK'])
  })

  test('asks before a request, and a refusal moves nothing', async () => {
    const { host } = await setup()
    const refuse = (event: Event): void => event.preventDefault()
    host.addEventListener('before-open', refuse)
    expect(host.machine.send({ type: 'OPEN' })).toBe(false)
    expect(host.machine.state).toBe('shut')
    host.removeEventListener('before-open', refuse)
    expect(host.machine.send({ type: 'OPEN' })).toBe(true)
    expect(host.machine.state).toBe('open')
  })

  test('says whether an event would move it, with nothing asked', async () => {
    const { host } = await setup()
    let asked = 0
    host.addEventListener('before-open', () => {
      asked += 1
    })
    expect([host.machine.can({ type: 'OPEN' }), host.machine.can({ type: 'SHUT' }), asked]).toEqual(
      [true, false, 0],
    )
  })

  test('changes the context and runs nothing for a move that enters no state', async () => {
    const { host, log } = await setup()
    expect(host.machine.send({ type: 'KNOCK' })).toBe(true)
    await host.updateComplete
    expect([host.machine.context, log]).toEqual([{ knocks: 1 }, []])
  })

  test('ends the effects on disconnect, and runs them again with no event when back', async () => {
    const { host, log } = await setup()
    host.machine.send({ type: 'OPEN' })
    await host.updateComplete
    log.length = 0
    host.remove()
    document.body.append(host)
    expect(log).toEqual(['draft out', 'draft in by nobody', 'greet by nobody'])
  })
})
