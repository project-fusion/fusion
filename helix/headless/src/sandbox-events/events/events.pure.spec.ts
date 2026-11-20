import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

type Module = typeof import('./index.js')

let events: Module
let helixEventNames: ReadonlySet<string>

/* Imported after registration, because the event classes capture whichever
   `Event` is global when the module is evaluated. Specs share one module cache,
   and this file can run before any DOM spec has registered happy-dom. */
beforeAll(async () => {
  registerDom()
  ;({ helixEventNames } = await import('@fusion.dev/helix-core'))
  events = await import('./index.js')
})

const seen: unknown[] = []

describe('the notifications a sandbox sends once a request is applied', () => {
  test('helix-edit, helix-split and helix-panel-resize carry the new value and cannot be canceled', () => {
    const sent = [
      new events.HelixEditEvent({ value: '<p>' }),
      new events.HelixSplitEvent({ value: '60' }),
      new events.HelixPanelResizeEvent({ value: '120' }),
    ]
    expect(sent.map((event) => event.type)).toEqual([
      'helix-edit',
      'helix-split',
      'helix-panel-resize',
    ])
    for (const event of sent) {
      expect(event.cancelable).toBe(false)
      expect(event.bubbles).toBe(true)
      expect(event.composed).toBe(true)
      expect(helixEventNames.has(event.type)).toBe(true)
    }
  })

  test('every event of the sandbox is typed on addEventListener for its element', () => {
    const element = document.createElement('helix-sandbox')
    element.addEventListener('helix-before-edit', (event) => {
      const value: string = event.detail.value
      seen.push(value)
    })
    element.addEventListener('helix-before-panel-resize', (event) => {
      const value: string = event.detail.value
      seen.push(value)
    })
    element.addEventListener('helix-before-split', (event) => {
      const value: string = event.detail.value
      seen.push(value)
    })
    element.addEventListener('helix-caret', (event) => {
      const line: number = event.detail.line
      seen.push(line)
    })
    element.addEventListener('helix-console', (event) => {
      const detail: Module['HelixConsoleEvent']['prototype']['detail'] = event.detail
      seen.push(detail)
    })
    element.addEventListener('helix-edit', (event) => {
      const value: string = event.detail.value
      seen.push(value)
    })
    element.addEventListener('helix-panel-resize', (event) => {
      const value: string = event.detail.value
      seen.push(value)
    })
    element.addEventListener('helix-split', (event) => {
      const value: string = event.detail.value
      seen.push(value)
    })
    expect(seen).toHaveLength(0)
  })
})
