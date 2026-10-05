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

  test('stop at a custom element that has not upgraded, which may draw a control', () => {
    const slot = slotted('<helix-headless-input></helix-headless-input><p>After.</p>')
    expect(wordsIn(slot)).toEqual([])
  })

  test('go on through a custom element that has upgraded and draws no control', () => {
    if (!customElements.get('x-words')) {
      class Words extends HTMLElement {
        constructor() {
          super()
          this.attachShadow({ mode: 'open' }).innerHTML = '<slot></slot>'
        }
      }
      customElements.define('x-words', Words)
    }
    const slot = slotted('<x-words>One.</x-words><p>Two.</p>')
    expect(text(wordsIn(slot))).toEqual(['One.', 'Two.'])
  })

  test('stop at a custom element that takes focus', () => {
    if (!customElements.get('x-field')) {
      class Field extends HTMLElement {
        constructor() {
          super()
          this.attachShadow({ delegatesFocus: true, mode: 'open' }).innerHTML = '<input>'
        }
      }
      customElements.define('x-field', Field)
    }
    const slot = slotted('<p>One.</p><x-field></x-field><p>After.</p>')
    expect(text(wordsIn(slot))).toEqual(['One.'])
  })

  test('leave out an element with no words in it', () => {
    const slot = slotted('<div>   </div><p>One.</p>')
    expect(text(wordsIn(slot))).toEqual(['One.'])
  })

  test('are nothing without a slot', () => {
    expect(wordsIn(null)).toEqual([])
  })
})
