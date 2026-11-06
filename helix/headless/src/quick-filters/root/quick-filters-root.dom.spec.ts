import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount as mountMarkup, registerDom } from '@fusion.dev/helix-testing/dom'

/* Presets are partial views with counts; Save view fires events, and keeps the
   view in storage only under `view-key`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../data-table/index.js')
  await import('../../table/index.js')
})

interface Table extends HTMLElement {
  rows: readonly Record<string, unknown>[]
  updateComplete: Promise<unknown>
  view: { filters: { field: string; values: string[] }[]; sort: string }
}

interface Row extends HTMLElement {
  updateComplete: Promise<unknown>
}

const OVERDUE = `{"filters":[{"field":"status","operator":"any","values":["Overdue"]}]}`

const page = async (attrs = ''): Promise<{ row: Row; table: Table }> => {
  const root = await mountMarkup(`<div>
    <helix-headless-quick-filters for="invoices" ${attrs}>
      <helix-headless-quick-filter view='{"filters":[]}'>All</helix-headless-quick-filter>
      <helix-headless-quick-filter view='${OVERDUE}'>Overdue</helix-headless-quick-filter>
      <helix-headless-quick-filter view='{"sort":"amount:desc"}' count="99">Largest</helix-headless-quick-filter>
    </helix-headless-quick-filters>
    <helix-headless-data-table id="invoices" label="Invoices">
      <helix-headless-table-column field="id">Invoice</helix-headless-table-column>
      <helix-headless-table-column field="status" type="enum">Status</helix-headless-table-column>
      <helix-headless-table-column field="amount" type="number">Amount</helix-headless-table-column>
    </helix-headless-data-table>
  </div>`)
  const table = root.querySelector('helix-headless-data-table') as Table
  const row = root.querySelector('helix-headless-quick-filters') as Row
  table.rows = [
    { amount: 5, id: 'A', status: 'Overdue' },
    { amount: 9, id: 'B', status: 'Paid' },
    { amount: 2, id: 'C', status: 'Overdue' },
  ]
  await settle(row, table)
  return { row, table }
}

const settle = async (row: Row, table: Table): Promise<void> => {
  for (let turn = 0; turn < 3; turn += 1) {
    await table.updateComplete
    await row.updateComplete
    await new Promise((resolve) => setTimeout(resolve))
  }
}

const presets = (row: Row): HTMLElement[] => [
  ...(row.shadowRoot?.querySelectorAll<HTMLElement>('[part~="preset"]') ?? []),
]
const words = (row: Row): string[] =>
  presets(row).map((one) => one.textContent?.replace(/\s+/g, ' ').trim() ?? '')

describe('quick filters', () => {
  test('draw a button for each preset, with how many rows it shows', async () => {
    const { row } = await page()
    expect(words(row)).toEqual(['All 3', 'Overdue 2', 'Largest 99'])
    expect(row.shadowRoot?.querySelector('[part="list"]')?.getAttribute('role')).toBe('toolbar')
  })

  test('set the parts of the view a preset names, and press the one in force', async () => {
    const { row, table } = await page()
    presets(row)[1]?.click()
    await settle(row, table)
    expect(table.view.filters).toEqual([
      { field: 'status', operator: 'any', values: ['Overdue'] },
    ] as never)
    expect(presets(row).map((one) => one.getAttribute('aria-pressed'))).toEqual([
      'false',
      'true',
      'false',
    ])
    presets(row)[2]?.click()
    await settle(row, table)
    expect(table.view.sort).toBe('amount:desc')
    expect(table.view.filters).toHaveLength(1)
  })

  test('save a view with events only, where no key is set', async () => {
    const { row, table } = await page()
    const heard: string[] = []
    row.addEventListener('helix-before-view-save', (event) =>
      heard.push(`before ${event.detail.label}`),
    )
    row.addEventListener('helix-view-save', (event) =>
      heard.push(`after ${event.detail.view.sort}`),
    )
    row.shadowRoot?.querySelector<HTMLElement>('[part="save"]')?.click()
    await settle(row, table)
    expect(heard).toEqual(['before View 1', 'after '])
    expect(presets(row)).toHaveLength(3)
  })

  test('keep a saved view in storage under view-key, and draw it again', async () => {
    localStorage.clear()
    const first = await page('view-key="invoices"')
    ;(first.table as unknown as { requestView: (next: unknown) => boolean }).requestView({
      sort: 'id:desc',
    })
    first.row.shadowRoot?.querySelector<HTMLElement>('[part="save"]')?.click()
    await settle(first.row, first.table)
    expect(words(first.row)).toContain('View 1 3')
    const again = await page('view-key="invoices"')
    expect(words(again.row)).toContain('View 1 3')
    again.row.shadowRoot?.querySelector<HTMLElement>('[part="remove"]')?.click()
    await settle(again.row, again.table)
    expect(presets(again.row)).toHaveLength(3)
  })

  test('refused, keeps nothing', async () => {
    localStorage.clear()
    const { row, table } = await page('view-key="refused"')
    row.addEventListener('helix-before-view-save', (event) => event.preventDefault())
    row.shadowRoot?.querySelector<HTMLElement>('[part="save"]')?.click()
    await settle(row, table)
    expect(localStorage.getItem('helix-views:refused')).toBeNull()
  })
})
