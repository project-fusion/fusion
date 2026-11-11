import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount as mountMarkup, registerDom } from '@fusion.dev/helix-testing/dom'
import type { ExportDetail } from '../../data-table/index.js'
import { toXlsx } from '../../data-table/xlsx/index.js'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../data-table/index.js')
  await import('../../table/index.js')
})

interface Table extends HTMLElement {
  rows: readonly Record<string, unknown>[]
  search: (query: string) => boolean
  selected: string
  updateComplete: Promise<unknown>
  xlsx: unknown
}

interface Panel extends HTMLElement {
  updateComplete: Promise<unknown>
}

const page = async (): Promise<{ panel: Panel; table: Table }> => {
  const root = await mountMarkup(`<div>
    <helix-headless-table-export for="invoices"></helix-headless-table-export>
    <helix-headless-data-table id="invoices" label="Invoices" row-key="id" selectable>
      <helix-headless-table-column field="id">Invoice</helix-headless-table-column>
      <helix-headless-table-column field="amount">Amount</helix-headless-table-column>
      <helix-headless-table-column field="note" hidden>Note</helix-headless-table-column>
    </helix-headless-data-table>
  </div>`)
  const table = root.querySelector('helix-headless-data-table') as Table
  const panel = root.querySelector('helix-headless-table-export') as Panel
  table.rows = [
    { amount: 5, id: 'A', note: 'x' },
    { amount: 9, id: 'B', note: 'y' },
    { amount: 2, id: 'C', note: 'z' },
  ]
  await settle(panel, table)
  return { panel, table }
}

const settle = async (panel: Panel, table: Table): Promise<void> => {
  for (let turn = 0; turn < 3; turn += 1) {
    await table.updateComplete
    await panel.updateComplete
    await new Promise((resolve) => setTimeout(resolve))
  }
}

const choices = (panel: Panel, group: string): string[] =>
  [...(panel.shadowRoot?.querySelectorAll(`[part="${group}"] [part~="choice"]`) ?? [])].map(
    (one) => one.textContent?.trim() ?? '',
  )
const pick = (panel: Panel, group: string, value: string): void => {
  const input = panel.shadowRoot?.querySelector<HTMLInputElement>(
    `[part="${group}"] input[value="${value}"]`,
  )
  input?.click()
}
const button = (panel: Panel, name: string): HTMLButtonElement =>
  panel.shadowRoot?.querySelector(`[part="${name}"]`) as HTMLButtonElement

describe('a table export panel', () => {
  test('counts each choice of rows and columns', async () => {
    const { panel, table } = await page()
    table.search('a')
    await settle(panel, table)
    expect(choices(panel, 'rows')).toEqual(['Filtered (1)', 'All (3)'])
    expect(choices(panel, 'columns')).toEqual(['Visible (2)', 'All (3)'])
    expect(choices(panel, 'format')).toEqual(['CSV', 'TSV', 'JSON'])
    expect(button(panel, 'export').textContent?.trim()).toBe('Export 1 row')
  })

  test('offers the selected rows once some are, and chooses them', async () => {
    const { panel, table } = await page()
    table.selected = 'A,C'
    await settle(panel, table)
    expect(choices(panel, 'rows')[0]).toBe('Selected (2)')
    expect(button(panel, 'export').textContent?.trim()).toBe('Export 2 rows')
  })

  test('asks the table to save the file with the choices made', async () => {
    const { panel, table } = await page()
    let asked: ExportDetail | undefined
    table.addEventListener('helix-before-export', (event) => {
      asked = event.detail
      event.preventDefault()
    })
    pick(panel, 'rows', 'all')
    pick(panel, 'columns', 'all')
    pick(panel, 'values', 'raw')
    pick(panel, 'format', 'json')
    await settle(panel, table)
    button(panel, 'export').click()
    expect(asked).toMatchObject({
      columns: 'all',
      count: 3,
      format: 'json',
      rows: 'all',
      values: 'raw',
    })
  })

  test('offers XLSX where the table has the writer', async () => {
    const { panel, table } = await page()
    table.xlsx = toXlsx
    await settle(panel, table)
    expect(choices(panel, 'format')).toContain('XLSX')
  })

  test('copies the rows as TSV and says so', async () => {
    const { panel, table } = await page()
    const written: string[] = []
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => written.push(text) },
    })
    button(panel, 'copy').click()
    await settle(panel, table)
    expect(written[0]?.split('\r\n')[0]).toBe('Invoice\tAmount')
    expect(panel.shadowRoot?.querySelector('[part="live"]')?.textContent).toBe('3 rows copied')
  })
})
