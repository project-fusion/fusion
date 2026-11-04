import { describe, expect, test } from 'bun:test'
import type { Series } from '../read-series/read-series.js'
import { unbroken } from '../read-series/read-series.js'
import {
  axisScales,
  baselineAt,
  latestReadings,
  latestWords,
  levelRules,
  lineDomain,
  lineEnds,
  lineMarks,
  lineTipAt,
  lineWash,
  seriesRuns,
  shownSlots,
  slotOf,
} from './line-plot.js'

const of = (name: string, values: (number | undefined)[]): Series => ({
  name,
  points: values.flatMap((value, at) =>
    value === undefined ? [] : [{ at, label: `r${at}`, value }],
  ),
})

const all = () => true

describe('a line chart plot', () => {
  test('ranges over the series drawn, with zero in it under zero', () => {
    const series = [of('A', [10, 20]), of('B', [5, 40])]
    expect(lineDomain(series, all, false)).toEqual([5, 40])
    expect(lineDomain(series, (name) => name !== 'B', false)).toEqual([10, 20])
    expect(lineDomain(series, all, true)).toEqual([0, 40])
    expect(lineDomain([], all, false)).toEqual([0, 0])
  })

  test('sits each reading in the middle of its slot', () => {
    const { x, y } = axisScales([0, 10], 4)
    expect([x(0), x(3)]).toEqual([12.5, 87.5])
    expect([y(0), y(10)]).toEqual([100, 0])
    expect(slotOf(1, 4)).toEqual({ width: 25, x: 25 })
  })

  test('draws a path for each unbroken run, and washes each down to the floor', () => {
    const scales = axisScales([0, 10], 3)
    const runs = seriesRuns(unbroken(of('A', [0, 10, undefined])), scales, 'straight', 0)
    expect(runs.map((one) => one.path)).toEqual(['M16.67,100L50,0'])
    expect(lineWash(runs)).toBe('M16.67,100L50,0L50,100L16.666666666666668,100Z')
  })

  test('marks a reading no line reaches always, and every reading under markers', () => {
    const scales = axisScales([0, 10], 4)
    const runs = unbroken(of('A', [0, undefined, 5, 10]))
    expect(lineMarks(runs, scales, false)).toEqual({ lone: 'M12.5,100h0', marks: '' })
    expect(lineMarks(runs, scales, true).marks).toBe('M62.5,50h0M87.5,0h0')
  })

  test('ends each series drawn of two readings or more, with its palette slot', () => {
    const scales = axisScales([0, 10], 2)
    const ends = lineEnds([of('A', [0, 10]), of('B', [5]), of('C', [10, 0])], all, scales)
    expect(ends).toEqual([
      { index: 1, x: 75, y: 0 },
      { index: 3, x: 75, y: 100 },
    ])
  })

  test('rules zero only inside the range, and the levels above a floor', () => {
    const { y } = axisScales([0, 10], 2)
    expect(baselineAt([0, 10], y)).toBe(100)
    expect(baselineAt([5, 10], y)).toBeUndefined()
    expect(levelRules([0, 10], y, 0)).toEqual([80, 60, 40, 20, 0])
    expect(levelRules([0, 10], y)).toHaveLength(6)
  })

  test('stands the bubble over the topmost series at a reading', () => {
    const { y } = axisScales([0, 10], 2)
    const slots = shownSlots([of('A', [2, 4]), of('B', [8, undefined])], all, 2)
    expect(lineTipAt(slots, 0, 2, y)).toEqual({ x: '25%', y: '20%' })
    expect(lineTipAt(slots, 1, 2, y)).toEqual({ x: '75%', y: '60%' })
  })

  test('says each series latest reading, on one row name where they share it', () => {
    const latest = latestReadings([of('A', [1, 2]), of('B', [3])], all, () => undefined)
    expect(latestWords(latest, (items) => items.join(', '))).toBe('r1: A 2; r0: B 3')
    const shared = latestReadings([of('A', [1, 2]), of('B', [3, 4])], all, () => 'x')
    expect(latestWords(shared, (items) => items.join(', '))).toBe('r1: A x, B x')
  })
})
