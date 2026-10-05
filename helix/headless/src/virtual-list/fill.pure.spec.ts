import { describe, expect, test } from 'bun:test'
import { textOf, valueAt } from './fill.js'

describe('valueAt', () => {
  test('reads a key, and a path of keys joined by dots', () => {
    const item = { author: { name: 'Ada' }, title: 'Notes' }
    expect(valueAt(item, 'title')).toBe('Notes')
    expect(valueAt(item, 'author.name')).toBe('Ada')
  })

  test('reads a key that holds a dot whole before reading it as a path', () => {
    expect(valueAt({ v1: { 2: 'deep' }, 'v1.2': 'flat' }, 'v1.2')).toBe('flat')
  })

  test('is undefined where the path leads nowhere, or the item is no record', () => {
    expect(valueAt({ a: 1 }, 'b')).toBeUndefined()
    expect(valueAt({ a: 1 }, 'a.b')).toBeUndefined()
    expect(valueAt('text', 'length')).toBeUndefined()
    expect(valueAt(null, 'a')).toBeUndefined()
  })
})

describe('textOf', () => {
  test('writes numbers and booleans as text, and nothing for a missing value', () => {
    expect(textOf(42)).toBe('42')
    expect(textOf(false)).toBe('false')
    expect(textOf(undefined)).toBe('')
    expect(textOf(null)).toBe('')
    expect(textOf({ a: 1 })).toBe('')
  })
})
