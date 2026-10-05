import { describe, expect, test } from 'bun:test'
import { stopBefore } from './back.js'

describe('the stop Back goes to', () => {
  test('is the one before', () => {
    expect(stopBefore([undefined, undefined, 'dialog'], 2)).toBe(1)
  })

  test('passes over a wait stop to the stop before it', () => {
    expect(stopBefore([undefined, 'wait', undefined], 2)).toBe(0)
    expect(stopBefore(['dialog', 'wait', 'wait', undefined], 3)).toBe(0)
  })

  test('is nothing from the first stop, or where only wait stops come before', () => {
    expect(stopBefore([undefined, undefined], 0)).toBeUndefined()
    expect(stopBefore(['wait', undefined], 1)).toBeUndefined()
  })

  test('counts from the last stop when the index runs past the end', () => {
    expect(stopBefore([undefined, undefined], 5)).toBe(1)
  })
})
