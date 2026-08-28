import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { scrollItemIntoView } from './scroll-item-into-view.js'

/**
 * Bringing an item into its own scroller, and moving nothing else.
 *
 * `Element.scrollIntoView` walks every scrollable ancestor and scrolls all of
 * them, so bringing the current item into a tree also scrolls the page the tree
 * sits on, and on a phone it takes the address bar with it. A reader who
 * pressed Down in a sidebar did not ask the document to move.
 *
 * **The boxes are supplied rather than laid out, and the alternative is not
 * available.** happy-dom answers `0 0 0 0` to every `getBoundingClientRect`, so
 * there is no arrangement of markup that produces an item past an edge. The
 * rectangles are the inputs to the arithmetic under test, and supplying an
 * input is how it is controlled: what is being asked here is which edge it
 * decided the item was past and how far it moved, given two boxes.
 *
 * **The overflow is written longhand for the same reason.** happy-dom does not
 * expand the `overflow` shorthand into `overflowX`/`overflowY`, so
 * `style="overflow:auto"` computes to the empty string and the util would find
 * no scroller at all. That is the test double's gap, not the component's.
 */
beforeAll(() => {
  registerDom()
})

interface Box {
  bottom: number
  left: number
  right: number
  top: number
}

const boxed = (node: HTMLElement, box: Box): HTMLElement => {
  node.getBoundingClientRect = (() => box) as unknown as typeof node.getBoundingClientRect
  return node
}

/** A scroller and an item in it, each with the box it is told to have. */
const scene = (
  overflow: string,
  view: Box,
  item: Box,
): { asked: Record<string, unknown>[]; item: HTMLElement; scroller: HTMLElement } => {
  document.body.innerHTML = `<div style="${overflow}"><span></span></div>`
  const scroller = document.body.firstElementChild as HTMLElement
  const asked: Record<string, unknown>[] = []
  scroller.scrollBy = ((options: Record<string, unknown>) => {
    asked.push(options)
  }) as never
  boxed(scroller, view)
  return { asked, item: boxed(scroller.firstElementChild as HTMLElement, item), scroller }
}

const VIEW: Box = { bottom: 100, left: 0, right: 200, top: 0 }

describe('an item already in view', () => {
  /* A scroll of zero still fires a `scroll` event and still cancels a smooth
     one already running, so the early return is behavior rather than an
     optimisation. It is also the difference from `block: 'nearest'`, which
     nudges on every keypress and makes a long list feel like it is fighting
     the reader. */
  test('is not scrolled to, at all', () => {
    const { asked, item } = scene('overflow-y:auto', VIEW, {
      bottom: 60,
      left: 10,
      right: 50,
      top: 20,
    })
    scrollItemIntoView(item)
    expect(asked).toEqual([])
  })
})

describe('an item past an edge', () => {
  test('below is scrolled down by exactly how far past it is', () => {
    const { asked, item } = scene('overflow-y:auto', VIEW, {
      bottom: 130,
      left: 0,
      right: 50,
      top: 110,
    })
    scrollItemIntoView(item)
    expect(asked).toEqual([{ behavior: 'instant', left: 0, top: 30 }])
  })

  test('above is scrolled up', () => {
    const { asked, item } = scene('overflow-y:auto', VIEW, {
      bottom: -5,
      left: 0,
      right: 50,
      top: -25,
    })
    scrollItemIntoView(item)
    expect(asked[0]?.top).toBe(-25)
  })

  /* Both axes, because the components that need this do not agree on one: a
     carousel scrolls sideways and a tree scrolls down, and a menu that has run
     out of room does both. */
  test('and sideways is the same question asked of the other axis', () => {
    const { asked, item } = scene('overflow-x:auto', VIEW, {
      bottom: 50,
      left: 210,
      right: 260,
      top: 0,
    })
    scrollItemIntoView(item)
    expect(asked[0]?.left).toBe(60)
  })

  test('leaving whatever room the caller asked for', () => {
    const { asked, item } = scene('overflow-y:auto', VIEW, {
      bottom: 130,
      left: 0,
      right: 50,
      top: 110,
    })
    scrollItemIntoView(item, { padding: 8 })
    expect(asked[0]?.top).toBe(38)
  })
})

describe('which box gets scrolled', () => {
  /* This was `item.offsetParent`, which is the nearest *positioned* ancestor
     and has nothing to do with overflow. The two coincide often enough to look
     right, and come apart exactly where it matters: anything `position:
     relative` in between was scrolled instead, which does not scroll, and
     nothing was reported. `Tree` passes no scroller, so it had this on every
     keypress. */
  test('is the nearest ancestor that scrolls, not the nearest positioned one', () => {
    document.body.innerHTML =
      '<div id="outer" style="overflow-y:auto"><div id="between" style="position:relative"><span id="item"></span></div></div>'
    const outer = document.getElementById('outer') as HTMLElement
    const between = document.getElementById('between') as HTMLElement
    const item = document.getElementById('item') as HTMLElement
    const asked: unknown[] = []
    outer.scrollBy = ((options: unknown) => asked.push(options)) as never
    between.scrollBy = (() => {
      throw new Error('the positioned element in between was scrolled')
    }) as never
    boxed(outer, VIEW)
    boxed(between, VIEW)
    boxed(item, { bottom: 130, left: 0, right: 50, top: 110 })
    scrollItemIntoView(item)
    expect(asked).toHaveLength(1)
  })

  /* The walk crosses shadow boundaries through the host, because the item is
     almost always in one and `parentElement` is null at the root. Without that
     step a component whose scroller is its own `[part]` finds nothing. */
  test('crossing a shadow boundary to get there', () => {
    document.body.innerHTML = '<div style="overflow-y:auto"><div id="host"></div></div>'
    const scroller = document.body.firstElementChild as HTMLElement
    const host = document.getElementById('host') as HTMLElement
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = '<span></span>'
    const item = root.firstElementChild as HTMLElement
    const asked: unknown[] = []
    scroller.scrollBy = ((options: unknown) => asked.push(options)) as never
    boxed(scroller, VIEW)
    boxed(item, { bottom: 130, left: 0, right: 50, top: 110 })
    scrollItemIntoView(item)
    expect(asked).toHaveLength(1)
  })

  /* Scrolling the page is the one thing this util exists not to do, so finding
     nothing inside the component and no-opping is the honest answer. */
  test('and nothing at all when there is no scroller short of the document', () => {
    document.body.innerHTML = '<div><span></span></div>'
    const item = document.body.firstElementChild?.firstElementChild as HTMLElement
    boxed(item, { bottom: 130, left: 0, right: 50, top: 110 })
    expect(() => {
      scrollItemIntoView(item)
    }).not.toThrow()
  })

  test('unless the caller named one, which skips the walk', () => {
    document.body.innerHTML = '<div><span></span></div>'
    const scroller = document.body.firstElementChild as HTMLElement
    const item = scroller.firstElementChild as HTMLElement
    const asked: unknown[] = []
    scroller.scrollBy = ((options: unknown) => asked.push(options)) as never
    boxed(scroller, VIEW)
    boxed(item, { bottom: 130, left: 0, right: 50, top: 110 })
    scrollItemIntoView(item, { scroller })
    expect(asked).toHaveLength(1)
  })
})

describe('animating the scroll', () => {
  test('is off unless asked for, because a list still moving when the next key arrives is a list fighting the reader', () => {
    const { asked, item } = scene('overflow-y:auto', VIEW, {
      bottom: 130,
      left: 0,
      right: 50,
      top: 110,
    })
    scrollItemIntoView(item)
    expect(asked[0]?.behavior).toBe('instant')
  })

  test('and is a request rather than an instruction', () => {
    const { asked, item } = scene('overflow-y:auto', VIEW, {
      bottom: 130,
      left: 0,
      right: 50,
      top: 110,
    })
    scrollItemIntoView(item, { smooth: true })
    expect(asked[0]?.behavior).toBe('smooth')
  })

  test('that a reader asking for less motion overrules', () => {
    const real = globalThis.matchMedia
    globalThis.matchMedia = ((query: string) => ({ matches: query.includes('reduce') })) as never
    try {
      const { asked, item } = scene('overflow-y:auto', VIEW, {
        bottom: 130,
        left: 0,
        right: 50,
        top: 110,
      })
      scrollItemIntoView(item, { smooth: true })
      expect(asked[0]?.behavior).toBe('instant')
    } finally {
      globalThis.matchMedia = real
    }
  })
})
