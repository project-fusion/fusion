import { describe, expect, test } from 'bun:test'
import { hueAt } from './wheel.js'

const box = { height: 200, left: 100, top: 50, width: 200 }

describe('the hue at a point on the wheel', () => {
  test('runs clockwise from the top', () => {
    expect(hueAt(200, 60, box)).toBe(0)
    expect(hueAt(290, 150, box)).toBe(90)
    expect(hueAt(200, 240, box)).toBe(180)
    expect(hueAt(110, 150, box)).toBe(270)
  })

  test('is a whole degree, and never 360', () => {
    expect(hueAt(199.9, 60, box)).toBe(0)
    expect(hueAt(270, 80, box)).toBe(45)
  })
})
