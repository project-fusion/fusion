import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

let centerInView: typeof import('./center-in-view.js').centerInView

beforeAll(async () => {
  registerDom()
  ;({ centerInView } = await import('./center-in-view.js'))
})

/** An element whose box is where `top` says, moved up as `box` scrolls. */
const placed = (top: () => number, height: number): HTMLElement => {
  const element = document.createElement('div')
  element.getBoundingClientRect = () => ({ height, top: top() }) as DOMRect
  return element
}

describe('centering an item in the box that scrolls it', () => {
  test('moves the box by the distance between the two middles', () => {
    const box = placed(() => 0, 200)
    const item = placed(() => 500 - box.scrollTop, 20)
    centerInView(box, item)
    expect(box.scrollTop).toBe(410)
  })

  test('does nothing where either has no height', () => {
    const box = placed(() => 0, 0)
    centerInView(
      box,
      placed(() => 500, 20),
    )
    expect(box.scrollTop).toBe(0)
  })
})
