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
})
