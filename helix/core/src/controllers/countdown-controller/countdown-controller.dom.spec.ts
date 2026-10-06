import { afterEach, describe, expect, test } from 'bun:test'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { CountdownController } from './countdown-controller.js'

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

const now = Date.now
let clock = 0

afterEach(() => {
  Date.now = now
})

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

describe('CountdownController', () => {
  test('runs out once the time is spent', async () => {
    let done = 0
    const countdown = new CountdownController(host(), { done: () => (done += 1) })
    countdown.start(10)
    expect(countdown.running).toBe(true)
    await wait(30)
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
    Date.now = () => clock
    clock = 1000
    const states: boolean[] = []
    const countdown = new CountdownController(host(), {
      done: () => {},
      paused: (paused) => states.push(paused),
    })
    countdown.start(5000)
    clock = 3000
    countdown.pause()
    expect(countdown.running).toBe(false)
    expect((countdown as unknown as { remaining: number }).remaining).toBe(3000)
    countdown.resume()
    expect(countdown.running).toBe(true)
    expect(states).toEqual([false, true, false])
    countdown.cancel()
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
  test('once spent, a hold and a release run nothing again', async () => {
    let done = 0
    const countdown = new CountdownController(host(), { done: () => (done += 1) })
    countdown.start(10)
    await wait(30)
    expect(done).toBe(1)
    countdown.hold()
    countdown.release()
    expect(countdown.running).toBe(false)
    await wait(30)
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

  test('leaving the page pauses it and drops the holds', () => {
    const owner = host()
    const countdown = new CountdownController(owner, { done: () => {} })
    countdown.start(5000)
    countdown.hold()
    owner.controllers[0]?.hostDisconnected?.()
    countdown.resume()
    expect(countdown.running).toBe(true)
    countdown.cancel()
  })
})
