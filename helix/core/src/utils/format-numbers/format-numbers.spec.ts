import { describe, expect, test } from 'bun:test'
import { formatNumbers } from './format-numbers.js'

/**
 * A cache, which is the whole of what this is, so what is worth asserting is
 * that it caches and that the key is the locale.
 *
 * `Intl.NumberFormat` is expensive to build and cheap to call, and a pagination
 * renders its count on every update, so a formatter per render is the component's
 * whole cost. Three files in one family had each worked that out and kept their
 * own two-line cache.
 */
describe('a formatter for a locale', () => {
  test('formats in that locale, which is the thing it is for', () => {
    expect(formatNumbers('en-US')(1234567)).toBe('1,234,567')
    expect(formatNumbers('de-DE')(1234567)).toBe('1.234.567')
  })

  /* Shared across components rather than held per instance: a table of a
     hundred rows asking for the same locale gets one object, which is what a
     cache is for and what a private field per element cannot do. */
  test('is built once per locale and handed out again', () => {
    const held = new Set<string>()
    for (let at = 0; at < 50; at += 1) {
      held.add(String(formatNumbers('en-US')(at)))
    }
    expect(held.size).toBe(50)
    // The observable half of the cache: the same locale answers identically
    // however many times it is asked, including across callers.
    expect(formatNumbers('en-US')(1000)).toBe(formatNumbers('en-US')(1000))
  })

  /* An empty string means the runtime's own, which is what every caller was
     already passing `|| undefined` to say. */
  test('an empty locale is the runtime’s, not an error and not a literal empty', () => {
    expect(() => formatNumbers('')(42)).not.toThrow()
    expect(formatNumbers('')(42)).toBe(new Intl.NumberFormat(undefined).format(42))
  })

  test('two locales do not share one formatter', () => {
    expect(formatNumbers('en-US')(1234)).not.toBe(formatNumbers('de-DE')(1234))
  })
})
