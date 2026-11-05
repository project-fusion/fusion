import { describe, expect, test } from 'bun:test'
import {
  contrastMessage,
  contrastOf,
  distanceOf,
  oklabOf,
  schemeOf,
  statusMessage,
} from './audit-seed.js'

describe('contrastOf', () => {
  test('black on white is 21', () => {
    expect(contrastOf([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5)
  })

  test('order does not matter', () => {
    expect(contrastOf([255, 240, 0], [255, 255, 255])).toBe(
      contrastOf([255, 255, 255], [255, 240, 0]),
    )
  })

  test('a bright yellow on white falls under a fill floor of 3', () => {
    expect(contrastOf([255, 240, 0], [255, 255, 255])).toBeLessThan(3)
  })
})

describe('contrastMessage', () => {
  test('names only the measure that fails', () => {
    const message = contrastMessage('light', 1.27, 7.24)
    expect(message).toContain('primary text measures 1.27:1')
    expect(message).not.toContain('7.24')
    expect(message).not.toContain('3:1')
  })

  test('names both measures when both fail, in the scheme it measured', () => {
    const message = contrastMessage('dark', 1.11, 2.1)
    expect(message).toContain('In dark, primary text measures 1.11:1')
    expect(message).toContain('In dark, a filled control measures 2.10:1')
  })
})

describe('schemeOf', () => {
  test('names a white page light and a black page dark', () => {
    expect(schemeOf([255, 255, 255])).toBe('light')
    expect(schemeOf([0, 0, 0])).toBe('dark')
  })

  test('names the dark card grounds dark', () => {
    expect(schemeOf([12, 12, 12])).toBe('dark')
    expect(schemeOf([24, 24, 24])).toBe('dark')
  })
})

describe('distanceOf', () => {
  test('a yellow seed primary sits within the collision distance of warning', () => {
    expect(distanceOf([0x7c, 0x61, 0x00], [0x84, 0x55, 0x00])).toBeLessThan(0.08)
  })

  test('ink and a status are far apart', () => {
    expect(distanceOf([0x18, 0x18, 0x18], [0x84, 0x55, 0x00])).toBeGreaterThan(0.08)
  })

  test('white is L 1 and black is L 0', () => {
    expect(oklabOf([255, 255, 255])[0]).toBeCloseTo(1, 3)
    expect(oklabOf([0, 0, 0])[0]).toBeCloseTo(0, 5)
  })
})

describe('statusMessage', () => {
  test('names the scheme, the status, and the distance', () => {
    const message = statusMessage('light', 'warning', 0.035)
    expect(message).toContain('In light, the primary color is 0.035 from the warning color')
  })
})
