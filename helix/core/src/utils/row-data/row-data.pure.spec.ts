import { describe, expect, test } from 'bun:test'
import { valueAt } from './row-data.js'

describe('the value at a path in a row', () => {
  test('reads a key, and a path of keys joined by dots', () => {
    const row = { author: { name: 'Ada' }, title: 'Notes' }
    expect(valueAt(row, 'title')).toBe('Notes')
    expect(valueAt(row, 'author.name')).toBe('Ada')
  })

  /* Virtual List read the key whole and Table walked it, so a flat record
     with a dotted key filled a list and left a table's cell empty. */
  test('reads a key that holds a dot whole before reading it as a path', () => {
    expect(valueAt({ v1: { 2: 'deep' }, 'v1.2': 'flat' }, 'v1.2')).toBe('flat')
  })

  test('is undefined where the path leads nowhere, is empty, or the row is no record', () => {
    expect(valueAt({ a: 1 }, 'b')).toBeUndefined()
    expect(valueAt({ a: 1 }, 'a.b')).toBeUndefined()
    expect(valueAt({ '': 1 }, '')).toBeUndefined()
    expect(valueAt('text', 'length')).toBeUndefined()
    expect(valueAt(null, 'a')).toBeUndefined()
  })
})
