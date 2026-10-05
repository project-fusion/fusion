import { describe, expect, test } from 'bun:test'
import { typedMarks } from './marks.js'

describe('typed quotation marks', () => {
  test('are found at either end, in the marks of every language a `<q>` sets', () => {
    for (const text of [
      '"Hello"',
      '“Hello',
      'Hello”',
      '„Hallo“',
      '« Bonjour »',
      '「こんにちは」',
      "'Hi'",
    ]) {
      expect([text, typedMarks(text)]).toEqual([text, true])
    }
  })

  test('and not inside the text, around spaces alone, or in empty text', () => {
    for (const text of ['Hello', 'She said “no” twice', '   ', '', '  Hello  ']) {
      expect([text, typedMarks(text)]).toEqual([text, false])
    }
  })
})
