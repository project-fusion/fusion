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
import bleedInsetStyles from '../.examples/bleed-inset.css' with { type: 'text' }
import bleedInset from '../.examples/bleed-inset.html' with { type: 'text' }

/* The `bleed` example as a page draws it: its script hands the table its rows,
   and the row it names is chosen. Where the boxes land only a browser says, so
   run the rest with `bun run specs:browser data-table`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
  await import('../../divider/index.js')
})

/* An example runs its script only in the browser harness, so every one of these does. */
const geometry = hasLayout() ? test : (): void => {}

type Table = HTMLElement & Updatable

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const table = async (): Promise<Table> => {
  await example(bleed, bleedStyles)
  const host = document.querySelector('helix-data-table') as Table
  for (let at = 0; at < 4; at += 1) {
    await frame()
    await settle(host)
  }
  return host
}

const rows = (host: Table): HTMLElement[] => [
  ...(host.shadowRoot?.querySelectorAll<HTMLElement>('[part~="row"]') ?? []),
]

describe('the bleed example', () => {
  geometry('draws the rows its script hands the table, with the two it names chosen', async () => {
    const host = await table()
    const drawn = rows(host)
    expect(drawn.length).toBe(3)
    expect(drawn.map((row) => row.getAttribute('aria-selected'))).toEqual(['false', 'true', 'true'])
  })

  geometry(
    'keeps the rules on the divider’s column, and reaches the chosen row past it',
    async () => {
      const host = await table()
      const divider = (
        document.querySelector('helix-divider') as HTMLElement
      ).getBoundingClientRect()
      const chosen = rows(host)[1] as HTMLElement
      const first = chosen.firstElementChild as HTMLElement
      const last = chosen.lastElementChild as HTMLElement
      /* The cells and their rules on the divider's column. */
      expect(first.getBoundingClientRect().left).toBeCloseTo(divider.left, 0)
      expect(last.getBoundingClientRect().right).toBeCloseTo(divider.right, 0)
      /* The fill past it by the same amount each side. */
      const reach = Number.parseFloat(getComputedStyle(first, '::before').inlineSize)
      expect(reach).toBeGreaterThan(0)
      expect(Number.parseFloat(getComputedStyle(last, '::after').inlineSize)).toBeCloseTo(reach, 0)
    },
  )
})

const served = async (attributes: string, selected: string): Promise<Table> => {
  const region = await mount(
    `<div style="padding: 2rem"><helix-data-table ${attributes} default-selected="${selected}" label="Services" row-key="name" selectable>
      <helix-table-column field="name">Name</helix-table-column>
      <helix-table-column field="count">Count</helix-table-column>
    </helix-data-table></div>`,
  )
  const host = region.querySelector('helix-data-table') as Table & {
    rows: readonly Record<string, unknown>[]
  }
  host.rows = [
    { count: 3, name: 'api' },
    { count: 5, name: 'web' },
    { count: 1, name: 'worker' },
    { count: 2, name: 'cron' },
  ]
  for (let at = 0; at < 4; at += 1) {
    await frame()
    await settle(host)
  }
  return host
}

describe('a data table that bleeds', () => {
  geometry('puts a leading checkbox on the column the words of the table start on', async () => {
    const host = await served('bleed', 'web')
    const box = (rows(host)[0]?.firstElementChild as HTMLElement).querySelector(
      'helix-checkbox, input',
    ) as HTMLElement
    expect(box.getBoundingClientRect().left).toBeCloseTo(host.getBoundingClientRect().left, 0)
  })

  geometry('draws chosen rows next to each other as one block', async () => {
    const host = await served('bleed', 'api,web')
    const [first, second, third] = rows(host)
    const cell = (row: HTMLElement | undefined): HTMLElement =>
      row?.firstElementChild as HTMLElement
    /* No rule across the run, and the rule under its last row still drawn. */
    expect(getComputedStyle(cell(first)).borderBlockEndColor).toBe('rgba(0, 0, 0, 0)')
    expect(getComputedStyle(cell(second)).borderBlockEndColor).not.toBe('rgba(0, 0, 0, 0)')
    /* Corners only at the run's ends. */
    expect(getComputedStyle(cell(first), '::before').borderEndStartRadius).toBe('0px')
    expect(getComputedStyle(cell(second), '::before').borderStartStartRadius).toBe('0px')
    expect(
      Number.parseFloat(getComputedStyle(cell(first), '::before').borderStartStartRadius),
    ).toBeGreaterThan(0)
    expect(
      Number.parseFloat(getComputedStyle(cell(second), '::before').borderEndStartRadius),
    ).toBeGreaterThan(0)
    expect(getComputedStyle(cell(third)).borderBlockEndColor).not.toBe('rgba(0, 0, 0, 0)')
  })
})

describe('a data table with `bleed="inset"`', () => {
  test('keeps `inset` as it was written, and turns off when the attribute goes', async () => {
    const host = (await mount(
      '<helix-data-table bleed="inset" label="Services"></helix-data-table>',
    )) as Table & {
      bleed: boolean | 'inset'
    }
    await settle(host)
    expect(host.bleed).toBe('inset')
    expect(host.getAttribute('bleed')).toBe('inset')
    host.bleed = true
    await settle(host)
    expect(host.getAttribute('bleed')).toBe('')
    host.bleed = false
    await settle(host)
    expect(host.hasAttribute('bleed')).toBe(false)
  })

  geometry(
    'keeps a chosen row’s fill off the rules, rounded at both ends past the words',
    async () => {
      const host = await served('bleed="inset"', 'web')
      const chosen = rows(host)[1] as HTMLElement
      const first = chosen.firstElementChild as HTMLElement
      const last = chosen.lastElementChild as HTMLElement
      const fill = getComputedStyle(first, '::before')
      /* The cell paints nothing of its own; the inset fill carries its color. */
      expect(getComputedStyle(first).backgroundClip).toBe('text')
      expect(fill.backgroundColor).toBe(getComputedStyle(first).backgroundColor)
      expect(fill.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
      /* Off the rules above and below, past the words at each end, rounded there. */
      expect(Number.parseFloat(fill.top)).toBeGreaterThan(0)
      expect(Number.parseFloat(fill.bottom)).toBeGreaterThan(0)
      expect(Number.parseFloat(fill.insetInlineStart)).toBeLessThan(0)
      expect(Number.parseFloat(getComputedStyle(last, '::before').insetInlineEnd)).toBeLessThan(0)
      expect(Number.parseFloat(fill.borderStartStartRadius)).toBeGreaterThan(0)
      expect(getComputedStyle(last, '::after').content).toBe('none')
    },
  )
})

describe('the bleed-inset example', () => {
  geometry(
    'draws its chosen rows as one rounded fill kept off the rules, inside the card',
    async () => {
      await example(bleedInset, bleedInsetStyles)
      const host = document.querySelector('helix-data-table') as Table
      for (let at = 0; at < 4; at += 1) {
        await frame()
        await settle(host)
      }
      const drawn = rows(host)
      expect(drawn.map((row) => row.getAttribute('aria-selected'))).toEqual([
        'false',
        'true',
        'true',
      ])
      const [, upper, lower] = drawn.map((row) => row.firstElementChild as HTMLElement)
      /* Off the rule above the run and the edge below it; closed between the two. */
      expect(
        Number.parseFloat(getComputedStyle(upper as HTMLElement, '::before').top),
      ).toBeGreaterThan(0)
      expect(
        Number.parseFloat(getComputedStyle(upper as HTMLElement, '::before').bottom),
      ).toBeLessThanOrEqual(0)
      expect(Number.parseFloat(getComputedStyle(lower as HTMLElement, '::before').top)).toBe(0)
      expect(
        Number.parseFloat(getComputedStyle(lower as HTMLElement, '::before').bottom),
      ).toBeGreaterThan(0)
    },
  )
})
