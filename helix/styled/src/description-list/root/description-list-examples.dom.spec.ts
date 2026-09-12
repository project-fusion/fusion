import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }
import stacked from '../.examples/stacked.html' with { type: 'text' }
import totals from '../.examples/totals.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../tag/index.js')
  await import('../../format-date/index.js')
})

/* Browser only: happy-dom lays nothing out. */
const run = hasLayout() ? test : (): void => {}

/** Every item's label and value boxes, in order. */
const boxes = (): { label: DOMRect; value: DOMRect }[] =>
  [...document.querySelectorAll('helix-description-list-item')].map((item) => ({
    label: (part(item as HTMLElement, 'label') as HTMLElement).getBoundingClientRect(),
    value: (part(item as HTMLElement, 'value') as HTMLElement).getBoundingClientRect(),
  }))

describe('the preview example', () => {
  run('beside: every label starts on one line, and every value on the next one over', async () => {
    await example(preview)
    await idle()
    const pairs = boxes()
    const values = new Set(pairs.map(({ value }) => Math.round(value.left)))
    expect(new Set(pairs.map(({ label }) => Math.round(label.left))).size).toBe(1)
    expect(values.size).toBe(1)
    for (const { label, value } of pairs) {
      expect(value.left).toBeGreaterThan(label.right)
    }
  })

  run('and over, once the list is too narrow for beside to be read', async () => {
    await example(preview)
    const host = document.querySelector('helix-description-list') as HTMLElement
    host.style.inlineSize = '16rem'
    await idle()
    for (const { label, value } of boxes()) {
      expect(value.top).toBeGreaterThanOrEqual(label.bottom)
    }
  })

  run('a value with no space in it wraps inside its column rather than past it', async () => {
    await example(preview)
    await idle()
    const host = document.querySelector('helix-description-list') as HTMLElement
    const commit = boxes().at(-1)
    expect(commit?.value.right).toBeLessThanOrEqual(host.getBoundingClientRect().right + 0.5)
  })
})

describe('the stacked example', () => {
  run('each label sits over its own value', async () => {
    await example(stacked)
    await idle()
    for (const { label, value } of boxes()) {
      expect(value.top).toBeGreaterThanOrEqual(label.bottom)
      expect(Math.round(value.left)).toBe(Math.round(label.left))
    }
  })
})

/**
 * Where a value's text ends, rather than its box.
 *
 * The box is the wrong thing to measure: without `justify` the value stretches to
 * the end of its column, so every box ends on the list's edge whether the text
 * does or not, and an assertion on boxes passes either way.
 */
const ink = (item: Element): DOMRect => {
  const range = document.createRange()
  const nodes = [...item.childNodes].filter(
    (node) => !(node instanceof Element && node.slot === 'label'),
  )
  range.setStartBefore(nodes[0] as Node)
  range.setEndAfter(nodes.at(-1) as Node)
  return range.getBoundingClientRect()
}

const items = (): Element[] => [...document.querySelectorAll('helix-description-list-item')]

describe('the totals example', () => {
  run('is as wide as its widest pair, not the row it sits in', async () => {
    await example(totals)
    await idle()
    const host = document.querySelector('helix-description-list') as HTMLElement
    const room = (host.parentElement as HTMLElement).getBoundingClientRect().width
    expect(host.getBoundingClientRect().width).toBeLessThan(room / 2)
  })

  run('every figure ends on the list’s end edge, every label starts on its start', async () => {
    await example(totals)
    await idle()
    const host = document.querySelector('helix-description-list') as HTMLElement
    const edge = Math.round(host.getBoundingClientRect().right)
    expect(new Set(boxes().map(({ label }) => Math.round(label.left))).size).toBe(1)
    expect(new Set(items().map((item) => Math.round(ink(item).right)))).toEqual(new Set([edge]))
  })

  run('in figures of one width, so the digits line up', async () => {
    await example(totals)
    await idle()
    const [first] = items()
    const value = part(first as HTMLElement, 'value') as HTMLElement
    expect(getComputedStyle(value).fontVariantNumeric).toBe('tabular-nums')
  })
})

describe('the stacked example, as a control', () => {
  run('without `justify`, text of different lengths ends in different places', async () => {
    await example(stacked)
    await idle()
    expect(new Set(items().map((item) => Math.round(ink(item).right))).size).toBeGreaterThan(1)
  })
})
