import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { readTiming, runOn } from './plain-host.js'

beforeAll(() => {
  registerDom()
})

afterEach(() => {
  document.body.replaceChildren()
})

/** A controller that writes down what its host told it. */
const recorder = (host: ReactiveControllerHost & HTMLElement) => {
  const heard: string[] = []
  const controller: ReactiveController & { heard: string[] } = {
    heard,
    hostConnected: () => heard.push('connected'),
    hostDisconnected: () => heard.push('disconnected'),
    hostUpdated: () => heard.push('updated'),
  }
  host.addController(controller)
  return controller
}

describe('running a controller over a plain element', () => {
  test('connects it at once, and takes everything lent back once released', () => {
    const list = document.createElement('ul')
    document.body.append(list)
    const running = runOn(list, recorder)
    expect(running.controller.heard).toEqual(['connected'])
    expect(Object.keys(list)).not.toContain('addController')
    running.updated()
    running.release()
    expect(running.controller.heard).toEqual(['connected', 'updated', 'disconnected'])
    expect('addController' in list).toBe(false)
    expect('requestUpdate' in list).toBe(false)
  })

  test('releasing one of two leaves the other running and the element lent', () => {
    const list = document.createElement('ul')
    document.body.append(list)
    const first = runOn(list, recorder)
    const second = runOn(list, recorder)
    first.release()
    expect(first.controller.heard).toEqual(['connected', 'disconnected'])
    expect(second.controller.heard).toEqual(['connected'])
    expect('addController' in list).toBe(true)
    first.release()
    expect(second.controller.heard).toEqual(['connected'])
    second.release()
    expect('addController' in list).toBe(false)
  })

  test('draws where the controller asks for an update', () => {
    const list = document.createElement('ul')
    document.body.append(list)
    let draws = 0
    const running = runOn(list, recorder, () => {
      draws += 1
    })
    ;(list as unknown as ReactiveControllerHost).requestUpdate()
    expect(draws).toBe(1)
    running.release()
  })

  test('uses an element that is a host already as it is', () => {
    const added: ReactiveController[] = []
    const removed: ReactiveController[] = []
    const element = Object.assign(document.createElement('div'), {
      addController: (one: ReactiveController) => {
        added.push(one)
      },
      removeController: (one: ReactiveController) => {
        removed.push(one)
      },
    })
    const running = runOn(element, recorder)
    expect(added).toEqual([running.controller])
    running.release()
    expect(removed).toEqual([running.controller])
    expect(running.controller.heard).toEqual(['disconnected'])
    expect(typeof element.addController).toBe('function')
  })
})

describe('reading a time for a function', () => {
  test('takes milliseconds, a written time, a token, or the token standing in', () => {
    const element = document.createElement('div')
    element.style.setProperty('--helix-duration-normal', '240ms')
    document.body.append(element)
    expect(readTiming(element, 0, '--helix-duration-normal', '200ms')).toBe('0ms')
    expect(readTiming(element, '1s', '--helix-duration-normal', '200ms')).toBe('1s')
    expect(readTiming(element, undefined, '--helix-duration-normal', '200ms')).toBe('240ms')
    expect(readTiming(element, undefined, '--helix-duration-slow', '320ms')).toBe('320ms')
  })
})
