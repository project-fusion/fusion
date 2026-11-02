import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { listAt, onScrim, startsSwipe } from './swipe-start.js'

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
    const text = scroller(false).querySelector('p') as Element
    expect(startsSwipe(text, 'touch')).toBe(true)
    expect(startsSwipe(text, 'pen')).toBe(true)
    expect(startsSwipe(text, 'mouse')).toBe(false)
  })

  test('is never on a field', () => {
    expect(startsSwipe(scroller(false).querySelector('input') as Element, 'touch')).toBe(false)
  })
})

describe('a press on the scrim', () => {
  /* A panel with a box, happy-dom having no layout to measure. */
  const panel = (): HTMLElement => {
    const dialog = document.createElement('dialog')
    dialog.innerHTML = '<p>Filters</p>'
    dialog.getBoundingClientRect = () => new DOMRect(200, 0, 320, 800)
    return dialog
  }

  test('is a press on the panel itself, outside its box, where its backdrop is drawn', () => {
    const dialog = panel()
    expect(onScrim(dialog, dialog, { clientX: 40, clientY: 300 })).toBe(true)
    expect(onScrim(dialog, dialog, { clientX: 300, clientY: 300 })).toBe(false)
  })

  test('is never a press on what the panel holds', () => {
    const dialog = panel()
    const words = dialog.querySelector('p') as Element
    expect(onScrim(words, dialog, { clientX: 40, clientY: 300 })).toBe(false)
    expect(onScrim(dialog, null, { clientX: 40, clientY: 300 })).toBe(false)
  })
})

describe('the list a press lands in', () => {
  test('is the scroller on its path that scrolls along the swipe', () => {
    const box = scroller(true)
    const text = box.querySelector('p') as Element
    expect(listAt([text, box], 'y', box)).toBe(box)
    expect(listAt([text, box], 'x', box)).toBeUndefined()
  })

  test('is none outside the scroller, or where it does not scroll', () => {
    const outside = document.createElement('h2')
    expect(listAt([outside], 'y', scroller(true))).toBeUndefined()
    const still = scroller(false)
    expect(listAt([still], 'y', still)).toBeUndefined()
  })
})
