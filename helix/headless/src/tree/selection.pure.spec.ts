import { describe, expect, test } from 'bun:test'
import { type CheckableRow, checkedState, pressRow } from './selection.js'

const leaf = (value: string, disabled = false): CheckableRow => ({
  branch: false,
  disabled,
  leaves: [],
  value,
})
const branch = (leaves: string[], value = ''): CheckableRow => ({
  branch: true,
  disabled: false,
  leaves,
  value,
})
const order = ['a', 'b', 'c', 'd']

describe('checkedState', () => {
  test('a leaf is checked by its value', () => {
    expect(checkedState(leaf('a'), new Set(['a']))).toBe(true)
    expect(checkedState(leaf('b'), new Set(['a']))).toBe(false)
  })

  test('a branch is checked, mixed or not by its leaves', () => {
    expect(checkedState(branch(['a', 'b']), new Set(['a', 'b']))).toBe(true)
    expect(checkedState(branch(['a', 'b']), new Set(['b']))).toBe('mixed')
    expect(checkedState(branch(['a', 'b']), new Set(['c']))).toBe(false)
  })

  test('a branch with no leaves is read by its own value', () => {
    expect(checkedState(branch([], 'd'), new Set(['d']))).toBe(true)
  })
})

describe('pressRow', () => {
  test('a leaf comes in and goes out, in tree order', () => {
    expect(pressRow(leaf('c'), ['d', 'a'], order)).toEqual(['a', 'c', 'd'])
    expect(pressRow(leaf('a'), ['a', 'c'], order)).toEqual(['c'])
  })

  test('a branch checks every leaf, and clears them when all are checked', () => {
    expect(pressRow(branch(['a', 'b']), ['b'], order)).toEqual(['a', 'b'])
    expect(pressRow(branch(['a', 'b']), ['a', 'b', 'c'], order)).toEqual(['c'])
  })

  test('a disabled row changes nothing', () => {
    expect(pressRow(leaf('a', true), ['b'], order)).toEqual(['b'])
  })
})
