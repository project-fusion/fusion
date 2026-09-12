import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }
import stacked from '../.examples/stacked.html' with { type: 'text' }

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
