import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'
import narrow_columns from '../.examples/narrow-columns.html' with { type: 'text' }

/* A column that drops out of a narrow table, for its `min-table-width`, as the
   styled tier lays the grid out. Where each box lands only a browser computes,
   so run these with `bun run specs:browser data-table`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

const geometry = hasLayout() ? test : (): void => {}

type Table = HTMLElement & {
  rows: readonly Record<string, unknown>[]
  updateComplete: Promise<unknown>
}

const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

/** Waits a few frames: one for the size, one for the draw it asks for, and room for both. */
const frames = async (host: Table): Promise<void> => {
  for (let at = 0; at < 4; at += 1) {
    await frame()
    await host.updateComplete
  }
}

const table = async (width: string): Promise<Table> => {
  const host = (await mount(
    `<helix-data-table label="Services" style="inline-size: ${width}">
      <helix-table-column field="name">Name</helix-table-column>
      <helix-table-column field="region" min-table-width="40rem">Region</helix-table-column>
      <helix-table-column field="count" min-table-width="30rem" text-align="end">Count</helix-table-column>
    </helix-data-table>`,
  )) as Table
  host.rows = [
    { count: 12, name: 'api', region: 'eu-central-1' },
    { count: 3, name: 'web', region: 'us-east-1' },
  ]
  await frames(host)
  return host
}

/** A column's heading cell, its `column` part, which is the box a column draws. */
const cellOf = (column: HTMLElement): HTMLElement | null | undefined =>
  column.shadowRoot?.querySelector<HTMLElement>('[part~="column"]')

/** The columns whose heading is drawn. */
const drawn = (host: Table): HTMLElement[] =>
  [...host.querySelectorAll<HTMLElement>('helix-table-column')].filter(
    (column) => (cellOf(column)?.getBoundingClientRect().width ?? 0) > 0,
  )

describe('a column with a minimum table width, styled', () => {
  geometry(
    'a narrow table draws the columns that fit, and each cell sits under its heading',
    async () => {
      const host = await table('34rem')
      const headings = drawn(host)
      expect(headings.map((column) => column.textContent?.trim())).toEqual(['Name', 'Count'])
      for (const row of host.shadowRoot?.querySelectorAll('[part~="row"]') ?? []) {
        const cells = [...row.querySelectorAll('[part~="cell"]')]
        expect(cells).toHaveLength(2)
        cells.forEach((cell, at) => {
          const box = cell.getBoundingClientRect()
          const heading = (
            cellOf(headings[at] as HTMLElement) as HTMLElement
          ).getBoundingClientRect()
          expect(Math.round(box.left)).toBe(Math.round(heading.left))
          expect(Math.round(box.width)).toBe(Math.round(heading.width))
        })
      }
    },
  )

  geometry('the column that stays keeps the edge its values line up against', async () => {
    const host = await table('34rem')
    const row = host.shadowRoot?.querySelector('[part~="row"]') as Element
    const count = [...row.querySelectorAll('[part~="cell"]')][1] as HTMLElement
    expect(count.getAttribute('style')).toContain('--data-table-cell-align: end')
  })

  geometry('a wide table draws every column', async () => {
    const host = await table('48rem')
    expect(drawn(host).map((column) => column.textContent?.trim())).toEqual([
      'Name',
      'Region',
      'Count',
    ])
  })

  /* The example's script hands the table its rows. Narrowed to a phone's
     width, it keeps the service and its status. */
  geometry('the narrow-columns example keeps the two columns a phone has room for', async () => {
    const host = (await example(narrow_columns)) as Table
    host.style.inlineSize = '22rem'
    await frames(host)
    expect(drawn(host).map((column) => column.textContent?.trim())).toEqual(['Service', 'Status'])
    expect(host.shadowRoot?.querySelectorAll('[part~="row"]')).toHaveLength(3)
    host.style.inlineSize = '44rem'
    await frames(host)
    expect(drawn(host)).toHaveLength(4)
  })
})
