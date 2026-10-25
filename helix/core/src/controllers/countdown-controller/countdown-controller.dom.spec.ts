import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { type FakeTimers, fakeTimers } from '../../capabilities/timers/fake.js'
import { setTimers, timers } from '../../capabilities/timers/index.js'
import { CountdownController } from './countdown-controller.js'

/* On a fake clock set as the timers capability, which the controller runs
   on: `advance` moves the time and `setVisible` hides or shows the page. */
const original = timers()
let clock: FakeTimers

beforeEach(() => {
  clock = fakeTimers()
  setTimers(clock)
})

afterEach(() => {
  setTimers(original)
})

/** A host that only keeps its controllers, which is all the countdown asks of one. */
const host = (): ReactiveControllerHost & { controllers: ReactiveController[] } => {
  const controllers: ReactiveController[] = []
  return {
    addController: (one) => controllers.push(one),
    controllers,
    removeController: () => {},
    requestUpdate: () => {},
    updateComplete: Promise.resolve(true),
  }
}

describe('CountdownController', () => {
  test('runs out once the time is spent', () => {
    let done = 0
    const countdown = new CountdownController(host(), { done: () => (done += 1) })
    countdown.start(10)
    expect(countdown.running).toBe(true)
    clock.advance(10)
    expect(done).toBe(1)
    expect(countdown.running).toBe(false)
  })

  test('nothing, zero or less starts no clock', () => {
    const countdown = new CountdownController(host(), { done: () => {} })
    countdown.start(undefined)
    countdown.start(0)
    countdown.start(-5)
    expect(countdown.running).toBe(false)
  })

  test('a pause keeps what is left, and resuming continues from it', () => {
    let done = 0
    const states: boolean[] = []
    const countdown = new CountdownController(host(), {
      done: () => (done += 1),
      paused: (paused) => states.push(paused),
    })
    countdown.start(5000)
    clock.advance(2000)
    countdown.pause()
    expect(countdown.running).toBe(false)
    clock.advance(10_000)
    countdown.resume()
    expect(countdown.running).toBe(true)
    clock.advance(2999)
    expect(done).toBe(0)
    clock.advance(1)
    expect(done).toBe(1)
    expect(states).toEqual([false, true, false])
  })

  test('holds are counted, so only the last one out runs the clock again', () => {
    const countdown = new CountdownController(host(), { done: () => {} })
    countdown.start(5000)
    countdown.hold()
    countdown.hold()
    countdown.release()
    expect(countdown.running).toBe(false)
    countdown.release()
    expect(countdown.running).toBe(true)
    countdown.cancel()
  })

  /* An Announcement whose page refused `helix-dismiss` sent it again one
     duration after every hover: the spent clock still held its whole time. */
  test('once spent, a hold and a release run nothing again', () => {
    let done = 0
    const countdown = new CountdownController(host(), { done: () => (done += 1) })
    countdown.start(10)
    clock.advance(10)
    expect(done).toBe(1)
    countdown.hold()
    countdown.release()
    expect(countdown.running).toBe(false)
    clock.advance(30)
    expect(done).toBe(1)
  })

  test('nor once canceled, until it is started again', () => {
    const countdown = new CountdownController(host(), { done: () => {} })
    countdown.start(5000)
    countdown.cancel()
    countdown.hold()
    countdown.release()
    expect(countdown.running).toBe(false)
    countdown.start(5000)
    expect(countdown.running).toBe(true)
    countdown.cancel()
  })

  test('leaving the page pauses it, keeps the time left, and drops the holds', () => {
    let done = 0
    const owner = host()
    const countdown = new CountdownController(owner, { done: () => (done += 1) })
    countdown.start(5000)
    clock.advance(1000)
    countdown.hold()
    owner.controllers[0]?.hostDisconnected?.()
    countdown.resume()
    expect(countdown.running).toBe(true)
    clock.advance(3999)
    expect(done).toBe(0)
    clock.advance(1)
    expect(done).toBe(1)
  })

  test('with holdWhileHidden, a hidden page holds the clock once, however often it hides', () => {
    const paused: boolean[] = []
    const owner = host()
    const countdown = new CountdownController(owner, {
      done: () => {},
      holdWhileHidden: true,
      paused: (on) => paused.push(on),
    })
    for (const one of owner.controllers) {
      one.hostConnected?.()
    }
    countdown.start(1000)
    clock.setVisible(false)
    clock.setVisible(false)
    expect(countdown.running).toBe(false)
    countdown.hold()
    clock.setVisible(true)
    expect(countdown.running).toBe(false)
    countdown.release()
    expect(countdown.running).toBe(true)
    expect(paused).toEqual([false, true, false])
    countdown.cancel()
  })

  test('with holdWhileHidden, a clock started on a hidden page waits for it to show', () => {
    clock.setVisible(false)
    const owner = host()
    const countdown = new CountdownController(owner, { done: () => {}, holdWhileHidden: true })
    for (const one of owner.controllers) {
      one.hostConnected?.()
    }
    countdown.start(1000)
    expect(countdown.running).toBe(false)
    countdown.resume()
    expect(countdown.running).toBe(false)
    clock.setVisible(true)
    expect(countdown.running).toBe(true)
    countdown.cancel()
  })

  test('with holdWhileHidden, leaving the page stops listening, and without it the page is never read', () => {
    const owner = host()
    const countdown = new CountdownController(owner, { done: () => {}, holdWhileHidden: true })
    for (const one of owner.controllers) {
      one.hostConnected?.()
      one.hostDisconnected?.()
    }
    countdown.start(1000)
    clock.setVisible(false)
    expect(countdown.running).toBe(true)
    countdown.cancel()
    clock.setVisible(true)
    const plain = new CountdownController(host(), { done: () => {} })
    plain.hostConnected()
    plain.start(1000)
    clock.setVisible(false)
    expect(plain.running).toBe(true)
    expect(clock.pending().observers).toBe(0)
    plain.cancel()
  })
})
