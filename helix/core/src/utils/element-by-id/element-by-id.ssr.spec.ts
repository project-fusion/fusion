import { describe, expect, test } from 'bun:test'
import { getWindow } from '@lit-labs/ssr/lib/dom-shim.js'
import { elementById, searchableById } from './element-by-id.js'

/**
 * The half of the guard a DOM cannot show, and the one that decides it.
 *
 * Lit SSR's shim gives `Node` a `getRootNode` and gives neither its `Document`
 * nor its `ShadowRoot` a `getElementById`, so on a server the lookup is not a
 * miss, it is a missing method. Unguarded, every component that resolves `for`
 * takes the whole render down with a `TypeError` the first time a server draws
 * it. That is what the `?.` at twelve call sites was for, and it is why the
 * fallback behind `orDocument` is guarded too: the shim's `document` is the same
 * object with the same nothing on it.
 *
 * **`getWindow` rather than the render pass**, for two reasons. It is the
 * context `@lit-labs/ssr` builds every render on, so this measures the shim
 * components meet rather than a stand-in; and taking the classes off it installs
 * no globals, so this file shares a process with the DOM specs where a real
 * render could not. A component's markup would report the fact only by not
 * throwing, which is not an assertion anybody can read.
 */
const shim = getWindow({}) as unknown as { HTMLElement: typeof HTMLElement }
const served = (): Node => new shim.HTMLElement() as unknown as Node

describe('the server shim', () => {
  test('returns a root carrying no lookup at all, which is not a miss', () => {
    const root = served().getRootNode() as Partial<Document>
    expect(root.constructor.name).toBe('Document')
    expect(typeof root.getElementById).toBe('undefined')
  })

  test('answers null there instead of throwing', () => {
    expect(elementById(served(), 'anything')).toBeNull()
  })

  test('answers null there with `orDocument` too, the page being no more real', () => {
    expect(elementById(served(), 'anything', { orDocument: true })).toBeNull()
  })

  test('reports the tree as unsearchable, which is what tells unknown from empty', () => {
    expect(searchableById(served())).toBe(false)
  })
})
