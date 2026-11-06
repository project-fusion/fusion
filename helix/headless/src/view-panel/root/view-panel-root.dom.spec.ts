import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount as mountMarkup, registerDom } from '@fusion.dev/helix-testing/dom'

/* The phone's view panel: sections with what each holds, the sort it draws
   itself, Reset, and Show closing the drawer it is in. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../data-table/index.js')
  await import('../../table/index.js')
})

interface Table extends HTMLElement {
  requestView: (next: Record<string, unknown>) => boolean
  rows: readonly Record<string, unknown>[]
  updateComplete: Promise<unknown>
  view: { filters: unknown[]; query: string; sort: string }
}

interface Panel extends HTMLElement {
  active: number
  updateComplete: Promise<unknown>
}

const page = async (): Promise<{
  drawer: HTMLElement & { open: boolean }
  panel: Panel
  table: Table
}> => {
  const root = await mountMarkup(`<div>
    <div id="sheet">
      <helix-headless-view-panel for="invoices">
        <div slot="columns">columns</div>
      </helix-headless-view-panel>
    </div>
    <helix-headless-data-table id="invoices" label="Invoices">
      <helix-headless-table-column field="customer" sortable>Customer</helix-headless-table-column>
      <helix-headless-table-column field="due" sortable>Due</helix-headless-table-column>
      <helix-headless-table-column field="status" type="enum">Status</helix-headless-table-column>
    </helix-headless-data-table>
  </div>`)
  const drawer = root.querySelector('#sheet') as HTMLElement & { hide: () => void; open: boolean }
  drawer.open = true
  drawer.hide = () => (drawer.open = false)
  const table = root.querySelector('helix-headless-data-table') as Table
  const panel = root.querySelector('helix-headless-view-panel') as Panel
  table.rows = [
    { customer: 'Acme', due: '2026-11-01', status: 'Overdue' },
    { customer: 'Bolt', due: '2026-11-04', status: 'Paid' },
  ]
  await settle(panel, table)
  return { drawer, panel, table }
}

const settle = async (panel: Panel, table: Table): Promise<void> => {
  for (let turn = 0; turn < 3; turn += 1) {
    await table.updateComplete
    await panel.updateComplete
    await new Promise((resolve) => setTimeout(resolve))
  }
}

const sections = (panel: Panel): string[] =>
  [...(panel.shadowRoot?.querySelectorAll('[part="section"]') ?? [])].map((one) =>
    (one.textContent ?? '').replace(/\s+/g, ' ').trim(),
  )
const part = (panel: Panel, name: string): HTMLElement =>
  panel.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLElement

describe('a view panel', () => {
  test('lists the sections that have something, each with what it holds', async () => {
    const { panel, table } = await page()
    table.requestView({
      filters: [{ field: 'status', operator: 'any', values: ['Paid'] }],
      query: 'bo',
      sort: 'due:desc',
    })
    await settle(panel, table)
    expect(sections(panel)).toEqual(['Sort Due, descending', 'Columns Customer, Due, Status'])
    expect(panel.active).toBe(2)
    expect(part(panel, 'show').textContent?.trim()).toBe('Show 1 row')
  })

  test('opens a section, and Back returns to the list', async () => {
    const { panel, table } = await page()
    panel.shadowRoot?.querySelectorAll<HTMLElement>('[part="section"]')[1]?.click()
    await settle(panel, table)
    expect(part(panel, 'sections').hidden).toBe(true)
    expect(panel.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="columns"]')?.hidden).toBe(
      false,
    )
    part(panel, 'back').click()
    await settle(panel, table)
    expect(part(panel, 'sections').hidden).toBe(false)
  })

  test('draws the sort orders of the sortable columns, and sorts by one', async () => {
    const { panel, table } = await page()
    panel.shadowRoot?.querySelector<HTMLElement>('[part="section"]')?.click()
    await settle(panel, table)
    const labels = [...(panel.shadowRoot?.querySelectorAll('[part="choice"]') ?? [])].map((one) =>
      one.textContent?.trim(),
    )
    expect(labels).toEqual([
      'None',
      'Customer, ascending',
      'Customer, descending',
      'Due, ascending',
      'Due, descending',
    ])
    panel.shadowRoot?.querySelector<HTMLInputElement>('input[value="customer:desc"]')?.click()
    await settle(panel, table)
    expect(table.view.sort).toBe('customer:desc')
  })

  test('resets the search, the filters, and the sort, and Show closes the drawer', async () => {
    const { drawer, panel, table } = await page()
    table.requestView({ query: 'a', sort: 'due:asc' })
    await settle(panel, table)
    part(panel, 'reset').click()
    expect(table.view).toMatchObject({ filters: [], query: '', sort: '' })
    part(panel, 'show').click()
    expect(drawer.open).toBe(false)
  })
})
