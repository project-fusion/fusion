import { describe, expect, test } from 'bun:test'
import type { DataRow } from './root/order.js'
import { childrenOf, grow } from './tree.js'

const axes = [{ field: 'name', order: (row: DataRow) => row.name }]

const tree: DataRow[] = [
  {
    children: [
      { name: 'zeta.ts' },
      { children: [{ name: 'deep.ts' }], name: 'lib' },
      { name: 'alpha.ts' },
    ],
    name: 'src',
  },
  { name: 'README.md' },
]

const names = (rows: readonly DataRow[]) => rows.map((row) => row.name)

describe('childrenOf', () => {
  test('reads an array from the field, and nothing from anything else', () => {
    expect(childrenOf(tree[0] as DataRow, 'children')).toHaveLength(3)
    expect(childrenOf({ children: 'no' }, 'children')).toEqual([])
    expect(childrenOf({}, 'children')).toEqual([])
  })
})

describe('grow', () => {
  test('shows the top rows, and the children of an open row under it', () => {
    const closed = grow(tree, axes, { field: 'children', isOpen: () => false, query: '', spec: '' })
    expect(names(closed.rows)).toEqual(['src', 'README.md'])
    expect(closed.total).toBe(6)
    const open = grow(tree, axes, {
      field: 'children',
      isOpen: (row) => row.name === 'src',
      query: '',
      spec: '',
    })
    expect(names(open.rows)).toEqual(['src', 'zeta.ts', 'lib', 'alpha.ts', 'README.md'])
    expect(open.placed.get(open.rows[2] as DataRow)).toMatchObject({
      branch: true,
      level: 2,
      open: false,
      position: 2,
      siblings: 3,
    })
  })

  test("sorts each parent's rows among themselves, keeping each under its parent", () => {
    const sorted = grow(tree, axes, {
      field: 'children',
      isOpen: () => true,
      query: '',
      spec: 'name:asc',
    })
    expect(names(sorted.rows)).toEqual([
      'README.md',
      'src',
      'alpha.ts',
      'lib',
      'deep.ts',
      'zeta.ts',
    ])
  })

  test('keeps a match with the rows that lead to it, open', () => {
    const found = grow(tree, axes, {
      field: 'children',
      isOpen: () => false,
      query: 'deep',
      spec: '',
    })
    expect(names(found.rows)).toEqual(['src', 'lib', 'deep.ts'])
    expect(found.placed.get(found.rows[2] as DataRow)?.level).toBe(3)
    expect(found.every).toHaveLength(6)
  })
})
