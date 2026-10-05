import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { controlsIn, FocusScopeController } from './focus-scope-controller.js'

beforeAll(() => {
  registerDom()
})

const made: HTMLElement[] = []
afterEach(() => {
  for (const one of made.splice(0)) {
    one.remove()
  }
})

/* A host holding an opener and a surface with three buttons, driven by hand. */
const setup = (options: { contain?: boolean; start?: 'first' | 'surface' } = {}) => {
  const host = document.createElement('div') as unknown as HTMLElement & ReactiveControllerHost
  host.innerHTML = `<button id="opener">Open</button>
    <div id="surface" tabindex="-1"><button id="a">A</button><button id="b">B</button></div>`
  document.body.append(host)
  made.push(host)
  let controller: ReactiveController | undefined
  ;(host as unknown as { addController: (one: ReactiveController) => void }).addController = (
    one,
  ) => {
    controller = one
  }
  const surface = host.querySelector('#surface') as HTMLElement
  const scope = new FocusScopeController(host, {
    contain: () => options.contain ?? false,
    contents: () => [...surface.children],
    ...(options.start ? { start: options.start } : {}),
    surface: () => surface,
  })
  controller?.hostConnected?.()
  const opener = host.querySelector('#opener') as HTMLElement
  const tab = (shiftKey = false): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Tab',
      shiftKey,
    })
    ;(document.activeElement ?? host).dispatchEvent(event)
    return event
  }
  return { host, opener, scope, surface, tab }
}

describe('a focus scope', () => {
  test('moves focus to the first control on the way in, and back on the way out', () => {
    const { opener, scope } = setup()
    opener.focus()
    scope.enter()
    expect(document.activeElement?.id).toBe('a')
    expect(scope.leave()).toBe(true)
    expect(document.activeElement).toBe(opener)
  })

  test('can start on the surface itself', () => {
    const { opener, scope, surface } = setup({ start: 'surface' })
    opener.focus()
    scope.enter()
    expect(document.activeElement).toBe(surface)
  })

  test('gives nothing back once focus has gone somewhere else', () => {
    const { opener, scope } = setup()
    opener.focus()
    scope.enter()
    const elsewhere = document.createElement('button')
    document.body.append(elsewhere)
    made.push(elsewhere)
    elsewhere.focus()
    expect(scope.leave()).toBe(false)
    expect(document.activeElement).toBe(elsewhere)
  })

  test('keeps Tab inside while containing, wrapping at both ends', () => {
    const { host, scope, tab } = setup({ contain: true })
    scope.enter()
    ;(host.querySelector('#b') as HTMLElement).focus()
    expect(tab().defaultPrevented).toBe(true)
    expect(document.activeElement?.id).toBe('a')
    expect(tab(true).defaultPrevented).toBe(true)
    expect(document.activeElement?.id).toBe('b')
  })

  test('leaves Tab alone when not containing', () => {
    const { host, scope, tab } = setup()
    scope.enter()
    ;(host.querySelector('#b') as HTMLElement).focus()
    expect(tab().defaultPrevented).toBe(false)
  })
})

describe('the controls among some elements', () => {
  test('are the elements themselves and what is inside them, in order', () => {
    const box = document.createElement('div')
    box.innerHTML = '<button id="one">One</button><p>Text <a id="two" href="#">link</a></p>'
    document.body.append(box)
    made.push(box)
    expect(controlsIn([...box.children]).map((one) => one.id)).toEqual(['one', 'two'])
  })
})
