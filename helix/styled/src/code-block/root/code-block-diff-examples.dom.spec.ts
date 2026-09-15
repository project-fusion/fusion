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

  run('a changed line’s wash runs the width of the block', async () => {
    await example(diff)
    await idle()
    const root = block().shadowRoot
    const pre = root?.querySelector('[part="block"]')?.getBoundingClientRect()
    const added = root?.querySelector('[part="added"]')?.getBoundingClientRect()
    expect(Math.round(added?.width ?? 0)).toBeGreaterThanOrEqual(Math.round((pre?.width ?? 0) - 2))
  })

  run('under its name, the block draws no top edge or corner of its own', async () => {
    await example(diff)
    await idle()
    const pre = getComputedStyle(block().shadowRoot?.querySelector('[part="block"]') as Element)
    expect([pre.borderTopWidth, pre.borderTopLeftRadius, pre.borderTopRightRadius]).toEqual([
      '0px',
      '0px',
      '0px',
    ])
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

  /* Only the version under the header gives its top edge to it. */
  run('stacked, the new version keeps the top edge the old one gives the header', async () => {
    await example(split)
    block().style.inlineSize = '20rem'
    await idle()
    const root = block().shadowRoot
    const edge = (name: string): string =>
      getComputedStyle(root?.querySelector(`[part="${name}"]`) as Element).borderTopWidth
    expect([edge('old'), edge('new')]).toEqual(['0px', '1px'])
  })
})

/**
 * The copy button stands over nothing a reader reads.
 *
 * A diff scrolls its block so its washes reach the edge, which leaves no end
 * padding to keep a line clear of anything standing beside it: the button stood
 * on the hunk line and the line under it. It is in the header now, and a diff
 * with no name keeps a band above its first hunk for it.
 */
describe('the copy button in a diff', () => {
  const overlaps = (a: DOMRect, b: DOMRect): boolean =>
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

  /* Every line the button covers, with each scroller at its start and at its
     end, since a line that ran under the button did so once it was scrolled. */
  const covered = (host: HTMLElement): DOMRect[] => {
    const root = host.shadowRoot
    const copy = root?.querySelector('[part="copy"]')?.getBoundingClientRect()
    expect(copy).toBeDefined()
    const scrollers = [
      ...(root?.querySelectorAll<HTMLElement>('[part="block"], [part="old"], [part="new"]') ?? []),
    ]
    return [0, 1].flatMap((end) => {
      for (const scroller of scrollers) {
        scroller.scrollLeft = end * scroller.scrollWidth
      }
      return rows(root).filter((row) => copy !== undefined && overlaps(row, copy))
    })
  }

  for (const [name, markup] of [
    ['diff', diff],
    ['split', split],
  ] as const) {
    run(`stands in the ${name} example’s header, inside its box`, async () => {
      await example(markup)
      await idle()
      const root = block().shadowRoot
      const copy = root?.querySelector('[part="copy"]')
      const header = root?.querySelector('[part="header"]')
      expect(copy?.parentElement).toBe(header)
      const inner = copy?.getBoundingClientRect()
      const outer = header?.getBoundingClientRect()
      expect(inner?.top).toBeGreaterThanOrEqual(outer?.top ?? Number.POSITIVE_INFINITY)
      expect(inner?.bottom).toBeLessThanOrEqual(outer?.bottom ?? Number.NEGATIVE_INFINITY)
      expect(inner?.right).toBeLessThanOrEqual(outer?.right ?? Number.NEGATIVE_INFINITY)
    })

    run(`covers no line of the ${name} example, scrolled to either end`, async () => {
      await example(markup)
      await idle()
      expect(rows(block().shadowRoot).length).toBeGreaterThan(4)
      expect(covered(block())).toHaveLength(0)
    })
  }

  run('covers no line of the split example stacked one above the other', async () => {
    await example(split)
    block().style.inlineSize = '20rem'
    await idle()
    expect(covered(block())).toHaveLength(0)
  })

  run('and a diff with no name keeps a band above its first hunk for it', async () => {
    await example('<helix-code-block diff>@@ -1 +1 @@\n-a\n+b\n</helix-code-block>')
    await idle()
    const root = block().shadowRoot
    expect(root?.querySelector('[part="header"]')).toBeNull()
    expect(root?.querySelector('[part="frame"] > [part="copy"]')).not.toBeNull()
    expect(covered(block())).toHaveLength(0)
  })
})
