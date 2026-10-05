import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { focusTarget, linkDescription, unlinkDescription } from './describe.js'

beforeAll(() => {
  registerDom()
})

type Reflecting = HTMLElement & { ariaDescribedByElements: Element[] | null }

/* happy-dom has no element reflection, so the accessor is stood in, as an
   engine with reflection provides it. */
const reflecting = <T extends HTMLElement>(element: T): T & Reflecting => {
  Object.defineProperty(element, 'ariaDescribedByElements', { value: null, writable: true })
  return element as T & Reflecting
}

describe('the element a trigger’s focus lands on', () => {
  test('is the trigger, where it keeps its own focus', () => {
    const button = document.createElement('button')
    expect(focusTarget(button)).toBe(button)
  })

  test('is the control inside a component that delegates focus', () => {
    const host = document.createElement('div')
    const root = host.attachShadow({ delegatesFocus: true, mode: 'open' })
    /* happy-dom answers false however it was asked, so the answer is stood in. */
    Object.defineProperty(root, 'delegatesFocus', { value: true })
    root.innerHTML = '<span>Label</span><button>Inside</button>'
    expect(focusTarget(host)).toBe(root.querySelector('button') as Element)
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
