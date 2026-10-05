import { describe, expect, test } from 'bun:test'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { DelayController } from './delay-controller.js'

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

const after = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms))

describe('a wait an element starts', () => {
  test('runs out after its time, and the host updates', async () => {
    const element = host()
    const wait = new DelayController(element)
    let ran = 0
    wait.start(10, () => ran++)
    expect(wait.pending).toBe(true)
    expect(wait.elapsed).toBe(false)
    await after(30)
    expect(wait.elapsed).toBe(true)
    expect(wait.pending).toBe(false)
    expect(ran).toBe(1)
    expect(element.asked).toBe(1)
  })

  test('starts over from not elapsed, and no time starts no wait', async () => {
    const wait = new DelayController(host())
    wait.start(5)
    await after(20)
    expect(wait.elapsed).toBe(true)
    wait.start(undefined)
    expect(wait.elapsed).toBe(false)
    expect(wait.pending).toBe(false)
    await after(20)
    expect(wait.elapsed).toBe(false)
  })

  test('a restart replaces the wait running', async () => {
    const wait = new DelayController(host())
    let first = 0
    wait.start(10, () => first++)
    wait.start(40)
    await after(25)
    expect(first).toBe(0)
    expect(wait.elapsed).toBe(false)
  })

  test('canceled, it never runs out', async () => {
    const wait = new DelayController(host())
    let ran = 0
    wait.start(10, () => ran++)
    wait.cancel()
    await after(30)
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

  test('stops when the host leaves the page, remembering that it ran out', async () => {
    const element = host()
    const wait = new DelayController(element)
    wait.start(5)
    await after(20)
    let ran = 0
    wait.start(10, () => ran++)
    element.disconnect()
    await after(30)
    expect(ran).toBe(0)
    expect(wait.pending).toBe(false)
    wait.start(1)
    await after(15)
    element.disconnect()
    expect(wait.elapsed).toBe(true)
  })

  test('a wait the host does not render asks for no update', async () => {
    const element = host()
    const wait = new DelayController(element, { renders: false })
    wait.start(5)
    await after(20)
    expect(wait.elapsed).toBe(true)
    expect(element.asked).toBe(0)
  })
})
