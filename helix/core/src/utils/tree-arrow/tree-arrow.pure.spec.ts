import { describe, expect, test } from 'bun:test'
import { treeArrow } from './tree-arrow.js'

describe('the arrow into a tree row', () => {
  test('opens a shut branch, and moves into an open one', () => {
    expect(treeArrow({ branch: true, open: false }, 1)).toBe('open')
    expect(treeArrow({ branch: true, open: true }, 1)).toBe('child')
  })

  test('does nothing on a leaf', () => {
    expect(treeArrow({ branch: false, open: false }, 1)).toBeUndefined()
  })

  test('never opens a disabled branch', () => {
    expect(treeArrow({ branch: true, disabled: true, open: false }, 1)).toBe('child')
  })
})

describe('the arrow out of a tree row', () => {
  test('shuts an open branch, and otherwise moves to the parent', () => {
    expect(treeArrow({ branch: true, open: true }, -1)).toBe('close')
    expect(treeArrow({ branch: true, open: false }, -1)).toBe('parent')
    expect(treeArrow({ branch: false, open: false }, -1)).toBe('parent')
  })

  test('never shuts a disabled branch', () => {
    expect(treeArrow({ branch: true, disabled: true, open: true }, -1)).toBe('parent')
  })
})
