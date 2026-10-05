import { describe, expect, test } from 'bun:test'
import { currentTerm, suggests } from './suggest.js'

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
