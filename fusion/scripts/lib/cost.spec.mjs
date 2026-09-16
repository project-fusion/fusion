import { describe, expect, test } from 'bun:test'
import { costOf, costOver, ESTIMATE, MEASURED } from './cost.mjs'

describe('the measured cost', () => {
  test('each check is worth what that check took on a runner', () => {
    for (const [task, measured] of Object.entries(MEASURED.checks)) {
      const seconds = costOf(task, () => 0)
      const total = Object.keys(measured.families).reduce((sum, one) => sum + seconds(one), 0)
      expect(total).toBeCloseTo(measured.runner, 6)
    }
  })

  test('every check measured is a check the planner knows how to estimate', () => {
    for (const task of Object.keys(MEASURED.checks)) {
      expect(ESTIMATE[task]).toBeDefined()
    }
  })

  /* The property the fallback exists for: a family added today is not a family
     weighing nothing, which would land it wherever the tie broke and leave its
     shard short of the work it was sized for. */
  test('a family the measurement never saw is worth what it renders', () => {
    expect(costOf('contrast', () => 4)('nothing-here')).toBeCloseTo(4 * ESTIMATE.contrast.per, 6)
  })

  test('what a check costs over no family is its fixed part', () => {
    expect(costOver('specs', () => 0, [])).toBe(ESTIMATE.specs.fixed)
    expect(costOver('contrast', () => 0, [])).toBe(0)
  })
})
