import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
import divided from '../.examples/divided.html' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }
import several from '../.examples/several-values.html' with { type: 'text' }
import stacked from '../.examples/stacked.html' with { type: 'text' }
import totals from '../.examples/totals.html' with { type: 'text' }
import withActions from '../.examples/with-actions.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../tag/index.js')
  await import('../../format-date/index.js')
  await import('../../copy-button/index.js')
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

describe('the several-values example', () => {
  /* The second value is auto-placed under the label unless it is put in the
     values' column, which is the one thing the item's sheet has to say. */
  run('every value of a label sits in the values column, one under the next', async () => {
    await example(several)
    await idle()
    const values = [...document.querySelectorAll('helix-description-list-item dd')].map((dd) =>
      dd.getBoundingClientRect(),
    )
    const first = (
      part(
        document.querySelector('helix-description-list-item') as HTMLElement,
        'value',
      ) as HTMLElement
    ).getBoundingClientRect()
    expect(values).toHaveLength(2)
    for (const value of values) {
      expect(Math.round(value.left)).toBe(Math.round(first.left))
    }
    expect((values[1] as DOMRect).top).toBeGreaterThanOrEqual((values[0] as DOMRect).bottom)
  })
})

describe('the with actions example', () => {
  run(
    'draws each copy button after its value, on the value’s line, inside its description',
    async () => {
      await example(withActions)
      await idle()
      const item = document.querySelector('helix-description-list-item') as HTMLElement
      const value = part(item, 'value') as HTMLElement
      const button = item.querySelector('[slot="actions"]') as HTMLElement
      const slot = button.assignedSlot as HTMLSlotElement
      expect(value.contains(slot)).toBe(true)
      const text = value.getBoundingClientRect()
      const control = button.getBoundingClientRect()
      expect(control.left).toBeGreaterThan(text.left)
      expect(control.top).toBeLessThan(text.bottom)
    },
  )
})

describe('the divided example', () => {
  run('draws a rule above every pair but the first, midway between two pairs', async () => {
    await example(divided)
    await idle()
    const items = [...document.querySelectorAll('helix-description-list-item')] as HTMLElement[]
    const rules = items.map((item) => getComputedStyle(item).borderTopWidth)
    expect(rules[0]).toBe('0px')
    expect(rules.slice(1).every((width) => width !== '0px')).toBe(true)
    const [first, second] = items.map((item) => item.getBoundingClientRect())
    const value = (part(items[1] as HTMLElement, 'value') as HTMLElement).getBoundingClientRect()
    const above = (second as DOMRect).top - (first as DOMRect).bottom
    expect(Math.round(value.top - (second as DOMRect).top - 1)).toBe(Math.round(above))
  })
})
