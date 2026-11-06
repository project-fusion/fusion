import { describe, expect, test } from 'bun:test'
import {
  emptyView,
  type FilterColumn,
  facetsOf,
  holdsView,
  mergeView,
  parseView,
  passes,
  passesAll,
  readView,
  sameView,
  viewJson,
} from './view.js'

describe('the view round-trips', () => {
  test('through JSON, unchanged', () => {
    const view = mergeView(emptyView(), {
      columns: {
        hidden: ['size'],
        order: ['name', 'size'],
        pinned: { name: 'start' },
        widths: { name: '12rem' },
      },
      filters: [{ field: 'status', operator: 'any', values: ['open', 'pending'] }],
      pageSize: 20,
      query: 'refund',
      sort: 'name:asc',
    })
    expect(parseView(viewJson(view))).toEqual(view)
    expect(sameView(parseView(viewJson(view)), view)).toBe(true)
  })

  test('writes equal views as the same text, whatever order the keys came in', () => {
    const a = mergeView(emptyView(), { columns: { pinned: { a: 'start', b: 'end' } } })
    const b = mergeView(emptyView(), { columns: { pinned: { a: 'start', b: 'end' } } })
    b.columns.pinned = { a: 'start', b: 'end' }
    expect(viewJson(a)).toBe(viewJson(b))
  })

  test('reads text that is not JSON as nothing changed', () => {
    expect(parseView('{nope')).toEqual(emptyView())
  })

  test('leaves out what is not part of a view', () => {
    const view = readView({
      columns: { pinned: { name: 'middle', size: 'end' } },
      extra: true,
      filters: [{ field: '' }, { field: 'a', values: ['x', 3] }],
      pageSize: -2,
    })
    expect(view.columns.pinned).toEqual({ size: 'end' })
    expect(view.filters).toEqual([{ field: 'a', operator: '', values: ['x'] }])
    expect(view.pageSize).toBe(0)
  })
})

describe('a partial view', () => {
  test('replaces each part it names, whole', () => {
    const base = mergeView(emptyView(), {
      filters: [{ field: 'a', operator: 'any', values: ['1'] }],
      sort: 'a:asc',
    })
    const next = mergeView(base, { filters: [] })
    expect(next.filters).toEqual([])
    expect(next.sort).toBe('a:asc')
  })

  test('is held when the view already says what it says', () => {
    const view = mergeView(emptyView(), { query: 'x', sort: 'a:asc' })
    expect(holdsView(view, { sort: 'a:asc' })).toBe(true)
    expect(holdsView(view, { sort: 'a:desc' })).toBe(false)
  })
})

describe('a filter', () => {
  test('compares text ignoring case and accents', () => {
    expect(passes('Café', 'text', { field: 'f', operator: 'is', values: ['cafe'] })).toBe(true)
    expect(
      passes('Café au lait', 'text', { field: 'f', operator: 'contains', values: ['AU'] }),
    ).toBe(true)
    expect(passes('Tea', 'text', { field: 'f', operator: 'not', values: ['tea'] })).toBe(false)
  })

  test('compares numbers as numbers', () => {
    expect(passes(12, 'number', { field: 'f', operator: 'gt', values: ['9'] })).toBe(true)
    expect(
      passes('1,200', 'number', { field: 'f', operator: 'between', values: ['1000', '2000'] }),
    ).toBe(true)
    expect(passes(5, 'number', { field: 'f', operator: 'le', values: ['4'] })).toBe(false)
  })

  test('compares dates by the day', () => {
    const filter = { field: 'f', operator: 'on', values: ['2026-11-06'] }
    expect(passes('2026-11-06T18:00:00Z', 'date', filter)).toBe(true)
    expect(passes('2026-11-05', 'date', { ...filter, operator: 'before' })).toBe(true)
  })

  test('matches an empty value for empty', () => {
    expect(passes('  ', 'text', { field: 'f', operator: 'empty', values: [] })).toBe(true)
    expect(passes(0, 'number', { field: 'f', operator: 'empty', values: [] })).toBe(false)
  })

  test('without a value matches every row', () => {
    expect(passes('x', 'enum', { field: 'f', operator: 'any', values: [] })).toBe(true)
    expect(passes(3, 'number', { field: 'f', operator: 'gt', values: [''] })).toBe(true)
  })

  test('reads a boolean', () => {
    expect(passes(true, 'boolean', { field: 'f', operator: 'is', values: ['true'] })).toBe(true)
    expect(passes(false, 'boolean', { field: 'f', operator: 'is', values: ['true'] })).toBe(false)
  })
})

describe('filters together', () => {
  const columns = new Map<string, FilterColumn>([
    ['status', { field: 'status', type: 'enum', value: (row) => row.status }],
    ['owner', { field: 'owner', type: 'text', value: (row) => row.owner }],
  ])
  const rows = [
    { owner: 'Ada', status: 'open' },
    { owner: 'Ada', status: 'closed' },
    { owner: 'Lin', status: 'pending' },
  ]

  test('match all across columns and any within one', () => {
    const filters = [
      { field: 'status', operator: 'any', values: ['open', 'pending'] },
      { field: 'owner', operator: 'is', values: ['ada'] },
    ]
    expect(rows.filter((row) => passesAll(row, filters, columns))).toEqual(rows.slice(0, 1))
  })

  test('leave out a filter on a field no column declares', () => {
    const filters = [{ field: 'gone', operator: 'is', values: ['x'] }]
    expect(rows.filter((row) => passesAll(row, filters, columns))).toHaveLength(3)
  })
})

test('facets count each value, most first', () => {
  const rows = [{ s: 'b' }, { s: 'a' }, { s: 'b' }, { s: '' }, { s: 'c' }]
  expect(facetsOf(rows, (row) => row.s)).toEqual([
    { count: 2, value: 'b' },
    { count: 1, value: 'a' },
    { count: 1, value: 'c' },
  ])
})
