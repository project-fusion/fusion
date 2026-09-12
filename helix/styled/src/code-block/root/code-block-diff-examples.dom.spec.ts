import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import diff from '../.examples/diff.html' with { type: 'text' }
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

const block = (): HTMLElement => document.querySelector('helix-code-block') as HTMLElement

describe('the diff example', () => {
  run('draws the slotted patch as lines, each one line tall', async () => {
    await example(diff)
    await idle()
    const drawn = rows(block().shadowRoot)
    expect(drawn.length).toBeGreaterThan(4)
    expect(new Set(drawn.map((row) => Math.round(row.height))).size).toBe(1)
  })

  run('a changed line’s wash runs the width of the block, under the copy button too', async () => {
    await example(diff)
    await idle()
    const root = block().shadowRoot
    const pre = root?.querySelector('[part="block"]')?.getBoundingClientRect()
    const added = root?.querySelector('[part="added"]')?.getBoundingClientRect()
    expect(Math.round(added?.width ?? 0)).toBeGreaterThanOrEqual(Math.round((pre?.width ?? 0) - 2))
  })

  run('an insertion is not underlined, since on code that reads as markup', async () => {
    await example(diff)
    await idle()
    const added = block().shadowRoot?.querySelector('[part="added"]') as HTMLElement
    expect(getComputedStyle(added).textDecorationLine).toBe('none')
  })
})

describe('the split example', () => {
  run('old and new sit side by side, and every row is level with its partner', async () => {
    await example(split)
    await idle()
    const root = block().shadowRoot
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

  run('and one above the other once the block is too narrow for both', async () => {
    await example(split)
    block().style.inlineSize = '20rem'
    await idle()
    const root = block().shadowRoot
    const old = root?.querySelector('[part="old"]')?.getBoundingClientRect()
    const now = root?.querySelector('[part="new"]')?.getBoundingClientRect()
    expect(now?.top).toBeGreaterThanOrEqual(old?.bottom ?? 0)
  })
})
