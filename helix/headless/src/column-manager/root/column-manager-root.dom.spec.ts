import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount as mountMarkup, registerDom } from '@fusion.dev/helix-testing/dom'

/* The column manager writes the bound table's view.columns and nothing else:
   show and hide, move, pin and reset. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../data-table/index.js')
  await import('../../table/index.js')
})

interface Table extends HTMLElement {
  rows: readonly Record<string, unknown>[]
  sort: string
  updateComplete: Promise<unknown>
  view: {
    columns: { hidden: string[]; order: string[]; pinned: Record<string, string> }
    sort: string
  }
}

interface Manager extends HTMLElement {
  updateComplete: Promise<unknown>
}

const page = async (): Promise<{ manager: Manager; table: Table }> => {
  const root = await mountMarkup(`<div>
    <helix-headless-column-manager for="invoices"></helix-headless-column-manager>
    <helix-headless-data-table id="invoices" label="Invoices" sort="id:asc">
      <helix-headless-table-column field="id">Invoice</helix-headless-table-column>
      <helix-headless-table-column field="customer">Customer</helix-headless-table-column>
      <helix-headless-table-column field="amount">Amount</helix-headless-table-column>
      <helix-headless-table-column>Actions</helix-headless-table-column>
    </helix-headless-data-table>
  </div>`)
  const table = root.querySelector('helix-headless-data-table') as Table
  const manager = root.querySelector('helix-headless-column-manager') as Manager
  table.rows = [{ amount: 3, customer: 'Acme', id: 'INV-1' }]
  await settle(manager, table)
  return { manager, table }
}

const settle = async (manager: Manager, table: Table): Promise<void> => {
  for (let turn = 0; turn < 3; turn += 1) {
    await table.updateComplete
    await manager.updateComplete
    await new Promise((resolve) => setTimeout(resolve))
  }
}

const items = (manager: Manager): HTMLElement[] => [
  ...(manager.shadowRoot?.querySelectorAll<HTMLElement>('[part~="item"]') ?? []),
]
const names = (manager: Manager): string[] =>
  items(manager).map((item) => item.querySelector('[part="name"]')?.textContent?.trim() ?? '')
const item = (manager: Manager, field: string): HTMLElement =>
  manager.shadowRoot?.querySelector(`[data-field="${field}"]`) as HTMLElement
const part = (manager: Manager, field: string, name: string): HTMLElement =>
  item(manager, field).querySelector(`[part~="${name}"]`) as HTMLElement

describe('a column manager', () => {
  test('lists the columns with a field, in the order shown', async () => {
    const { manager } = await page()
    expect(names(manager)).toEqual(['Invoice', 'Customer', 'Amount'])
    expect(part(manager, 'id', 'grip').getAttribute('aria-label')).toBe('Move Invoice')
  })

  test('hides a column with its checkbox, and only view.columns changes', async () => {
    const { manager, table } = await page()
    const box = part(manager, 'customer', 'checkbox') as HTMLInputElement
    box.checked = false
    box.dispatchEvent(new Event('change', { bubbles: true }))
    await settle(manager, table)
    expect(table.view.columns.hidden).toEqual(['customer'])
    expect(table.querySelector('[field="customer"]')?.hasAttribute('hidden')).toBe(true)
    expect(table.view.sort).toBe('id:asc')
    expect(item(manager, 'customer').getAttribute('part')).toContain('item-hidden')
  })

  test('keeps the last column showing', async () => {
    const { manager, table } = await page()
    table.view = {
      ...table.view,
      columns: { ...table.view.columns, hidden: ['customer', 'amount'] },
    }
    await settle(manager, table)
    expect((part(manager, 'id', 'checkbox') as HTMLInputElement).disabled).toBe(true)
  })

  test('moves a column with Alt and an arrow, and says where it went', async () => {
    const { manager, table } = await page()
    part(manager, 'id', 'grip').dispatchEvent(
      new KeyboardEvent('keydown', {
        altKey: true,
        bubbles: true,
        composed: true,
        key: 'ArrowDown',
      }),
    )
    await settle(manager, table)
    expect(table.view.columns.order).toEqual(['customer', 'id', 'amount'])
    expect(names(manager)).toEqual(['Customer', 'Invoice', 'Amount'])
    expect(manager.shadowRoot?.querySelector('[part="live"]')?.textContent).toBe(
      'Invoice moved to 2 of 3',
    )
  })

  test('pins a column to the start, then the end, then unpins it', async () => {
    const { manager, table } = await page()
    const pin = () => part(manager, 'amount', 'pin')
    expect(pin().getAttribute('aria-label')).toBe('Pin Amount to the start')
    pin().click()
    await settle(manager, table)
    expect(table.view.columns.pinned).toEqual({ amount: 'start' })
    expect(pin().getAttribute('aria-pressed')).toBe('true')
    expect(part(manager, 'amount', 'note').textContent).toBe('Pinned')
    pin().click()
    await settle(manager, table)
    expect(table.view.columns.pinned).toEqual({ amount: 'end' })
    pin().click()
    await settle(manager, table)
    expect(table.view.columns.pinned).toEqual({})
  })

  test('says which columns the table leaves out at its width', async () => {
    const { manager, table } = await page()
    Object.defineProperty(table, 'droppedFields', { configurable: true, get: () => ['amount'] })
    manager.setAttribute('reset-label', 'Reset columns')
    await settle(manager, table)
    expect(part(manager, 'amount', 'note').textContent).toBe('Hidden at this width')
  })

  test('puts the columns back with Reset', async () => {
    const { manager, table } = await page()
    part(manager, 'id', 'pin').click()
    await settle(manager, table)
    manager.shadowRoot?.querySelector<HTMLElement>('[part="reset"]')?.click()
    await settle(manager, table)
    expect(table.view.columns.pinned).toEqual({})
  })

  test('changes nothing when the table refuses the view', async () => {
    const { manager, table } = await page()
    table.addEventListener('helix-before-view-change', (event) => event.preventDefault())
    part(manager, 'id', 'pin').click()
    await settle(manager, table)
    expect(table.view.columns.pinned).toEqual({})
  })
})
