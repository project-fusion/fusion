import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { FAKE_WALL_START, type FakeTimers, fakeTimers } from '../../capabilities/timers/fake.js'
import { setTimers, timers } from '../../capabilities/timers/index.js'

/* The clock a relative reading is drawn against, on its own: Chat Message's
 * turns, Timeline's items and Format Date's readings.
 *
 * **Driven by a fake clock set as the timers capability**, the one a phone's
 * wall clock runs on, so no case waits on real time. */

let relativeTime: typeof import('../../utils/relative-time/relative-time.js').relativeTime
let RelativeClockController: typeof import('./relative-clock-controller.js').RelativeClockController

beforeAll(async () => {
  registerDom()
  ;({ RelativeClockController } = await import('./relative-clock-controller.js'))
  ;({ relativeTime } = await import('../../utils/relative-time/relative-time.js'))
})

const original = timers()
let clock: FakeTimers

beforeEach(() => {
  clock = fakeTimers()
  setTimers(clock)
})

afterEach(() => {
  setTimers(original)
})

/** Thirty seconds before the fake clock's start. */
const moment = new Date(FAKE_WALL_START - 30_000)

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
    const element = host(true)
    const controller = new RelativeClockController(element, {
      expires: (now) => relativeTime('en')(moment, now).next,
    })
    controller.hostConnected()
    expect(controller.now).toBe(FAKE_WALL_START)
    expect(clock.pending().timeouts).toBe(1)
    const drawn = element.updates
    const stale = relativeTime('en')(moment, new Date(FAKE_WALL_START)).next ?? 0
    clock.advance(Math.max(stale, 1000) - 1)
    expect(element.updates).toBe(drawn)
    clock.advance(1)
    expect(element.updates).toBe(drawn + 1)
    expect(controller.now).toBeGreaterThan(FAKE_WALL_START)
    // Read again, and waiting on the next change of words.
    expect(clock.pending().timeouts).toBe(1)
    controller.hostDisconnected()
    element.remove()
  })

  test('waits on nothing once disconnected, or while there is no reading, and draws nothing new for none', () => {
    const element = host(true)
    const controller = new RelativeClockController(element, {
      expires: (now) => relativeTime('en')(moment, now).next,
    })
    controller.hostConnected()
    controller.hostDisconnected()
    expect(clock.pending().timeouts).toBe(0)
    expect(clock.pending().observers).toBe(0)
    const none = new RelativeClockController(element, {
      expires: () => undefined,
    })
    const drawn = element.updates
    none.tick()
    expect(clock.pending().timeouts).toBe(0)
    expect(element.updates).toBe(drawn)
    none.hostDisconnected()
    element.remove()
  })

  test('stops while the page is hidden, and reads the time again as it shows', () => {
    const element = host(true)
    const controller = new RelativeClockController(element, {
      expires: (now) => relativeTime('en')(moment, now).next,
    })
    controller.hostConnected()
    clock.setVisible(false)
    expect(clock.pending().timeouts).toBe(0)
    clock.setWall(FAKE_WALL_START + 3_600_000)
    const drawn = element.updates
    clock.setVisible(true)
    expect(element.updates).toBe(drawn + 1)
    expect(controller.now).toBe(FAKE_WALL_START + 3_600_000)
    controller.hostDisconnected()
    element.remove()
  })

  test('off the page, reads the time and schedules nothing, as on a server', () => {
    const element = host(false)
    const controller = new RelativeClockController(element, {
      expires: (now) => relativeTime('en')(moment, now).next,
    })
    controller.tick()
    expect(controller.now).toBe(FAKE_WALL_START)
    expect(clock.pending().timeouts).toBe(0)
  })
})
