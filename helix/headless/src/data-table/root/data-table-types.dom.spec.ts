import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount as mountMarkup, registerDom } from '@fusion.dev/helix-testing/dom'
import type { Facet, FilterOperatorInfo, PartialView } from '../view.js'

/* A column's type picks its filter's comparisons, an enum column counts its
   values, and `searchable` narrows what the search reads. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../table/index.js')
})

interface Table extends HTMLElement {
  facetsOf: (field: string) => Facet[]
  matched: number
  operatorsOf: (field: string) => readonly FilterOperatorInfo[]
  requestView: (next: PartialView) => boolean
  rows: readonly Record<string, unknown>[]
  search: (query: string) => boolean
  updateComplete: Promise<unknown>
}

const ROWS = [
  { due: '2026-11-01', id: 'T-ada', name: 'Ada', paid: true, size: 30, status: 'open' },
  { due: '2026-11-09', id: 'T-2', name: 'Lin', paid: false, size: 4, status: 'closed' },
  { due: '2026-12-01', id: 'T-3', name: 'Mae', paid: true, size: 12, status: 'open' },
]

const table = async (search = ''): Promise<Table> => {
  const element = (await mountMarkup(`<helix-headless-data-table label="Tickets">
    <helix-headless-table-column field="id">Id</helix-headless-table-column>
    <helix-headless-table-column field="name" ${search}>Name</helix-headless-table-column>
    <helix-headless-table-column field="size" type="number">Size</helix-headless-table-column>
    <helix-headless-table-column field="due" type="date">Due</helix-headless-table-column>
    <helix-headless-table-column field="status" type="enum" filterable>Status</helix-headless-table-column>
    <helix-headless-table-column field="paid" type="boolean">Paid</helix-headless-table-column>
  </helix-headless-data-table>`)) as Table
  element.rows = ROWS
  await element.updateComplete
  await new Promise((resolve) => setTimeout(resolve))
  return element
}

describe('a column type', () => {
  test('picks the comparisons its filter offers', async () => {
    const element = await table()
    const names = (field: string) => element.operatorsOf(field).map((one) => one.name)
    expect(names('name')).toEqual(['contains', 'is', 'not', 'empty'])
    expect(names('size')).toContain('between')
    expect(names('due')).toEqual(['on', 'before', 'after', 'between', 'empty'])
    expect(names('status')).toEqual(['any', 'none', 'empty'])
    expect(names('paid')).toEqual(['is'])
  })

  test('compares numbers, dates and booleans as what they are', async () => {
    const element = await table()
    element.requestView({ filters: [{ field: 'size', operator: 'gt', values: ['10'] }] })
    expect(element.matched).toBe(2)
    element.requestView({ filters: [{ field: 'due', operator: 'before', values: ['2026-11-10'] }] })
    expect(element.matched).toBe(2)
    element.requestView({ filters: [{ field: 'paid', operator: 'is', values: ['false'] }] })
    expect(element.matched).toBe(1)
  })
})

describe('an enum column', () => {
  test('counts the rows that hold each value', async () => {
    const element = await table()
    expect(element.facetsOf('status')).toEqual([
      { count: 2, value: 'open' },
      { count: 1, value: 'closed' },
    ])
  })

  test('counts against the other filters and the search, not its own', async () => {
    const element = await table()
    element.requestView({
      filters: [
        { field: 'status', operator: 'any', values: ['closed'] },
        { field: 'size', operator: 'gt', values: ['10'] },
      ],
    })
    expect(element.facetsOf('status')).toEqual([{ count: 2, value: 'open' }])
  })
})

describe('searchable', () => {
  test('left off every column, the search reads them all', async () => {
    const element = await table()
    element.search('ada')
    expect(element.matched).toBe(1)
    element.search('T-')
    expect(element.matched).toBe(3)
  })

  test('on a column, the search reads only the columns marked', async () => {
    const element = await table('searchable')
    element.search('T-')
    expect(element.matched).toBe(0)
    element.search('ada')
    expect(element.matched).toBe(1)
  })
})
