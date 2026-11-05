import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  example,
  hasLayout,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'
import aligned from '../.examples/aligned-cells.html' with { type: 'text' }

/* Where a cell's content sits in a row taller than it. A row's grip sets its
   height, and a line of text rode at the top of the row beside it, its
   capitals above the middle by the padding and the descender's room. These
   measure the glyphs and the boxes against the row, in a browser that trims,
   with `bun run specs:browser data-table`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
  await import('../../tag/index.js')
})

const trims = hasLayout() && CSS.supports('text-box', 'trim-both cap alphabetic')
const geometry = trims ? test : (): void => {}

type Table = HTMLElement & Updatable

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const table = async (): Promise<Table> => {
  await example(aligned)
  const host = document.querySelector('helix-data-table') as Table
  for (let at = 0; at < 4; at += 1) {
    await frame()
    await settle(host)
  }
  for (const tag of document.querySelectorAll<Table>('helix-tag')) {
    await settle(tag)
  }
  await document.fonts.ready
  return host
}

/** The first row's cells, in order: grip, name, link, tag. */
const firstRow = (host: Table): HTMLElement[] =>
  [...(host.shadowRoot?.querySelector('[part~="row"]')?.children ?? [])] as HTMLElement[]

/** The row's own box: a cell's, less the rule under it, since every cell is as tall as the row. */
const rowOf = (cell: HTMLElement): { bottom: number; top: number } => {
  const box = cell.getBoundingClientRect()
  const rule = Number.parseFloat(getComputedStyle(cell).borderBlockEndWidth) || 0
  return { bottom: box.bottom - rule, top: box.top }
}

/**
 * Where the capitals of the first run of text under `element` are drawn: their
 * top and their baseline, from the run's content area and the face's metrics,
 * as `avatar-initials.dom.spec.ts` reads them.
 */
const capitals = (element: Element): { bottom: number; top: number } => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  })
  const text = walker.nextNode() as Text
  const style = getComputedStyle(text.parentElement as Element)
  const context = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D
  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  const metrics = context.measureText('H')
  const range = document.createRange()
  range.selectNodeContents(text)
  const run = range.getClientRects()[0] as DOMRect
  const baseline = run.top + metrics.fontBoundingBoxAscent
  return { bottom: baseline, top: baseline - metrics.actualBoundingBoxAscent }
}

/** How far the middle of `inner` is from the middle of `outer`. */
const offset = (
  inner: { bottom: number; top: number },
  outer: { bottom: number; top: number },
): number => (inner.top + inner.bottom) / 2 - (outer.top + outer.bottom) / 2

describe('a row taller than its text', () => {
  geometry('centers a line of text on its capitals', async () => {
    const [grip, name] = firstRow(await table())
    const row = rowOf(grip as HTMLElement)
    /* The grip is what makes the row taller than a line: the case this is for. */
    expect(row.bottom - row.top).toBeGreaterThan(
      capitals(name as HTMLElement).bottom - capitals(name as HTMLElement).top + 16,
    )
    /* A pixel, since layout and a canvas round the face's metrics their own ways. */
    expect(Math.abs(offset(capitals(name as HTMLElement), row))).toBeLessThanOrEqual(1)
  })

  geometry('centers a link on its capitals, and a tag on its box', async () => {
    const [grip, , notes, state] = firstRow(await table())
    const row = rowOf(grip as HTMLElement)
    const tag = state?.querySelector('helix-tag') as Element
    expect(
      Math.abs(offset(capitals(notes?.querySelector('a') as Element), row)),
    ).toBeLessThanOrEqual(1)
    expect(Math.abs(offset(tag.getBoundingClientRect(), row))).toBeLessThanOrEqual(1)
  })

  geometry('keeps the row as tall as it was', async () => {
    const host = await table()
    const [grip] = firstRow(host)
    const before = rowOf(grip as HTMLElement)
    host.style.setProperty('--data-table-cell-block-align', 'start')
    await frame()
    const after = rowOf(grip as HTMLElement)
    expect(after.bottom - after.top).toBeCloseTo(before.bottom - before.top, 0)
  })

  geometry('puts a `start` column against the top, where wrapping text begins', async () => {
    const host = await table()
    const column = document.querySelector('helix-table-column') as Table
    column.setAttribute('vertical-align', 'start')
    await settle(column)
    for (let at = 0; at < 3; at += 1) {
      await frame()
      await settle(host)
    }
    const [grip, name] = firstRow(host)
    const row = rowOf(grip as HTMLElement)
    const letters = capitals(name as HTMLElement)
    expect(name?.style.getPropertyValue('--data-table-cell-block-align')).toBe('start')
    expect(letters.top - row.top).toBeLessThan(row.bottom - letters.bottom - 1)
  })

  geometry('takes the table’s hook, and a column’s attribute over it', async () => {
    const host = await table()
    host.style.setProperty('--data-table-cell-block-align', 'end')
    await frame()
    const [grip, name] = firstRow(host)
    const row = rowOf(grip as HTMLElement)
    const letters = capitals(name as HTMLElement)
    expect(row.bottom - letters.bottom).toBeLessThan(letters.top - row.top - 1)
  })
})
