import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount as mountMarkup, registerDom } from '@fusion.dev/helix-testing/dom'

/* A filter input bound to a data table by `for`: the text searches it, typed
   `field:value` becomes a chip and a filter in its view, and the chips follow
   the view wherever it changes. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../data-table/index.js')
  await import('../../table/index.js')
})

interface Table extends HTMLElement {
  matched: number
  requestView: (next: Record<string, unknown>) => boolean
  rows: readonly Record<string, unknown>[]
  updateComplete: Promise<unknown>
  view: { filters: { field: string; operator: string; values: string[] }[]; query: string }
}

interface Field extends HTMLElement {
  updateComplete: Promise<unknown>
  value: string
}

const ROWS = [
  { name: 'Ada', size: 30, status: 'open' },
  { name: 'Lin', size: 4, status: 'closed' },
  { name: 'Mae', size: 12, status: 'open' },
  { name: 'Ola', size: 7, status: 'pending' },
]

const page = async (): Promise<{ field: Field; table: Table }> => {
  const root = await mountMarkup(`<div>
    <helix-headless-filter-input for="tickets" label="Filter tickets"></helix-headless-filter-input>
    <helix-headless-data-table id="tickets" label="Tickets">
      <helix-headless-table-column field="name">Name</helix-headless-table-column>
      <helix-headless-table-column field="size" type="number" filterable>Size</helix-headless-table-column>
      <helix-headless-table-column field="status" type="enum" filterable>Status</helix-headless-table-column>
    </helix-headless-data-table>
  </div>`)
  const table = root.querySelector('helix-headless-data-table') as Table
  const field = root.querySelector('helix-headless-filter-input') as Field
  table.rows = ROWS
  await settle(field, table)
  return { field, table }
}

const settle = async (field: Field, table: Table): Promise<void> => {
  for (let turn = 0; turn < 3; turn += 1) {
    await field.updateComplete
    await table.updateComplete
    await new Promise((resolve) => setTimeout(resolve))
  }
}

const control = (field: Field): HTMLInputElement =>
  field.shadowRoot?.querySelector('input') as HTMLInputElement

const type = (field: Field, text: string): void => {
  const input = control(field)
  input.value = text
  input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }))
}

const enter = (field: Field): void => {
  control(field).dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'Enter' }),
  )
}

const chips = (field: Field): string[] =>
  [...field.querySelectorAll('helix-headless-filter-chip')].map(
    (chip) => `${chip.getAttribute('name')}=${chip.textContent}`,
  )

describe('a filter input bound to a data table', () => {
  test('searches it as you type', async () => {
    const { field, table } = await page()
    type(field, 'ad')
    await settle(field, table)
    expect(table.view.query).toBe('ad')
    expect(table.matched).toBe(1)
  })

  test('reads a typed field:value into a chip and a filter, and searches the rest', async () => {
    const { field, table } = await page()
    type(field, 'status:open a')
    enter(field)
    await settle(field, table)
    expect(table.view.filters).toEqual([{ field: 'status', operator: 'any', values: ['open'] }])
    expect(table.view.query).toBe('a')
    expect(chips(field)).toEqual(['status=open'])
    expect(table.matched).toBe(2)
  })

  test('ORs the values in one column and ANDs the columns', async () => {
    const { field, table } = await page()
    type(field, 'status:open,pending')
    enter(field)
    await settle(field, table)
    expect(table.matched).toBe(3)
    table.requestView({
      filters: [...table.view.filters, { field: 'size', operator: 'gt', values: ['10'] }],
    })
    await settle(field, table)
    expect(table.matched).toBe(2)
  })

  test('draws the chips from the view when it changes elsewhere', async () => {
    const { field, table } = await page()
    table.requestView({ filters: [{ field: 'status', operator: 'none', values: ['closed'] }] })
    await settle(field, table)
    expect(chips(field)).toEqual(['status=closed'])
    table.requestView({ filters: [] })
    await settle(field, table)
    expect(chips(field)).toEqual([])
  })

  test('takes the filter away when its chip is dismissed', async () => {
    const { field, table } = await page()
    type(field, 'status:open')
    enter(field)
    await settle(field, table)
    field
      .querySelector('helix-headless-filter-chip')
      ?.dispatchEvent(
        new CustomEvent('helix-dismiss', { bubbles: true, cancelable: true, composed: true }),
      )
    await settle(field, table)
    expect(table.view.filters).toEqual([])
    expect(chips(field)).toEqual([])
  })

  test('leaves a column that is not filterable as text', async () => {
    const { field, table } = await page()
    type(field, 'name:Ada')
    enter(field)
    await settle(field, table)
    expect(table.view.filters).toEqual([])
    expect(table.view.query).toBe('name:Ada')
  })
})
