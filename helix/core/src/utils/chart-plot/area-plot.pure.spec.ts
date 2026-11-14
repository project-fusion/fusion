import { describe, expect, test } from 'bun:test'
import type { Row } from '../read-series/read-series.js'
import {
  areaBand,
  areaDomain,
  areaStack,
  areaTallied,
  areaTipY,
  latestShares,
} from './area-plot.js'
import { axisScales } from './line-plot.js'

const row = (label: string, ...values: (number | undefined)[]): Row => ({
  cells: values.map((value, at) =>
    value === undefined
      ? { name: `P${at}`, text: '' }
      : { name: `P${at}`, text: String(value), value },
  ),
  label,
})

const rows = [row('Jan', 10, 30), row('Feb', 20, undefined), row('Mar', -5, 15)]
const all = () => true
const stacked = { overlap: false, share: false }

describe('an area chart plot', () => {
  test('stacks the parts, a blank and a negative reading drawn as none, and says it saw a negative', () => {
    let negatives = 0
    const stack = areaStack(rows, [0, 1], ['P0', 'P1'], all, stacked, () => {
      negatives += 1
    })
    expect(stack.totals).toEqual([40, 20, 15])
    expect(stack.layers).toEqual([
      [10, 20, 0],
      [40, 20, 15],
    ])
    expect(negatives).toBe(1)
  })

  test('closes a part a legend hid, and draws shares or each part from zero as asked', () => {
    expect(areaStack(rows, [0, 1], ['P0', 'P1'], (name) => name !== 'P0', stacked).totals).toEqual([
      30, 0, 15,
    ])
    expect(
      areaStack(rows, [0, 1], ['P0', 'P1'], all, { overlap: false, share: true }).layers[1],
    ).toEqual([1, 1, 1])
    expect(
      areaStack(rows, [0, 1], ['P0', 'P1'], all, { overlap: true, share: false }).layers[1],
    ).toEqual([30, 0, 15])
  })

  test('ranges from zero to the largest total, the whole share, or the largest part', () => {
    const stack = areaStack(rows, [0, 1], ['P0', 'P1'], all, stacked)
    expect(areaDomain(stack, stacked)).toEqual([0, 40])
    expect(areaDomain(stack, { overlap: false, share: true })).toEqual([0, 1])
    expect(areaDomain(areaStack([], [], [], all, stacked), stacked)).toEqual([0, 1])
  })

  test('draws a band as its edge and its edge closed down to the floor, and stands the bubble over the stack', () => {
    const stack = areaStack(rows, [0, 1], ['P0', 'P1'], all, stacked)
    const scales = axisScales([0, 40], 3)
    const band = areaBand(stack.layers[1] ?? [], scales, 'straight')
    expect(band?.line).toBe('M16.67,0L50,50L83.33,62.5')
    expect(band?.wash.endsWith('L83.33333333333333,100L16.666666666666668,100Z')).toBe(true)
    expect(areaTipY(stack, 1, scales.y)).toBe('50%')
  })

  test('adds the total to each row, and each part its share under share', () => {
    const stack = areaStack(rows, [0, 1], ['P0', 'P1'], all, stacked)
    const percent = new Intl.NumberFormat('en', { maximumFractionDigits: 0, style: 'percent' })
    const tallied = areaTallied(rows, stack, true, 'Total', String, percent)
    expect(tallied[0]?.cells.map((cell) => cell.text)).toEqual(['10 (25%)', '30 (75%)', '40'])
    expect(latestShares(stack, all, percent)).toEqual(['P0 0%', 'P1 100%'])
  })
})
