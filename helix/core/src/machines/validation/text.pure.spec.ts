import { describe, expect, test } from 'bun:test'
import { textVerdict } from './text.js'

describe('textVerdict', () => {
  test('empty text fails nothing, whatever its constraint', () => {
    expect(
      textVerdict({ edited: true, minLength: 4, pattern: '[0-9]+', type: 'email', value: '' }),
    ).toEqual({ flags: [], message: '' })
  })

  test('an email or a web address that does not read as one is a type mismatch', () => {
    expect(textVerdict({ edited: true, type: 'email', value: 'ada' }).flags).toEqual([
      'typeMismatch',
    ])
    expect(textVerdict({ edited: true, type: 'email', value: 'ada@example.com' }).flags).toEqual([])
    expect(textVerdict({ edited: true, type: 'url', value: 'example.com' }).message).toBe(
      'Enter a web address.',
    )
    expect(textVerdict({ edited: true, type: 'url', value: 'https://example.com' }).flags).toEqual(
      [],
    )
  })

  test('a pattern matches the whole text, and one that does not compile checks nothing', () => {
    expect(textVerdict({ edited: true, pattern: '[0-9]{3}', value: '1234' }).flags).toEqual([
      'patternMismatch',
    ])
    expect(textVerdict({ edited: true, pattern: '[0-9]{3}', value: '123' }).flags).toEqual([])
    expect(textVerdict({ edited: true, pattern: '(', value: 'x' }).flags).toEqual([])
  })

  test('the length bounds hold only against text the reader typed', () => {
    expect(textVerdict({ edited: true, minLength: 3, value: 'ab' })).toEqual({
      flags: ['tooShort'],
      message: 'Use at least 3 characters.',
    })
    expect(textVerdict({ edited: false, minLength: 3, value: 'ab' }).flags).toEqual([])
    expect(textVerdict({ edited: true, maxLength: 1, value: 'ab' })).toEqual({
      flags: ['tooLong'],
      message: 'Use at most 1 character.',
    })
  })

  test('the type is checked before the pattern, and the pattern before the length', () => {
    expect(
      textVerdict({ edited: true, minLength: 20, pattern: 'x', type: 'email', value: 'ada' }).flags,
    ).toEqual(['typeMismatch'])
    expect(textVerdict({ edited: true, minLength: 20, pattern: 'x', value: 'ada' }).flags).toEqual([
      'patternMismatch',
    ])
  })
})
