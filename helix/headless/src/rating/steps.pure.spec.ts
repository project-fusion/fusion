import { describe, expect, test } from 'bun:test'
import { nearestStep } from './steps.js'

describe('the step a score stands at', () => {
  const whole = [1, 2, 3, 4, 5]

  test('is the step itself where the score is on one', () => {
    expect(nearestStep(whole, 3)).toBe(3)
    expect(nearestStep([0.5, 1, 1.5], 1.5)).toBe(1.5)
  })

  test('is the nearest step for a score between two', () => {
    expect(nearestStep(whole, 3.4)).toBe(3)
    expect(nearestStep(whole, 3.6)).toBe(4)
  })

  test('goes to the lower step halfway between, and to the ends outside them', () => {
    expect(nearestStep(whole, 2.5)).toBe(2)
    expect(nearestStep(whole, 0)).toBe(1)
    expect(nearestStep(whole, 9)).toBe(5)
  })

  test('is nothing for a row with no steps', () => {
    expect(nearestStep([], 3)).toBeUndefined()
  })
})
