import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount as mountMarkup, registerDom } from '@fusion.dev/helix-testing/dom'
import type { ExportDetail, ExportOptions } from '../index.js'

/* Export: which rows, columns and values go in, the formats, the request a
   server can take, and Control or Command with C in the grid. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

interface Table extends HTMLElement {
  download: (options?: ExportOptions & { filename?: string }) => boolean
  exportRows: (options?: ExportOptions) => string
  hideColumn: (field: string) => boolean
  rows: readonly Record<string, unknown>[]
  search: (query: string) => boolean
  selected: string
  updateComplete: Promise<unknown>
}

const table = async (): Promise<Table> => {
  const element =
    (await mountMarkup(`<helix-headless-data-table label="Q3 Invoices" row-key="id" selectable>
    <helix-headless-table-column field="id">Invoice</helix-headless-table-column>
    <helix-headless-table-column field="amount" type="number">Amount</helix-headless-table-column>
    <helix-headless-table-column field="note">Note</helix-headless-table-column>
  </helix-headless-data-table>`)) as Table
  const amount = element.querySelector('[field="amount"]') as HTMLElement & { cell: unknown }
  amount.cell = (row: Record<string, unknown>) => `$${row.amount}`
  element.rows = [
    { amount: 5, id: 'A', note: 'first' },
    { amount: 9, id: 'B', note: '=1+1' },
    { amount: 2, id: 'C', note: 'last' },
  ]
  await element.updateComplete
  await new Promise((resolve) => setTimeout(resolve))
  return element
}

describe('an export', () => {
  test('holds the filtered rows, the visible columns, and the values as shown, by default', async () => {
    const element = await table()
    element.search('fir')
    element.hideColumn('note')
    expect(element.exportRows()).toBe('Invoice,Amount\r\nA,$5')
  })

  test('takes every row, every column, and the raw values when asked', async () => {
    const element = await table()
    element.search('a')
    element.hideColumn('note')
    expect(
      element.exportRows({ columns: 'all', rows: 'all', values: 'raw' }).split('\r\n'),
    ).toEqual(['Invoice,Amount,Note', 'A,5,first', "B,9,'=1+1", 'C,2,last'])
  })

  test('takes the selected rows, as TSV or JSON', async () => {
    const element = await table()
    element.selected = 'C,A'
    expect(element.exportRows({ format: 'tsv', rows: 'selected' })).toBe(
      'Invoice\tAmount\tNote\r\nA\t$5\tfirst\r\nC\t$2\tlast',
    )
    expect(
      JSON.parse(element.exportRows({ format: 'json', rows: 'selected', values: 'raw' }))[1],
    ).toEqual({
      amount: 2,
      id: 'C',
      note: 'last',
    })
  })

  test('asks first, with the choices and a file name, so a server can make the file', async () => {
    const element = await table()
    let asked: ExportDetail | undefined
    element.addEventListener('helix-before-export', (event) => {
      asked = event.detail
      event.preventDefault()
    })
    expect(element.download({ format: 'tsv' })).toBe(false)
    expect(asked).toMatchObject({
      count: 3,
      filename: 'q3-invoices.tsv',
      format: 'tsv',
      rows: 'filtered',
    })
  })

  test('as XLSX needs the writer from its own entry', async () => {
    const element = await table()
    expect(element.download({ format: 'xlsx' })).toBe(false)
  })
})

test('Control or Command with C copies the cell that holds focus', async () => {
  const element = await table()
  const written: string[] = []
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (text: string) => written.push(text) },
  })
  const cell = element.shadowRoot?.querySelector<HTMLElement>('[part~="row"] [data-column="2"]')
  cell?.focus()
  cell?.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, composed: true, ctrlKey: true, key: 'c' }),
  )
  element.selected = 'B'
  await element.updateComplete
  cell?.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'c', metaKey: true }),
  )
  expect(written).toEqual(['$5', "Invoice\tAmount\tNote\r\nB\t$9\t'=1+1"])
})
