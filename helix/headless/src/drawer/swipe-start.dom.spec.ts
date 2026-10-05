import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { startsSwipe } from './swipe-start.js'

beforeAll(() => {
  registerDom()
})

/* A scroller whose sizes are said, happy-dom having no layout to measure. */
const scroller = (scrolls: boolean): HTMLElement => {
  const box = document.createElement('div')
  box.innerHTML = '<p>Text</p><input>'
  Object.defineProperty(box, 'scrollHeight', { value: scrolls ? 600 : 200 })
  Object.defineProperty(box, 'clientHeight', { value: 200 })
  return box
}

describe('a press that may swipe a drawer away', () => {
  test('is a touch or a pen on text, and never a mouse', () => {
    const box = scroller(false)
    const text = box.querySelector('p') as Element
    expect(startsSwipe(text, 'touch', 'y', box)).toBe(true)
    expect(startsSwipe(text, 'pen', 'y', box)).toBe(true)
    expect(startsSwipe(text, 'mouse', 'y', box)).toBe(false)
  })

  test('is never on a field', () => {
    const box = scroller(false)
    expect(startsSwipe(box.querySelector('input') as Element, 'touch', 'y', box)).toBe(false)
  })

  test('is not inside a scroller that scrolls along the swipe', () => {
    const box = scroller(true)
    const text = box.querySelector('p') as Element
    expect(startsSwipe(text, 'touch', 'y', box)).toBe(false)
    expect(startsSwipe(text, 'touch', 'x', box)).toBe(true)
  })

  test('is anywhere outside the scroller', () => {
    const outside = document.createElement('h2')
    expect(startsSwipe(outside, 'touch', 'y', scroller(true))).toBe(true)
  })
})
