import { describe, expect, test } from 'bun:test'
import { ticks } from './ticks.js'

describe('ticks', () => {
  test('lands on numbers a reader would have picked', () => {
    expect(ticks([0, 1000])).toEqual([0, 200, 400, 600, 800, 1000])
    expect(ticks([0, 12])).toEqual([0, 2, 4, 6, 8, 10, 12])
  })

  /* The count is a target. Forcing it would mean forcing the step, which is the
     thing worth keeping round, so both of the above overshoot five and neither
     is a bug. */
  test('the count is a target and the step is what is kept round', () => {
    expect(ticks([0, 1000], 5)).toHaveLength(6)
    expect(ticks([0, 1000], 2)).toEqual([0, 500, 1000])
  })

  test('anchors to the number line, not to where the data starts', () => {
    /* 1180 to 1410 steps by 50 from 1200, not by 46 from 1180. Two charts over
       different ranges then rule at the same levels and can be compared. */
    expect(ticks([1180, 1410])).toEqual([1200, 1250, 1300, 1350, 1400])
  })

  test('drops what falls outside rather than clamping it', () => {
    expect(ticks([3, 17]).every((one) => one >= 3 && one <= 17)).toBe(true)
  })

  test('a flat domain has no levels to name', () => {
    /* Zero and not one: a rule lying exactly under a flat line is invisible,
       and the line is what a reader would then take for the grid. */
    expect(ticks([7, 7])).toEqual([])
  })

  test('the tenths are tenths, not floating point', () => {
    expect(ticks([0, 1])).toEqual(
      [0, 0.2, 0.4, 0.6000000000000001, 0.8, 1].map((n) => Number(n.toFixed(1))),
    )
    expect(ticks([0, 1]).some((one) => String(one).length > 3)).toBe(false)
  })

  test('negatives cross zero without a gap', () => {
    expect(ticks([-40, 40])).toContain(0)
  })
})
