import { describe, expect, test } from 'bun:test'
import { badgeBlank, badgeCapped, badgeText, badgeWords } from './count.js'

describe('a badge count', () => {
  test('zero is blank, and a dot or a word is not', () => {
    expect(badgeBlank('0')).toBe(true)
    expect(badgeBlank(' 0 ')).toBe(true)
    expect(badgeBlank('')).toBe(false)
    expect(badgeBlank('New')).toBe(false)
    expect(badgeBlank('3')).toBe(false)
  })

  test('is capped past `max`, and never without one or for a word', () => {
    expect(badgeCapped('120', 99)).toBe(true)
    expect(badgeCapped('99', 99)).toBe(false)
    expect(badgeCapped('120', undefined)).toBe(false)
    expect(badgeCapped('New', 99)).toBe(false)
  })

  test('reads the value as given, `{max}+` past the cap', () => {
    expect(badgeText('7', undefined, 'en', undefined)).toBe('7')
    expect(badgeText('New', 9, 'en', undefined)).toBe('New')
    expect(badgeText('120', 99, 'en', undefined)).toBe('99+')
  })

  test('writes a number with the options in the locale, a word as given', () => {
    expect(badgeText('1200', undefined, 'en', { notation: 'compact' })).toBe('1.2K')
    expect(badgeText('1200', 999, 'de', { useGrouping: true })).toBe('999+')
    expect(badgeText('New', undefined, 'en', { notation: 'compact' })).toBe('New')
  })

  test('says the label with the count in it, or the count alone', () => {
    expect(badgeWords('3', '{count} unread', false)).toBe('3 unread')
    expect(badgeWords('3', '', false)).toBe('3')
    expect(badgeWords('', 'Online', false)).toBe('Online')
  })

  test('a label with plural forms picks the form by the count, in the locale', () => {
    const unread =
      '{count, plural, one {{count} nieprzeczytana} few {{count} nieprzeczytane} other {{count} nieprzeczytanych}}'
    expect(badgeWords('1', unread, false, 'pl')).toBe('1 nieprzeczytana')
    expect(badgeWords('3', unread, false, 'pl')).toBe('3 nieprzeczytane')
    expect(badgeWords('5', unread, false, 'pl')).toBe('5 nieprzeczytanych')
    /* A capped count is no number, so it takes the last form, as written. */
    expect(badgeWords('99+', unread, false, 'pl')).toBe('99+ nieprzeczytanych')
  })

  test('says nothing for a blank mark or an unnamed dot', () => {
    expect(badgeWords('0', '{count} unread', true)).toBe('')
    expect(badgeWords('', '', false)).toBe('')
  })
})
