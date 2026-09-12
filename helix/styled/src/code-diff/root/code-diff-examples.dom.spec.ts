import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }
import split from '../.examples/split.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom lays nothing out. */
const run = hasLayout() ? test : (): void => {}

const ROWS = '[part="hunk"], [part="context"], [part="added"], [part="removed"], [part="filler"]'

const rows = (scope: ParentNode | null | undefined): DOMRect[] =>
  [...(scope?.querySelectorAll<HTMLElement>(ROWS) ?? [])].map((row) => row.getBoundingClientRect())

const diff = (): HTMLElement => document.querySelector('helix-code-diff') as HTMLElement

describe('the preview example', () => {
  run('every line is one line tall, so the newline that ends it adds no row', async () => {
    await example(preview)
    await idle()
    const heights = new Set(rows(diff().shadowRoot).map((row) => Math.round(row.height)))
    expect(heights.size).toBe(1)
  })

  run('a changed line’s wash runs the width of the block, not the length of its text', async () => {
    await example(preview)
    await idle()
    const root = diff().shadowRoot
    const block = root?.querySelector('[part="block"]')?.getBoundingClientRect()
    const added = root?.querySelector('[part="added"]')?.getBoundingClientRect()
    expect(Math.round(added?.width ?? 0)).toBeGreaterThanOrEqual(
      Math.round((block?.width ?? 0) - 2),
    )
  })

  run('an insertion is not underlined, since on code that reads as markup', async () => {
    await example(preview)
    await idle()
    const added = diff().shadowRoot?.querySelector('[part="added"]') as HTMLElement
    expect(getComputedStyle(added).textDecorationLine).toBe('none')
  })
})

describe('the split example', () => {
  run('old and new sit side by side, and every row is level with its partner', async () => {
    await example(split)
    await idle()
    const root = diff().shadowRoot
    const old = root?.querySelector('[part="old"]')
    const now = root?.querySelector('[part="new"]')
    expect(now?.getBoundingClientRect().left).toBeGreaterThan(
      old?.getBoundingClientRect().right ?? 0,
    )
    const left = rows(old)
    const right = rows(now)
    expect(left.length).toBe(right.length)
    left.forEach((row, index) => {
      expect(Math.round(row.top)).toBe(Math.round(right[index]?.top ?? -1))
    })
  })

  run('and one above the other once the diff is too narrow for two files', async () => {
    await example(split)
    diff().style.inlineSize = '20rem'
    await idle()
    const root = diff().shadowRoot
    const old = root?.querySelector('[part="old"]')?.getBoundingClientRect()
    const now = root?.querySelector('[part="new"]')?.getBoundingClientRect()
    expect(now?.top).toBeGreaterThanOrEqual(old?.bottom ?? 0)
  })
})
