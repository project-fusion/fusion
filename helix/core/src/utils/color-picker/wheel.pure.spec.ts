import { describe, expect, test } from 'bun:test'
import { areaAt, hueAt } from './wheel.js'

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

/* The square's arithmetic was inline in the pointer handler, held only by the
   dom spec. */
describe('areaAt', () => {
  const square = { height: 100, left: 0, top: 0, width: 200 }

  test('brightness falls downward and saturation grows along the line', () => {
    expect(areaAt(0, 0, square, false)).toEqual({ brightness: 100, saturation: 0 })
    expect(areaAt(200, 100, square, false)).toEqual({ brightness: 0, saturation: 100 })
    expect(areaAt(50, 25, square, false)).toEqual({ brightness: 75, saturation: 25 })
  })

  test('grows toward the left on a right-to-left page', () => {
    expect(areaAt(50, 25, square, true)).toEqual({ brightness: 75, saturation: 75 })
  })

  test('holds a point outside the square to its edge', () => {
    expect(areaAt(-40, 300, square, false)).toEqual({ brightness: 0, saturation: 0 })
    expect(areaAt(400, -10, square, false)).toEqual({ brightness: 100, saturation: 100 })
  })
})
