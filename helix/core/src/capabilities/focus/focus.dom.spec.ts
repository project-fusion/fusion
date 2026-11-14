import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { webFocus } from './web.js'

beforeAll(() => {
  registerDom()
})

/** What each spec put in the document, taken out after it. */
const added: Element[] = []

afterEach(() => {
  for (const node of added.splice(0)) {
    node.remove()
  }
})

const place = <E extends Element>(node: E): E => {
  document.body.append(node)
  added.push(node)
  return node
}

describe('webFocus', () => {
  test('moves focus to an element and reads it back', () => {
    const save = place(document.createElement('button'))
    webFocus.focus(save, false)
    expect(document.activeElement).toBe(save)
    expect(webFocus.focused()).toBe(save)
  })

  test('passes preventScroll to the element', () => {
    const save = place(document.createElement('button'))
    const asked: (FocusOptions | undefined)[] = []
    const own = save.focus.bind(save)
    save.focus = (options) => {
      asked.push(options)
      own(options)
    }
    webFocus.focus(save, true)
    webFocus.focus(save, false)
    expect(asked).toEqual([{ preventScroll: true }, { preventScroll: false }])
  })

  test('reads the element that has focus inside a shadow root', () => {
    const host = place(document.createElement('div'))
    const inner = document.createElement('button')
    host.attachShadow({ mode: 'open' }).append(inner)
    webFocus.focus(inner, false)
    expect(document.activeElement).toBe(host)
    expect(webFocus.focused()).toBe(inner)
  })

  test('reads null where focus is on the body', () => {
    const save = place(document.createElement('button'))
    webFocus.focus(save, false)
    save.blur()
    expect(document.activeElement).toBe(document.body)
    expect(webFocus.focused()).toBeNull()
  })
})
