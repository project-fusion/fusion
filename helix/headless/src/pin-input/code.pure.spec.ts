import { describe, expect, test } from 'bun:test'
import { cleanCode, overwriteCode, readTyped } from './code.js'

describe('the characters a code keeps', () => {
  test('are the digits of a numeric code, trimmed', () => {
    expect(cleanCode(' 12a-34 ', 'numeric')).toBe('1234')
  })

  test('are ASCII letters and digits of an alphanumeric code', () => {
    expect(cleanCode('ab-1é2', 'alphanumeric')).toBe('ab12')
  })

  test('are everything in a text code', () => {
    expect(cleanCode(' ab-1 ', 'text')).toBe('ab-1')
  })

  test('take the case asked for, and keep it as typed by default', () => {
    expect(cleanCode('aB3x', 'alphanumeric', 'upper')).toBe('AB3X')
    expect(cleanCode('aB3x', 'alphanumeric', 'lower')).toBe('ab3x')
    expect(cleanCode('aB3x', 'alphanumeric')).toBe('aB3x')
  })
})

describe('what the field holds after the platform edits it', () => {
  test('is the cleaned code, cut at the last box', () => {
    expect(readTyped('12a34567', 8, 'numeric', 'preserve', 6)).toEqual({ caret: 5, code: '123456' })
  })

  test('with the caret past only the characters kept before it', () => {
    expect(readTyped('1a2', 2, 'numeric', 'preserve', 6)).toEqual({ caret: 1, code: '12' })
    expect(readTyped('124', 2, 'numeric', 'preserve', 6)).toEqual({ caret: 2, code: '124' })
  })

  test('and cased as asked', () => {
    expect(readTyped('ab', 2, 'alphanumeric', 'upper', 4)).toEqual({ caret: 2, code: 'AB' })
  })
})

describe('a run written over the code', () => {
  test('takes the boxes it reaches and leaves the rest', () => {
    expect(overwriteCode('123456', 2, 'AB', 6)).toEqual({ caret: 4, code: '12AB56' })
  })

  test('starts no later than the end of the code', () => {
    expect(overwriteCode('', 3, '482913', 6)).toEqual({ caret: 5, code: '482913' })
    expect(overwriteCode('12', 4, '34', 6)).toEqual({ caret: 4, code: '1234' })
  })

  test('drops what runs past the last box', () => {
    expect(overwriteCode('12', 2, '345678', 4)).toEqual({ caret: 3, code: '1234' })
  })
})
