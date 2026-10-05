import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { wordsIn } from './description.js'

beforeAll(() => {
  registerDom()
})

/* A slot with the given children assigned, the shape `wordsIn` reads. */
const slotted = (children: string): HTMLSlotElement => {
  const host = document.createElement('div')
  host.innerHTML = children
  document.body.append(host)
  host.attachShadow({ mode: 'open' }).innerHTML = '<slot></slot>'
  return host.shadowRoot?.querySelector('slot') as HTMLSlotElement
}

const text = (elements: Element[]): string[] => elements.map((one) => one.textContent ?? '')

describe('the words a dialog is described by', () => {
  test('are the leading elements that hold words, up to the first control', () => {
    const slot = slotted('<p>One.</p><p>Two.</p><form><input></form><p>After.</p>')
    expect(text(wordsIn(slot))).toEqual(['One.', 'Two.'])
  })

  test('stop at an element that holds a control', () => {
    const slot = slotted('<p>One.</p><div>Name <input></div><p>After.</p>')
    expect(text(wordsIn(slot))).toEqual(['One.'])
  })

  test('stop at a custom element, which may draw a control', () => {
    const slot = slotted('<helix-headless-input></helix-headless-input><p>After.</p>')
    expect(wordsIn(slot)).toEqual([])
  })

  test('leave out an element with no words in it', () => {
    const slot = slotted('<div>   </div><p>One.</p>')
    expect(text(wordsIn(slot))).toEqual(['One.'])
  })

  test('are nothing without a slot', () => {
    expect(wordsIn(null)).toEqual([])
  })
})
