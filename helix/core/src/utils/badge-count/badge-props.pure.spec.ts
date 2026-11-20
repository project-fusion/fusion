import { describe, expect, test } from 'bun:test'
import {
  badgeIsBlank,
  badgeIsCapped,
  badgeIsDot,
  badgeIsSingle,
  badgeIsUnset,
  badgeSays,
  badgeShows,
} from '../derivations/derivations.js'
import { badgeMark } from './badge-props.js'

describe("a badge's mark from its props", () => {
  test('caps a count past `max`, from numbers or their words', () => {
    expect(badgeMark({ max: 99, value: 120 })).toMatchObject({ capped: true, text: '99+' })
    expect(badgeMark({ max: '9', value: '42' })).toMatchObject({ capped: true, text: '9+' })
    expect(badgeShows({ max: 99, value: 12 })).toBe('12')
  })

  test('writes a count with options, as an object or as JSON, in its locale', () => {
    expect(
      badgeShows({ 'format-options': { notation: 'compact' }, locale: 'en-US', value: 1200 }),
    ).toBe('1.2K')
    expect(
      badgeShows({ 'format-options': '{"useGrouping":true}', locale: 'de', value: 1234 }),
    ).toBe('1.234')
    expect(badgeShows({ 'format-options': '{not json', locale: 'en-US', value: 1234 })).toBe('1234')
  })

  test('is a dot with no value and no icon, and blank at zero', () => {
    expect(badgeIsDot({ value: '' })).toBe(true)
    expect(badgeIsDot({ icon: {}, value: '' })).toBe(false)
    expect(badgeIsUnset({ icon: {}, value: '' })).toBe(true)
    expect(badgeIsBlank({ value: 0 })).toBe(true)
    expect(badgeIsBlank({ value: '' })).toBe(false)
    expect(badgeIsCapped({ value: 3 })).toBe(false)
  })

  test('is a circle round one character', () => {
    expect(badgeIsSingle({ value: 3 })).toBe(true)
    expect(badgeIsSingle({ value: '' })).toBe(true)
    expect(badgeIsSingle({ value: 12 })).toBe(false)
  })

  test('says its label with the count filled, and nothing blank or unnamed', () => {
    expect(badgeSays({ label: '{count} unread', max: 99, value: 120 })).toBe('99+ unread')
    expect(badgeSays({ value: 4 })).toBe('4')
    expect(badgeSays({ label: 'Unread', value: '' })).toBe('Unread')
    expect(badgeSays({ value: '' })).toBe('')
    expect(badgeSays({ label: '{count} unread', value: 0 })).toBe('')
  })
})
