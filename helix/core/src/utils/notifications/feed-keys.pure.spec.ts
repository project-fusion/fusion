import { describe, expect, test } from 'bun:test'
import { feedStep } from './feed-keys.js'

describe('the keys a feed takes', () => {
  test('the arrows move a row from a row’s own box', () => {
    expect(feedStep('ArrowDown', 1, 3, true)).toBe(2)
    expect(feedStep('ArrowUp', 1, 3, true)).toBe(0)
  })

  test('Home and End go to the ends', () => {
    expect(feedStep('Home', 2, 3, true)).toBe(0)
    expect(feedStep('End', 0, 3, true)).toBe(2)
  })

  test('from a control inside a row, only PageDown and PageUp are the feed’s', () => {
    expect(feedStep('ArrowDown', 0, 3, false)).toBeUndefined()
    expect(feedStep('End', 0, 3, false)).toBeUndefined()
    expect(feedStep('PageDown', 0, 3, false)).toBe(1)
    expect(feedStep('PageUp', 1, 3, false)).toBe(0)
  })

  test('the answer stays inside the feed', () => {
    expect(feedStep('ArrowDown', 2, 3, true)).toBe(2)
    expect(feedStep('PageUp', 0, 3, false)).toBe(0)
  })

  test('other keys and an empty feed are not taken', () => {
    expect(feedStep('Enter', 0, 3, true)).toBeUndefined()
    expect(feedStep('ArrowDown', 0, 0, true)).toBeUndefined()
  })
})
