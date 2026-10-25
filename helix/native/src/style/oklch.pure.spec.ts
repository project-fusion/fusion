import { describe, expect, test } from 'bun:test'
import { fromOklch } from './oklch'

describe('an oklch() color on a phone', () => {
  test('is the rgb() of the same color', () => {
    expect(fromOklch('oklch(1 0 0)')).toBe('rgb(255, 255, 255)')
    expect(fromOklch('oklch(0 0 0)')).toBe('rgb(0, 0, 0)')
    expect(fromOklch('oklch(0.628 0.2577 29.23)')).toBe('rgb(255, 0, 0)')
    expect(fromOklch('oklch(62.8% 0.2577 29.23deg / 50%)')).toBe('rgba(255, 0, 0, 0.5)')
  })

  test('leaves any other value as it is', () => {
    expect(fromOklch('#0a84ff')).toBe('#0a84ff')
    expect(fromOklch('8rem')).toBe('8rem')
  })
})
