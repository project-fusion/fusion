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

const realDocument = globalThis.document

afterEach(() => {
  Date.now = now
  globalThis.document = realDocument
})

/** A page whose visibility a case sets, standing in for `document`. */
const page = () => {
  const target = new EventTarget() as EventTarget & {
    hidden: boolean
    show: (hidden: boolean) => void
  }
  target.hidden = false
  target.show = (hidden) => {
    target.hidden = hidden
    target.dispatchEvent(new Event('visibilitychange'))
  }
  globalThis.document = target as unknown as Document
  return target
}

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

  test('with holdWhileHidden, a hidden page holds the clock once, however often it hides', () => {
    const shown = page()
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
    shown.show(true)
    shown.show(true)
    expect(countdown.running).toBe(false)
    countdown.hold()
    shown.show(false)
    expect(countdown.running).toBe(false)
    countdown.release()
    expect(countdown.running).toBe(true)
    expect(paused).toEqual([false, true, false])
    countdown.cancel()
  })

  test('with holdWhileHidden, a clock started on a hidden page waits for it to show', () => {
    const shown = page()
    shown.hidden = true
    const owner = host()
    const countdown = new CountdownController(owner, { done: () => {}, holdWhileHidden: true })
    for (const one of owner.controllers) {
      one.hostConnected?.()
    }
    countdown.start(1000)
    expect(countdown.running).toBe(false)
    countdown.resume()
    expect(countdown.running).toBe(false)
    shown.show(false)
    expect(countdown.running).toBe(true)
    countdown.cancel()
  })

  test('with holdWhileHidden, leaving the page stops listening, and without it the page is never read', () => {
    const shown = page()
    const owner = host()
    const countdown = new CountdownController(owner, { done: () => {}, holdWhileHidden: true })
    for (const one of owner.controllers) {
      one.hostConnected?.()
      one.hostDisconnected?.()
    }
    countdown.start(1000)
    shown.show(true)
    expect(countdown.running).toBe(true)
    countdown.cancel()
    const plain = new CountdownController(host(), { done: () => {} })
    plain.hostConnected()
    plain.start(1000)
    shown.show(true)
    expect(plain.running).toBe(true)
    plain.cancel()
  })
})
