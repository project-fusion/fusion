import { describe, expect, test } from 'bun:test'
import { currentTerm, entryFor, suggests } from './suggest.js'

describe('the term at the caret', () => {
  test('is the word being typed, and its value after a colon', () => {
    expect(currentTerm('refund status:ope')).toBe('ope')
    expect(currentTerm('refund tues')).toBe('tues')
    expect(currentTerm('refund ')).toBe('')
    expect(currentTerm('-status:re')).toBe('re')
    expect(currentTerm('status:open tues', 6)).toBe('status')
  })
})

describe('whether a suggestion holds the term', () => {
  test('ignores case and accents, and takes everything for no term', () => {
    expect(suggests('Résolu', 'reso')).toBe(true)
    expect(suggests('Open', 'OP')).toBe(true)
    expect(suggests('Open', 'cl')).toBe(false)
    expect(suggests('Open', '')).toBe(true)
  })
})

describe('what a token sends a form', () => {
  const words = { field: 'status', operator: null, text: ' open ,  pending ', value: null }

  test('is the field and its values, the way the field reads them typed', () => {
    expect(entryFor(words)).toBe('status:open,pending')
    expect(entryFor({ ...words, operator: 'any' })).toBe('status:open,pending')
  })

  test('leads with a minus for the comparison a typed minus asks for', () => {
    expect(entryFor({ ...words, operator: 'none' })).toBe('-status:open,pending')
  })

  test('keeps any other comparison in brackets after the field', () => {
    expect(entryFor({ ...words, field: 'created', operator: 'after', text: '2024' })).toBe(
      'created[after]:2024',
    )
    expect(entryFor({ ...words, operator: 'not' })).toBe('status[not]:open,pending')
  })

  test('is the value as written where there is one, and nothing without a field or values', () => {
    expect(entryFor({ ...words, value: 'saved:mine' })).toBe('saved:mine')
    expect(entryFor({ ...words, field: null })).toBeNull()
    expect(entryFor({ ...words, text: '  ' })).toBeNull()
  })
})
