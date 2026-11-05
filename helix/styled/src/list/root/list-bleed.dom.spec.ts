import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  example,
  hasLayout,
  mount,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'
import bleedStyles from '../.examples/bleed.css' with { type: 'text' }
import bleed from '../.examples/bleed.html' with { type: 'text' }

/* `bleed` on a list, a tree, a menu, a listbox and a data table: the words of
   every row sit on the column the content around them is set on, and a row's
   fill reaches past it by `--helix-space-row-bleed`, which follows the density.
   Where each box lands only a browser computes, so run these with
   `bun run specs:browser list`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../divider/index.js')
  await import('../../tree/index.js')
  await import('../../menu/index.js')
  await import('../../button/index.js')
  await import('../../listbox/index.js')
  await import('../../option/index.js')
  await import('../../data-table/index.js')
  await import('../../table/index.js')
})

const geometry = hasLayout() ? test : (): void => {}

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const settleAll = async (root: ParentNode): Promise<void> => {
  for (const element of root.querySelectorAll<HTMLElement & Updatable>('*')) {
    if (element.localName.startsWith('helix-')) {
      await settle(element)
    }
  }
  await frame()
}

/** Where the first run of text inside `element` starts, which is where a reader sees the words. */
const wordsAt = (element: Node): number => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  })
  const text = walker.nextNode()
  if (!text) {
    throw new Error('no words to measure')
  }
  const range = document.createRange()
  range.selectNodeContents(text)
  return range.getBoundingClientRect().left
}

const box = (element: Element | null | undefined): DOMRect => {
  if (!element) {
    throw new Error('no box to measure')
  }
  return element.getBoundingClientRect()
}

const partOf = (host: Element | null, name: string): Element | null | undefined =>
  host?.shadowRoot?.querySelector(`[part~="${name}"]`)

/** The bleed a region resolves, read through a probe so the token is the one the page has. */
const bleedIn = (region: Element): number => {
  const probe = document.createElement('i')
  probe.style.display = 'block'
  probe.style.inlineSize = 'var(--helix-space-row-bleed)'
  region.append(probe)
  const width = probe.getBoundingClientRect().width
  probe.remove()
  return width
}

describe('a list with `bleed`', () => {
  geometry('sets its words on the divider’s column, and the fill reaches past it', async () => {
    await example(bleed, bleedStyles)
    const list = document.querySelector('helix-list') as HTMLElement
    await settleAll(document.body)
    const divider = box(document.querySelector('helix-divider'))
    const current = document.querySelector('helix-list-item[current]')
    const fill = box(partOf(current, 'row'))
    const amount = bleedIn(list)
    expect(amount).toBeGreaterThan(0)
    expect(Math.abs(wordsAt(current as Node) - divider.left)).toBeLessThan(1)
    expect(fill.left).toBeCloseTo(divider.left - amount, 0)
    expect(fill.right).toBeCloseTo(divider.right + amount, 0)
  })

  geometry(
    'without it, the row keeps its own inset and its fill stays inside the list',
    async () => {
      await example(bleed, bleedStyles)
      const list = document.querySelector('helix-list') as HTMLElement
      list.removeAttribute('bleed')
      await settleAll(document.body)
      const current = document.querySelector('helix-list-item[current]')
      expect(box(partOf(current, 'row')).left).toBeCloseTo(box(list).left, 0)
      expect(wordsAt(current as Node)).toBeGreaterThan(box(list).left + bleedIn(list))
    },
  )

  geometry('follows the density: a step under the inset at sm, md and lg', async () => {
    const widths: number[] = []
    for (const density of ['sm', 'md', 'lg']) {
      const region = await mount(
        `<div data-density="${density}" style="padding: 2rem"><helix-list bleed label="Steps"><helix-list-item current="page">One</helix-list-item></helix-list></div>`,
      )
      await settleAll(region)
      const list = region.querySelector('helix-list') as HTMLElement
      const row = box(partOf(region.querySelector('helix-list-item'), 'row'))
      widths.push(box(list).left - row.left)
      expect(
        Math.abs(wordsAt(region.querySelector('helix-list-item') as Node) - box(list).left),
      ).toBeLessThan(1)
    }
    const [sm = 0, md = 0, lg = 0] = widths
    expect(sm).toBeGreaterThan(0)
    expect(sm).toBeLessThan(md)
    expect(md).toBeLessThan(lg)
  })

  /* The marker hangs in the list's gutter, where the bleed would pull the
     words: measured on a numbered list in a chat transcript, "1Pause". */
  geometry('leaves an ordered or unordered list’s rows where their markers need them', async () => {
    const region = await mount(
      '<div style="padding: 2rem"><helix-list bleed kind="ordered" label="Steps"><helix-list-item>One</helix-list-item></helix-list></div>',
    )
    await settleAll(region)
    const row = box(partOf(region.querySelector('helix-list-item'), 'row'))
    expect(row.left).toBeGreaterThanOrEqual(box(region.querySelector('helix-list')).left)
  })

  geometry('a page can set the amount on the list', async () => {
    const region = await mount(
      '<div style="padding: 2rem"><helix-list bleed label="Steps" style="--list-bleed: 10px"><helix-list-item current="page">One</helix-list-item></helix-list></div>',
    )
    await settleAll(region)
    const list = region.querySelector('helix-list') as HTMLElement
    const row = box(partOf(region.querySelector('helix-list-item'), 'row'))
    expect(box(list).left - row.left).toBeCloseTo(10, 0)
  })
})

describe('a tree with `bleed`', () => {
  geometry(
    'bleeds every depth alike, and the fold’s clip leaves a nested row its room',
    async () => {
      const region = await mount(
        `<div style="padding: 2rem"><helix-tree bleed label="Files">
        <helix-tree-item default-open value="src">src
          <helix-tree-item slot="children" value="web">web</helix-tree-item>
        </helix-tree-item>
      </helix-tree></div>`,
      )
      await settleAll(region)
      const tree = box(region.querySelector('helix-tree'))
      const amount = bleedIn(region)
      const [top, nested] = [...region.querySelectorAll('helix-tree-item')]
      const topRow = box(partOf(top ?? null, 'row'))
      const nestedRow = box(partOf(nested ?? null, 'row'))
      expect(topRow.left).toBeCloseTo(tree.left - amount, 0)
      expect(nestedRow.left).toBeCloseTo(tree.left - amount, 0)
      expect(nestedRow.right).toBeCloseTo(tree.right + amount, 0)
      /* The slot that clips the fold reaches as far as the row it holds. */
      const clip = box(top?.shadowRoot?.querySelector('[part="group"] > slot'))
      expect(clip.left).toBeLessThanOrEqual(nestedRow.left + 0.5)
      expect(clip.right).toBeGreaterThanOrEqual(nestedRow.right - 0.5)
      /* The indent is unchanged: the nested words are to the end of the top ones. */
      expect(wordsAt(nested as Node)).toBeGreaterThan(wordsAt(top as Node))
    },
  )
})

describe('a listbox, by default', () => {
  geometry(
    'keeps the words on the field’s column, and insets a rounded fill around them',
    async () => {
      const markup = (attributes: string): string =>
        `<helix-listbox label="Fruit" ${attributes}><helix-option value="a">Apple</helix-option><helix-option value="b">Banana</helix-option></helix-listbox>`
      const plain = await mount(markup('bleed="none"'))
      await settleAll(plain)
      const before = wordsAt(plain.querySelector('helix-option') as Node) - box(plain).left
      const bled = await mount(markup(''))
      await settleAll(bled)
      const option = bled.querySelector('helix-option')
      const words = wordsAt(option as Node)
      const fill = box(partOf(option, 'item'))
      expect(words - box(bled).left).toBeCloseTo(before, 0)
      expect(words - fill.left).toBeCloseTo(bleedIn(bled), 0)
      expect(fill.left).toBeGreaterThan(box(bled).left)
    },
  )
})

describe('a menu, by default', () => {
  /* Read as computed insets, which a closed panel resolves as an open one does:
     the margin and the padding sum to the step the section headings are set
     on, so the words do not move, and the fill is rounded and inset. */
  geometry('keeps the words on the headings’ column, and rounds an inset fill', async () => {
    const markup = (attributes: string): string =>
      `<helix-menu open ${attributes}><helix-button slot="trigger">More</helix-button><helix-menu-item value="a">Archive</helix-menu-item></helix-menu>`
    const inset = (host: Element): { margin: number; padding: number; radius: string } => {
      const item = getComputedStyle(
        partOf(host.querySelector('helix-menu-item'), 'item') as Element,
      )
      return {
        margin: Number.parseFloat(item.marginInlineStart),
        padding: Number.parseFloat(item.paddingInlineStart),
        radius: item.borderStartStartRadius,
      }
    }
    const plain = await mount(markup('bleed="none"'))
    await settleAll(plain)
    /* Each mount replaces the last, so the first is read before the second. */
    const before = inset(plain)
    const bled = await mount(markup(''))
    await settleAll(bled)
    const after = inset(bled)
    expect(before.margin).toBe(0)
    expect(after.margin + after.padding).toBeCloseTo(before.padding, 1)
    expect(after.padding).toBeCloseTo(bleedIn(bled), 1)
    expect(after.margin).toBeGreaterThan(0)
    expect(before.radius).toBe('0px')
    expect(after.radius).not.toBe('0px')
  })
})

describe('a data table with `bleed`', () => {
  geometry(
    'keeps its words and headings on its edge, and runs each row and its rule past it',
    async () => {
      const region = await mount(
        `<div style="padding: 2rem"><helix-data-table bleed default-selected="api" label="Services" row-key="name" selectable>
        <helix-table-column field="name">Name</helix-table-column>
        <helix-table-column field="count">Count</helix-table-column>
      </helix-data-table></div>`,
      )
      const host = region.querySelector('helix-data-table') as HTMLElement & {
        rows: readonly Record<string, unknown>[]
      }
      host.rows = [
        { count: 3, name: 'api' },
        { count: 5, name: 'web' },
        /* So the plain row above is not the last, which draws no rule. */
        { count: 1, name: 'worker' },
      ]
      await settleAll(region)
      const amount = bleedIn(region)
      const edge = box(host).left
      const table = box(partOf(host, 'table'))
      expect(table.left).toBeCloseTo(edge - amount, 0)
      expect(table.right).toBeCloseTo(box(host).right + amount, 0)
      const rows = [...(host.shadowRoot?.querySelectorAll('[part~="row"]') ?? [])]
      const [chosen, plain] = rows
      const first = chosen?.firstElementChild as HTMLElement
      const last = chosen?.lastElementChild as HTMLElement
      /* The row's fill and its rule run to the table's edges. */
      expect(box(first).left).toBeCloseTo(table.left, 0)
      expect(box(last).right).toBeCloseTo(table.right, 0)
      /* The checkbox keeps its own step inside the bleed, so it stands where it did. */
      const name = chosen?.querySelector('[part~="cell"]') as HTMLElement
      expect(wordsAt(name)).toBeGreaterThan(edge)
      /* The last column's words end on the host's edge, as they did. */
      const count = last.getBoundingClientRect()
      expect(count.right - Number.parseFloat(getComputedStyle(last).paddingInlineEnd)).toBeCloseTo(
        box(host).right,
        0,
      )
      /* A chosen row is its fill between the lines; a plain row keeps its rule. */
      expect(getComputedStyle(first).borderBlockEndColor).toBe('rgba(0, 0, 0, 0)')
      expect(getComputedStyle(plain?.firstElementChild as Element).borderBlockEndColor).not.toBe(
        'rgba(0, 0, 0, 0)',
      )
    },
  )

  geometry(
    'puts the first column’s words and heading on its edge where nothing leads them',
    async () => {
      const region = await mount(
        `<div style="padding: 2rem"><helix-data-table bleed label="Services">
        <helix-table-column field="name">Name</helix-table-column>
        <helix-table-column field="count">Count</helix-table-column>
      </helix-data-table></div>`,
      )
      const host = region.querySelector('helix-data-table') as HTMLElement & {
        rows: readonly Record<string, unknown>[]
      }
      host.rows = [{ count: 3, name: 'api' }]
      await settleAll(region)
      const edge = box(host).left
      const cell = host.shadowRoot?.querySelector('[part~="row"] > :first-child') as HTMLElement
      expect(wordsAt(cell)).toBeCloseTo(edge, 0)
      const heading = host.querySelector('helix-table-column') as HTMLElement
      expect(wordsAt(heading)).toBeCloseTo(edge, 0)
    },
  )
})
