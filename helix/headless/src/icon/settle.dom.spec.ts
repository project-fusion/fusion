import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { afterPageSettles } from './settle.js'

beforeAll(() => {
  registerDom()
})

/* `readyState` is stubbed on the document for each case, and whatever the
   document had, its own or its prototype's, is put back after. */
let own: PropertyDescriptor | undefined
let stubbed = false

const stub = (value: string): void => {
  if (!stubbed) {
    own = Object.getOwnPropertyDescriptor(document, 'readyState')
    stubbed = true
  }
  Object.defineProperty(document, 'readyState', { configurable: true, value })
}

afterEach(() => {
  if (!stubbed) {
    return
  }
  delete (document as { readyState?: string }).readyState
  if (own) {
    Object.defineProperty(document, 'readyState', own)
  }
  stubbed = false
  own = undefined
})

const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => done()))

describe('after the page settles', () => {
  test('a loaded page calls back a frame later, and not before', async () => {
    stub('complete')
    let called = 0
    afterPageSettles(() => {
      called += 1
    })
    expect(called).toBe(0)
    await frame()
    await frame()
    expect(called).toBe(1)
  })

  test('a loading page waits for `load`, then a frame', async () => {
    stub('loading')
    let called = 0
    afterPageSettles(() => {
      called += 1
    })
    await frame()
    await frame()
    expect(called).toBe(0)
    window.dispatchEvent(new Event('load'))
    await frame()
    await frame()
    expect(called).toBe(1)
  })
})
