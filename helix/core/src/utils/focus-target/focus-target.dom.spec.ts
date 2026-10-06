import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { focusTarget } from './focus-target.js'

beforeAll(() => {
  registerDom()
})

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

  test('follows a component nested inside one that delegates focus down to its control', () => {
    const outer = document.createElement('div')
    const outerRoot = outer.attachShadow({ delegatesFocus: true, mode: 'open' })
    Object.defineProperty(outerRoot, 'delegatesFocus', { value: true })
    const inner = document.createElement('span')
    inner.tabIndex = 0
    outerRoot.append(inner)
    const innerRoot = inner.attachShadow({ delegatesFocus: true, mode: 'open' })
    Object.defineProperty(innerRoot, 'delegatesFocus', { value: true })
    innerRoot.innerHTML = '<a href="#x">Inside</a>'
    expect(focusTarget(outer)).toBe(innerRoot.querySelector('a') as Element)
  })

  test('is the host where a delegating root holds no control', () => {
    const host = document.createElement('div')
    const root = host.attachShadow({ delegatesFocus: true, mode: 'open' })
    Object.defineProperty(root, 'delegatesFocus', { value: true })
    root.innerHTML = '<span>Nothing to focus</span>'
    expect(focusTarget(host)).toBe(host)
  })
})
