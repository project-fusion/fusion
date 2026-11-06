import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount as mountMarkup, registerDom } from '@fusion.dev/helix-testing/dom'
import type { DataTableView, PartialView } from '../view.js'

/* The view: the query, the filters, the sort, the columns and the page size as
   one value, which the parts it was before still feed. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

interface Table extends HTMLElement {
  filter: string
  hideColumn: (field: string) => boolean
  matched: number
  pageSize: number
  requestView: (next: PartialView) => boolean
  rows: readonly Record<string, unknown>[]
  search: (query: string) => boolean
  sort: string
  toggleSort: (field: string) => boolean
  updateComplete: Promise<unknown>
  view: DataTableView
}

const ROWS = [
  { name: 'alpha', size: 30, status: 'open' },
  { name: 'bravo', size: 4, status: 'closed' },
  { name: 'charlie', size: 12, status: 'pending' },
]

const table = async (attrs = ''): Promise<Table> => {
  const element = (await mountMarkup(`<helix-headless-data-table ${attrs} label="Tickets">
    <helix-headless-table-column field="name" sortable>Name</helix-headless-table-column>
    <helix-headless-table-column field="size" type="number">Size</helix-headless-table-column>
    <helix-headless-table-column field="status" type="enum">Status</helix-headless-table-column>
  </helix-headless-data-table>`)) as Table
  element.rows = ROWS
  await settle(element)
  return element
}

const settle = async (element: Table): Promise<void> => {
  for (let turn = 0; turn < 3; turn += 1) {
    await element.updateComplete
    await new Promise((resolve) => setTimeout(resolve))
  }
}

const names = (element: Table): string[] =>
  [...(element.shadowRoot?.querySelectorAll('[part~="row"]') ?? [])].map(
    (row) => row.querySelector('[part~="cell"]')?.textContent?.trim() ?? '',
  )

describe('the view', () => {
  test('holds what the parts it is made of hold', async () => {
    const element = await table('sort="name:desc" page-size="2" filter="a"')
    expect(element.view).toMatchObject({ pageSize: 2, query: 'a', sort: 'name:desc' })
    expect(element.view.columns.hidden).toEqual([])
  })

  test('set, puts each part in force and fires nothing', async () => {
    const element = await table()
    let heard = 0
    element.addEventListener('helix-view-change', () => (heard += 1))
    element.view = {
      columns: { hidden: ['size'], order: ['status', 'name', 'size'], pinned: {}, widths: {} },
      filters: [],
      pageSize: 0,
      query: '',
      sort: 'name:desc',
    }
    await settle(element)
    expect(element.sort).toBe('name:desc')
    expect(element.querySelector('[field="size"]')?.hasAttribute('hidden')).toBe(true)
    expect(names(element)).toEqual(['pending', 'closed', 'open'])
    expect(heard).toBe(0)
  })

  test('round-trips as JSON', async () => {
    const element = await table()
    element.requestView({
      filters: [{ field: 'status', operator: 'any', values: ['open'] }],
      sort: 'size:asc',
    })
    await settle(element)
    const again = await table()
    again.view = JSON.parse(JSON.stringify(element.view))
    await settle(again)
    expect(again.view).toEqual(element.view)
  })

  test('reads JSON written as an attribute', async () => {
    const element = await table(`view='{"sort":"size:asc","query":"r"}'`)
    expect(element.sort).toBe('size:asc')
    expect(element.filter).toBe('r')
  })

  test('applies the filters before the search and the sort', async () => {
    const element = await table()
    element.requestView({ filters: [{ field: 'status', operator: 'not', values: ['closed'] }] })
    await settle(element)
    expect(element.matched).toBe(2)
    expect(names(element)).toEqual(['alpha', 'charlie'])
  })
})

describe('a change to the view', () => {
  test('asks first with the whole view it would leave, then says so', async () => {
    const element = await table()
    const heard: string[] = []
    element.addEventListener('helix-before-view-change', (event) =>
      heard.push(`before ${event.detail.view.sort}`),
    )
    element.addEventListener('helix-before-sort', () => heard.push('before-sort'))
    element.addEventListener('helix-view-change', (event) =>
      heard.push(`after ${event.detail.view.sort}`),
    )
    element.toggleSort('name')
    expect(heard).toEqual(['before name:asc', 'before-sort', 'after name:asc'])
  })

  test('refused, keeps the view, as a server that fetches the rows does', async () => {
    const element = await table()
    element.addEventListener('helix-before-view-change', (event) => event.preventDefault())
    expect(element.search('alpha')).toBe(false)
    expect(element.requestView({ sort: 'size:asc' })).toBe(false)
    expect(element.filter).toBe('')
    expect(element.sort).toBe('')
  })

  test('from hiding a column carries the column as hidden', async () => {
    const element = await table()
    let hidden: string[] = []
    element.addEventListener(
      'helix-view-change',
      (event) => (hidden = event.detail.view.columns.hidden),
    )
    element.hideColumn('size')
    expect(hidden).toEqual(['size'])
  })

  test('that changes nothing fires nothing', async () => {
    const element = await table('sort="name:asc"')
    let heard = 0
    element.addEventListener('helix-before-view-change', () => (heard += 1))
    expect(element.requestView({ sort: 'name:asc' })).toBe(false)
    expect(heard).toBe(0)
  })
})
