import { describe, expect, test } from 'bun:test'
import { canReach, progressOf, type ReachableStep } from './reach.js'

const step = (complete = false, optional = false): ReachableStep => ({ complete, optional })

describe('canReach', () => {
  test('back and staying put are always allowed', () => {
    const steps = [step(), step(), step()]
    expect(canReach(steps, 2, 0)).toBe(true)
    expect(canReach(steps, 1, 1)).toBe(true)
  })

  test('forward passes only finished or optional stages', () => {
    expect(canReach([step(true), step(), step()], 0, 1)).toBe(true)
    expect(canReach([step(true), step(), step()], 0, 2)).toBe(false)
    expect(canReach([step(true), step(false, true), step()], 0, 2)).toBe(true)
    expect(canReach([step(), step(), step()], 0, 1)).toBe(false)
  })
})

describe('progressOf', () => {
  test('is the share of stages complete, as a whole percentage', () => {
    expect(progressOf([])).toBe(0)
    expect(progressOf([step(true), step(), step()])).toBe(33)
    expect(progressOf([step(true), step(true)])).toBe(100)
  })
})
