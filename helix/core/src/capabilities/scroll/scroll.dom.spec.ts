import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { scrollHolders } from '../../utils/scroll-lock/scroll-lock.js'
import { webScroll } from './web.js'

beforeAll(() => {
  registerDom()
})

/** What each spec put in the document, taken out after it. */
const added: Element[] = []

afterEach(() => {
  for (const node of added.splice(0)) {
    node.remove()
  }
})

const place = (style = ''): HTMLElement => {
  const node = document.createElement('div')
  node.setAttribute('style', style)
  document.body.append(node)
  added.push(node)
  return node
}

/** Records each `scrollBy` asked of `node`, and still scrolls it. */
const recorded = (node: HTMLElement): ScrollToOptions[] => {
  const asked: ScrollToOptions[] = []
  const own = node.scrollBy.bind(node)
  node.scrollBy = ((options: ScrollToOptions) => {
    asked.push(options)
    own(options)
  }) as typeof node.scrollBy
  return asked
}

interface Edges {
  readonly bottom: number
  readonly left: number
  readonly right: number
  readonly top: number
}

/**
 * Gives `node` the box `edges`. happy-dom answers `0 0 0 0` for every box, so
 * a spec places the boxes a page would lay out.
 */
const boxed = (node: HTMLElement, edges: Edges): void => {
  const { bottom, left, right, top } = edges
  const full = { ...edges, height: bottom - top, width: right - left, x: left, y: top }
  node.getBoundingClientRect = () => ({ ...full, toJSON: () => full })
}

describe('webScroll.by and webScroll.offset', () => {
  test('scrolls an element by both distances at once', () => {
    const list = place()
    const asked = recorded(list)
    webScroll.by(list, 8, 24)
    expect(asked).toEqual([{ behavior: 'instant', left: 8, top: 24 }])
    expect(webScroll.offset(list)).toEqual({ x: 8, y: 24 })
  })

  test('reads how far an element is scrolled along each axis', () => {
    const list = place()
    list.scrollLeft = 12
    list.scrollTop = 40
    expect(webScroll.offset(list)).toEqual({ x: 12, y: 40 })
  })
})

describe('webScroll.reveal', () => {
  /* happy-dom does not expand the `overflow` shorthand, so the scroller's
     overflow is written longhand. */
  test('scrolls the scroller that holds a node the least that shows it', () => {
    const list = place('overflow-y: auto')
    const row = document.createElement('div')
    list.append(row)
    boxed(list, { bottom: 100, left: 0, right: 200, top: 0 })
    boxed(row, { bottom: 150, left: 10, right: 50, top: 120 })
    const asked = recorded(list)
    webScroll.reveal(row)
    expect(asked).toEqual([{ behavior: 'instant', left: 0, top: 50 }])
  })
})

describe('webScroll.lock', () => {
  test('holds the page until every layer lets go, and records each layer as a holder', () => {
    const root = document.documentElement
    const dialog = place()
    const drawer = place()
    const stopDialog = webScroll.lock(dialog)
    const stopDrawer = webScroll.lock(drawer)
    expect(root.style.overflow).toBe('hidden')
    expect(scrollHolders()).toEqual([dialog, drawer])
    stopDialog()
    stopDialog()
    expect(root.style.overflow).toBe('hidden')
    expect(scrollHolders()).toEqual([drawer])
    stopDrawer()
    expect(root.style.overflow).toBe('')
    expect(scrollHolders()).toEqual([])
  })

  test('lets go of nothing with a stop kept from an earlier lock', () => {
    const dialog = place()
    const first = webScroll.lock(dialog)
    first()
    const second = webScroll.lock(dialog)
    first()
    expect(scrollHolders()).toEqual([dialog])
    second()
    expect(scrollHolders()).toEqual([])
  })
})

/** Gives `node` the lengths a page would lay it out at, which happy-dom leaves at 0. */
const sized = (node: HTMLElement, content: number, frame: number): void => {
  for (const [name, value] of [
    ['clientHeight', frame],
    ['clientWidth', frame],
    ['scrollHeight', content],
    ['scrollWidth', content],
  ] as const) {
    Object.defineProperty(node, name, { configurable: true, value })
  }
}

describe('webScroll.to and webScroll.observe', () => {
  test('scrolls to an offset, gliding where asked and at once otherwise', () => {
    const list = place()
    const asked: unknown[] = []
    list.scrollTo = ((options: ScrollToOptions) => {
      asked.push(options)
    }) as typeof list.scrollTo
    webScroll.to(list, 0, 120, true)
    webScroll.to(list, 30, 0, false)
    expect(asked).toEqual([
      { behavior: 'smooth', left: 0, top: 120 },
      { behavior: 'instant', left: 30, top: 0 },
    ])
  })

  test('tells where an element stands as it scrolls, and again settled as it rests', () => {
    const list = place()
    sized(list, 300, 100)
    const heard: unknown[] = []
    const stop = webScroll.observe(list, (scrolled) => heard.push(scrolled))
    list.scrollTop = 200
    list.dispatchEvent(new Event('scroll'))
    list.dispatchEvent(new Event('scrollend'))
    stop()
    list.dispatchEvent(new Event('scroll'))
    expect(heard).toEqual([
      {
        offset: { x: 0, y: 200 },
        settled: false,
        x: { end: false, start: true },
        y: { end: true, start: false },
      },
      {
        offset: { x: 0, y: 200 },
        settled: true,
        x: { end: false, start: true },
        y: { end: true, start: false },
      },
    ])
  })
})
