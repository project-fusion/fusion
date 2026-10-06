import { describe, expect, test } from 'bun:test'
import { keyOf, textOf, textsOf } from './fill.js'

describe('textOf', () => {
  test('writes numbers and booleans as text, and nothing for a missing value', () => {
    expect(textOf(42)).toBe('42')
    expect(textOf(false)).toBe('false')
    expect(textOf(undefined)).toBe('')
    expect(textOf(null)).toBe('')
    expect(textOf({ a: 1 })).toBe('')
  })
})

describe('keyOf', () => {
  test('reads the key field of an object, a string or number item itself, and the place otherwise', () => {
    expect(keyOf({ id: 7, name: 'Ada' }, 3, 'id')).toBe('7')
    expect(keyOf({ person: { id: 'a' } }, 3, 'person.id')).toBe('a')
    expect(keyOf('Ada', 3, '')).toBe('Ada')
    expect(keyOf(42, 3, 'id')).toBe('42')
    expect(keyOf({ name: 'Ada' }, 3, '')).toBe('3')
  })
})

describe('textsOf', () => {
  test('reads the field of each object, and a string or number item itself', () => {
    expect(textsOf([{ name: 'Ada' }, 'Bea', 3, null], 'name')).toEqual(['Ada', 'Bea', '3', ''])
    expect(textsOf([{ name: 'Ada' }], '')).toEqual([''])
  })
})
