import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { linkDescription, reflectElements, unlinkDescription } from './reflect-elements.js'

beforeAll(() => {
  registerDom()
})

type Reflecting = HTMLElement & {
  ariaDescribedByElements: Element[] | null
  ariaLabelledByElements: Element[] | null
}

/* happy-dom has no element reflection, so the accessors are stood in, as an
   engine with reflection provides them. */
const reflecting = <T extends HTMLElement>(element: T): T & Reflecting => {
  Object.defineProperty(element, 'ariaDescribedByElements', { value: null, writable: true })
  Object.defineProperty(element, 'ariaLabelledByElements', { value: null, writable: true })
  return element as T & Reflecting
}

describe('reflecting the elements that name a panel', () => {
  test("writes them, and the property is then the caller's", () => {
    const panel = reflecting(document.createElement('div'))
    const heading = document.createElement('h2')
    expect(reflectElements(panel, 'ariaLabelledByElements', [heading], false)).toBe(true)
    expect(panel.ariaLabelledByElements).toEqual([heading])
  })

  test('clears only what the caller wrote', () => {
    const panel = reflecting(document.createElement('div'))
    const theirs = document.createElement('span')
    panel.ariaLabelledByElements = [theirs]
    expect(reflectElements(panel, 'ariaLabelledByElements', [], false)).toBe(false)
    expect(panel.ariaLabelledByElements).toEqual([theirs])
    expect(reflectElements(panel, 'ariaLabelledByElements', [], true)).toBe(false)
    expect(panel.ariaLabelledByElements).toBeNull()
  })

  test('writes nothing where the engine has no reflection, and keeps what was owned', () => {
    const plain = document.createElement('div')
    const words = [document.createElement('p')]
    expect(reflectElements(plain, 'ariaDescribedByElements', words, true)).toBe(true)
    expect(reflectElements(plain, 'ariaDescribedByElements', words, false)).toBe(false)
    expect('ariaDescribedByElements' in plain).toBe(false)
    expect(reflectElements(null, 'ariaDescribedByElements', words, false)).toBe(false)
  })
})

describe('linking a description', () => {
  const bubble = (): HTMLElement => document.createElement('div')

  test('inside a shadow root it is always written, and keeps what was there', () => {
    const host = document.createElement('div')
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = '<span id="hint">Hint</span><input>'
    const input = reflecting(root.querySelector('input') as HTMLInputElement)
    const hint = root.querySelector('#hint') as Element
    input.ariaDescribedByElements = [hint]
    const tip = bubble()
    expect(linkDescription(input, tip, false)).toBe(true)
    expect(input.ariaDescribedByElements).toEqual([hint, tip])
  })

  test('in the light DOM only once a reader has acted, and never over the consumer’s own', () => {
    const tip = bubble()
    const plain = reflecting(document.createElement('button'))
    document.body.append(plain)
    expect(linkDescription(plain, tip, false)).toBe(false)
    expect(linkDescription(plain, tip, true)).toBe(true)
    const owned = reflecting(document.createElement('button'))
    owned.setAttribute('aria-describedby', 'other')
    document.body.append(owned)
    expect(linkDescription(owned, tip, true)).toBe(false)
  })

  test('nothing where the engine has no reflection', () => {
    expect(linkDescription(document.createElement('button'), bubble(), true)).toBe(false)
  })

  test('unlinking takes back only this one', () => {
    const tip = bubble()
    const other = bubble()
    const button = reflecting(document.createElement('button'))
    button.ariaDescribedByElements = [other, tip]
    unlinkDescription(button, tip)
    expect(button.ariaDescribedByElements).toEqual([other])
    unlinkDescription(button, other)
    expect(button.ariaDescribedByElements).toBeNull()
  })
})
