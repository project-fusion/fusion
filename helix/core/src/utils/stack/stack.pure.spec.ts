import { describe, expect, test } from 'bun:test'
import {
  backOf,
  depthOf,
  enterOf,
  hereOf,
  labelOf,
  pathOf,
  rowsOn,
  type StackTree,
} from './stack.js'

/* Settings > Display > Text size, with About beside Display. */
const parents = new Map<string, string | null>([
  ['settings', null],
  ['help', null],
  ['display', 'settings'],
  ['about', 'settings'],
  ['text', 'display'],
])
const present = new Set(parents.keys())

const tree: StackTree<string> = {
  hasPage: (row) => [...parents.values()].includes(row),
  labelOf: (row) => row.toUpperCase(),
  parentOf: (row) => parents.get(row) ?? null,
  present: (row) => {
    for (let at: string | null = row; at !== null; at = parents.get(at) ?? null) {
      if (!present.has(at)) {
        return false
      }
    }
    return true
  },
  rowsOf: (page) => [...parents].filter(([, parent]) => parent === page).map(([row]) => row),
}

describe('a stack of pages', () => {
  test('reads where it is, how deep, its path, its label, and its rows from the tree', () => {
    expect(depthOf(tree, null)).toBe(0)
    expect(depthOf(tree, 'display')).toBe(2)
    expect(pathOf(tree, 'display')).toEqual(['settings', 'display'])
    expect(labelOf(tree, 'display')).toBe('DISPLAY')
    expect(labelOf(tree, null)).toBe('')
    expect(rowsOn(tree, null)).toEqual(['settings', 'help'])
    expect(rowsOn(tree, 'display')).toEqual(['text'])
  })

  test('enters a row with a page and refuses one without', () => {
    expect(enterOf(tree, 'display')).toBe('display')
    expect(enterOf(tree, 'text')).toBeUndefined()
  })

  test('goes back one level, and reports when it is at the top', () => {
    expect(backOf(tree, 'display')).toEqual({ moved: true, to: 'settings' })
    expect(backOf(tree, 'settings')).toEqual({ moved: true, to: null })
    expect(backOf(tree, null)).toEqual({ moved: false, to: null })
  })

  test('is at the top once the page showing, or a page above it, leaves the tree', () => {
    present.delete('settings')
    expect(hereOf(tree, 'display')).toBeNull()
    expect(depthOf(tree, 'display')).toBe(0)
    expect(backOf(tree, 'display')).toEqual({ moved: false, to: null })
    present.add('settings')
  })
})
