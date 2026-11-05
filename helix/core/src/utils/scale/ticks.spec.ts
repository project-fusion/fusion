import { describe, expect, test } from 'bun:test'
import { headroom, ticks } from './ticks.js'

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

  test('a top on a level keeps its rule, which summed steps lost', () => {
    expect(ticks([0, 1.2])).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1, 1.2])
  })
})

describe('headroom', () => {
  test('raises the top to a level clear of the highest reading', () => {
    /* 1,410 was drawn on the top edge with 1,400 the highest rule under it. */
    expect(headroom([1180, 1410])).toEqual([1150, 1450])
    expect(ticks(headroom([1180, 1410])).at(-1)).toBe(1450)
  })

  test('lowers the floor to a level clear of the lowest reading', () => {
    /* 1,180 was drawn on the bottom edge with 1,200 the lowest rule over it,
       and a diverging bar of -14,000 ran past the last rule, -10,000. */
    expect(ticks(headroom([1180, 1410]))[0]).toBe(1150)
    const [floor] = headroom([-14_000, 12_000])
    expect(floor).toBeLessThan(-14_000)
    expect(ticks(headroom([-14_000, 12_000]))[0]).toBe(floor)
    /* And no further than the next level: a twentieth of the span took it to
       -20,000, a third of the plot under the lowest bar. */
    expect(headroom([-14_000, 12_000])).toEqual([-15_000, 15_000])
  })

  test('a floor of zero stays, and a floor above zero is lowered no further than zero', () => {
    expect(headroom([0, 1000])[0]).toBe(0)
    expect(headroom([3, 100])[0]).toBe(0)
  })

  test('a peak exactly on a level takes the next one', () => {
    expect(headroom([0, 1000])).toEqual([0, 1200])
  })

  test('works the step out again when raising the top widens it', () => {
    /* 0 to 147 rules every 20 and 0 to 160 every 50, so 160 would be off the
       scale. 150 is on it. */
    expect(headroom([0, 140])).toEqual([0, 150])
    expect(ticks(headroom([0, 140])).at(-1)).toBe(150)
  })

  test('tenths stay tenths', () => {
    expect(headroom([0, 0.93])).toEqual([0, 1])
  })

  test('a top at zero stays, and a flat domain is left alone', () => {
    expect(headroom([-40, 0])).toEqual([-50, 0])
    expect(headroom([7, 7])).toEqual([7, 7])
  })
})
