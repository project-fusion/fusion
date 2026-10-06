import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { ChildrenController } from './children-controller.js'

beforeAll(() => {
  registerDom()
})

/** A plain element standing in for a Lit host: it keeps its controllers and counts updates asked for. */
const host = () => {
  const element = document.createElement('div') as HTMLDivElement &
    ReactiveControllerHost & { controllers: ReactiveController[]; updates: number }
  element.controllers = []
  element.updates = 0
  element.addController = (controller) => element.controllers.push(controller)
  element.requestUpdate = () => {
    element.updates += 1
  }
  element.removeController = () => {}
  Object.defineProperty(element, 'updateComplete', { value: Promise.resolve(true) })
  return element
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('a host watching its children', () => {
  test('a child appended or removed after connection asks for an update', async () => {
    const element = host()
    const children = new ChildrenController(element)
    children.hostConnected()
    element.append(document.createElement('p'))
    await settle()
    expect(element.updates).toBe(1)
    element.firstElementChild?.remove()
    await settle()
    expect(element.updates).toBe(2)
  })

  test('a change inside a child is no arrival', async () => {
    const element = host()
    const child = document.createElement('p')
    element.append(child)
    new ChildrenController(element).hostConnected()
    child.append('streamed text')
    await settle()
    expect(element.updates).toBe(0)
  })

  test('nothing is heard while disconnected, and watching resumes after a move', async () => {
    const element = host()
    const children = new ChildrenController(element)
    children.hostConnected()
    children.hostDisconnected()
    element.append(document.createElement('p'))
    await settle()
    expect(element.updates).toBe(0)
    children.hostConnected()
    element.append(document.createElement('p'))
    await settle()
    expect(element.updates).toBe(1)
  })

  test('a callback of its own is called in place of an update', async () => {
    const element = host()
    let called = 0
    new ChildrenController(element, () => {
      called += 1
    }).hostConnected()
    element.append(document.createElement('p'))
    await settle()
    expect(called).toBe(1)
    expect(element.updates).toBe(0)
  })
})
