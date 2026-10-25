import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { type FakeTimers, fakeTimers } from '../../capabilities/timers/fake.js'
import { setTimers, timers } from '../../capabilities/timers/index.js'
import { DelayController } from './delay-controller.js'

/* On a fake clock set as the timers capability, which the controller runs
   on, so no case waits on real time. */
const original = timers()
let clock: FakeTimers

beforeEach(() => {
  clock = fakeTimers()
  setTimers(clock)
})

afterEach(() => {
  setTimers(original)
})

/** A host that holds its controllers and counts the updates it was asked for. */
const host = () => {
  const held: ReactiveController[] = []
  const element = {
    addController: (controller: ReactiveController) => held.push(controller),
    asked: 0,
    disconnect: () => {
      for (const one of held) {
        one.hostDisconnected?.()
      }
    },
    requestUpdate: () => {
      element.asked += 1
    },
  }
  return element as unknown as ReactiveControllerHost & { asked: number; disconnect(): void }
}

describe('a wait an element starts', () => {
  test('runs out after its time, and the host updates', () => {
    const element = host()
    const wait = new DelayController(element)
    let ran = 0
    wait.start(10, () => ran++)
    expect(wait.pending).toBe(true)
    expect(wait.elapsed).toBe(false)
    clock.advance(10)
    expect(wait.elapsed).toBe(true)
    expect(wait.pending).toBe(false)
    expect(ran).toBe(1)
    expect(element.asked).toBe(1)
  })

  test('starts over from not elapsed, and no time starts no wait', () => {
    const wait = new DelayController(host())
    wait.start(5)
    clock.advance(5)
    expect(wait.elapsed).toBe(true)
    wait.start(undefined)
    expect(wait.elapsed).toBe(false)
    expect(wait.pending).toBe(false)
    clock.advance(20)
    expect(wait.elapsed).toBe(false)
  })

  test('a restart replaces the wait running', () => {
    const wait = new DelayController(host())
    let first = 0
    wait.start(10, () => first++)
    wait.start(40)
    clock.advance(25)
    expect(first).toBe(0)
    expect(wait.elapsed).toBe(false)
  })

  test('canceled, it never runs out', () => {
    const wait = new DelayController(host())
    let ran = 0
    wait.start(10, () => ran++)
    wait.cancel()
    clock.advance(30)
    expect(ran).toBe(0)
    expect(wait.elapsed).toBe(false)
  })

  test('flushed, it runs out now, and only where it was running', () => {
    const wait = new DelayController(host())
    let ran = 0
    wait.flush()
    expect(wait.elapsed).toBe(false)
    wait.start(1000, () => ran++)
    wait.flush()
    expect(ran).toBe(1)
    expect(wait.elapsed).toBe(true)
    expect(wait.pending).toBe(false)
  })

  test('stops when the host leaves the page, remembering that it ran out', () => {
    const element = host()
    const wait = new DelayController(element)
    wait.start(5)
    clock.advance(5)
    let ran = 0
    wait.start(10, () => ran++)
    element.disconnect()
    clock.advance(30)
    expect(ran).toBe(0)
    expect(wait.pending).toBe(false)
    wait.start(1)
    clock.advance(1)
    element.disconnect()
    expect(wait.elapsed).toBe(true)
  })

  test('a wait the host does not render asks for no update', () => {
    const element = host()
    const wait = new DelayController(element, { renders: false })
    wait.start(5)
    clock.advance(5)
    expect(wait.elapsed).toBe(true)
    expect(element.asked).toBe(0)
  })
})
