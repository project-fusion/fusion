import { describe, expect, test } from 'bun:test'
import { endInSight } from './load-more.js'

describe('whether a set asks for more', () => {
  test('asks within one screen of the end, and not further away', () => {
    expect(endInSight({ askedAt: -1, count: 20, remaining: 300, screen: 300 })).toBe(true)
    expect(endInSight({ askedAt: -1, count: 20, remaining: 0, screen: 300 })).toBe(true)
    expect(endInSight({ askedAt: -1, count: 20, remaining: 301, screen: 300 })).toBe(false)
  })

  test('asks once for each length', () => {
    expect(endInSight({ askedAt: 20, count: 20, remaining: 0, screen: 300 })).toBe(false)
    expect(endInSight({ askedAt: 20, count: 40, remaining: 0, screen: 300 })).toBe(true)
  })

  test('asks nothing of a box with no height or a set with no items', () => {
    expect(endInSight({ askedAt: -1, count: 20, remaining: 0, screen: 0 })).toBe(false)
    expect(endInSight({ askedAt: -1, count: 0, remaining: 0, screen: 300 })).toBe(false)
  })
})
