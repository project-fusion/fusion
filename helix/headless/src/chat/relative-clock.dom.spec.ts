import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* The clock a turn's name is read against, on its own.
 *
 * **Driven by a clock that runs only when told**, installed where core's
 * `withClock` installs one: the ticker keeps its state under a global symbol,
 * so a spec outside core can hold the same arrangement. A wall-clock wait for
 * the words to go stale is the flaky test the ticker's own spec moved away
 * from. */

let RelativeClockController: typeof import('./relative-clock.js').RelativeClockController

beforeAll(async () => {
  registerDom()
  ;({ RelativeClockController } = await import('./relative-clock.js'))
})

const KEY = Symbol.for('helix.ticker')
const global = globalThis as unknown as Record<symbol, unknown>
let before: unknown

/** A stopped clock under the ticker, and what is waiting on it. */
const stopped = () => {
  before = global[KEY]
  let now = Date.now()
  let pending: { at: number; run: () => void } | undefined
  const waiting = new Set<{ at: number; run: () => void }>()
  global[KEY] = {
    clock: {
      clearTimer: () => {
        pending = undefined
      },
      now: () => now,
      setTimer: (run: () => void, wait: number) => {
        pending = { at: now + wait, run }
        return 1
      },
    },
    timer: undefined,
    waiting,
  }
  return {
    advance: (ms: number) => {
      now += ms
      if (pending && pending.at <= now) {
        const due = pending
        pending = undefined
        due.run()
      }
    },
    waiting,
  }
}

afterEach(() => {
  global[KEY] = before
})

const host = (connected: boolean) => {
  const element = document.createElement('div')
  if (connected) {
    document.body.append(element)
  }
  const host = Object.assign(element, {
    addController: () => {},
    removeController: () => {},
    requestUpdate: () => {
      host.updates += 1
    },
    updateComplete: Promise.resolve(true),
    updates: 0,
  })
  return host
}

describe('the relative clock', () => {
  test('wakes once when the words go stale, and asks for one render each time', () => {
    const clock = stopped()
    const element = host(true)
    const moment = new Date(Date.now() - 30_000)
    const controller = new RelativeClockController(element, {
      locale: () => 'en',
      moment: () => moment,
    })
    controller.hostConnected()
    expect(clock.waiting.size).toBe(1)
    const drawn = element.updates
    clock.advance(60_000)
    expect(element.updates).toBe(drawn + 1)
    // Read again, and waiting on the next change of words.
    expect(clock.waiting.size).toBe(1)
    element.remove()
  })

  test('waits on nothing once disconnected, or while there is no instant', () => {
    const clock = stopped()
    const element = host(true)
    const controller = new RelativeClockController(element, {
      locale: () => 'en',
      moment: () => new Date(Date.now() - 30_000),
    })
    controller.hostConnected()
    controller.hostDisconnected()
    expect(clock.waiting.size).toBe(0)
    const none = new RelativeClockController(element, {
      locale: () => 'en',
      moment: () => undefined,
    })
    none.tick()
    expect(clock.waiting.size).toBe(0)
    element.remove()
  })

  test('off the page, reads the time and schedules nothing, as on a server', () => {
    const clock = stopped()
    const element = host(false)
    const controller = new RelativeClockController(element, {
      locale: () => 'en',
      moment: () => new Date(Date.now() - 30_000),
    })
    const was = controller.now
    controller.tick()
    expect(controller.now).toBeGreaterThanOrEqual(was)
    expect(clock.waiting.size).toBe(0)
  })
})
