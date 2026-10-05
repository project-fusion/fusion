import { describe, expect, test } from 'bun:test'
import { cleanCode } from './code.js'

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
