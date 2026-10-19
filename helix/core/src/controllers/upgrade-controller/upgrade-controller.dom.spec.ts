import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { UpgradeController } from './upgrade-controller.js'

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
  document.body.append(element)
  return element
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

/* Each test defines names of its own, since a name is defined for the life of the page. */
let count = 0
const name = () => {
  count += 1
  return `upgrade-probe-${count}`
}
const define = (tag: string) => customElements.define(tag, class extends HTMLElement {})

describe('a host waiting on its children to upgrade', () => {
  test('a child there at connection asks for an update once it is defined', async () => {
    const element = host()
    const tag = name()
    element.append(document.createElement(tag))
    new UpgradeController(element).hostConnected()
    await settle()
    expect(element.updates).toBe(0)
    define(tag)
    await settle()
    expect(element.updates).toBe(1)
  })

  test('a child added after connection asks for an update once it is defined', async () => {
    const element = host()
    const tag = name()
    new UpgradeController(element).hostConnected()
    element.append(document.createElement(tag))
    await settle()
    expect(element.updates).toBe(0)
    define(tag)
    await settle()
    expect(element.updates).toBe(1)
  })

  test('the callback has the child upgraded by the time it runs', async () => {
    const element = host()
    const tag = name()
    const child = document.createElement(tag)
    element.append(child)
    let upgraded = false
    new UpgradeController(element, () => {
      upgraded = child instanceof (customElements.get(tag) as CustomElementConstructor)
    }).hostConnected()
    define(tag)
    await settle()
    expect(upgraded).toBe(true)
  })

  test('many children of one name are waited on once', async () => {
    const element = host()
    const tag = name()
    const watch = new UpgradeController(element)
    watch.hostConnected()
    element.append(document.createElement(tag), document.createElement(tag))
    await settle()
    element.append(document.createElement(tag))
    await settle()
    define(tag)
    await settle()
    expect(element.updates).toBe(1)
  })

  test('a defined child, a native one and a nested one ask for nothing', async () => {
    const element = host()
    const defined = name()
    const nested = name()
    define(defined)
    new UpgradeController(element).hostConnected()
    const wrapper = document.createElement('div')
    wrapper.append(document.createElement(nested))
    element.append(document.createElement(defined), document.createElement('p'), wrapper)
    await settle()
    define(nested)
    await settle()
    expect(element.updates).toBe(0)
  })

  test('with the subtree, a child inside a wrapper is waited on too', async () => {
    const element = host()
    const there = name()
    const added = name()
    const first = document.createElement('div')
    first.append(document.createElement(there))
    element.append(first)
    new UpgradeController(element, undefined, { subtree: true }).hostConnected()
    const second = document.createElement('div')
    second.append(document.createElement(added))
    element.append(second)
    await settle()
    define(there)
    define(added)
    await settle()
    expect(element.updates).toBe(2)
  })

  test('nothing added while disconnected is heard until the host connects again', async () => {
    const element = host()
    const tag = name()
    const watch = new UpgradeController(element)
    watch.hostConnected()
    watch.hostDisconnected()
    element.append(document.createElement(tag))
    await settle()
    watch.hostConnected()
    define(tag)
    await settle()
    expect(element.updates).toBe(1)
  })
})
