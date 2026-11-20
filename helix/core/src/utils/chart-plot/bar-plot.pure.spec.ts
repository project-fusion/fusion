import { describe, expect, test } from 'bun:test'
import type { Series } from '../read-series/read-series.js'
import { barDense, barOutline, barPaths, barTip } from './bar-marks.js'
import {
  barBox,
  barColumns,
  barColumnsAt,
  barFrame,
  barLayout,
  barNames,
  barRect,
  barToned,
} from './bar-plot.js'

const series = (name: string, values: (number | undefined)[]): Series => ({
  name,
  points: values.flatMap((value, at) =>
    value === undefined ? [] : [{ at, label: `R${at}`, value }],
  ),
})

const asked = {
  lined: new Set<string>(),
  scaled: new Set<string>(),
  sideways: false,
  stacked: false,
  valueAxis: false,
}
const shows = () => true
const write = (value: number) => String(value)

describe('a bar chart drawn by core', () => {
  test('measures every column from zero, so a negative reading hangs below the baseline', () => {
    const frame = barFrame([series('A', [4, -2, 6])], 3, shows, asked, write)
    expect(frame.domain).toEqual([-2, 6])
    expect(frame.floor).toBe(75)
    expect(frame.z).toBeUndefined()
    expect(frame.widest).toBe(0)
  })

  test('fits a stacked scale to the stacks', () => {
    const both = [series('A', [4, 3]), series('B', [5, 1])]
    expect(barFrame(both, 2, shows, { ...asked, stacked: true }, write).domain).toEqual([0, 9])
  })

  test('gives a series named in `secondary` a scale of its own, both with room above', () => {
    const both = [series('Count', [40, 80]), series('Rate', [0.2, 0.4])]
    const frame = barFrame(both, 2, shows, { ...asked, scaled: barNames('rate') }, write)
    expect(frame.domain).toEqual([0, 100])
    expect(frame.other).toEqual([0, 0.5])
    expect(frame.z?.(0.5)).toBe(0)
    expect(frame.widest).toBeGreaterThan(0)
  })

  test('shares the slot among the columns, a line taking none of it', () => {
    const all = [series('A', [1]), series('B', [2]), series('Line', [3])]
    const columns = barColumns(all, 1, shows, barNames('line'))
    expect(columns.map(({ tone }) => tone)).toEqual([0, 1])
    const layout = barLayout(columns.length, false, 1, 100)
    const first = barBox(layout, 1, 0, 0, (v) => 100 - v * 10)
    const second = barBox(layout, 2, 0, 1, (v) => 100 - v * 10)
    expect(second.across).toBeGreaterThan(first.across + first.thickness)
    expect(barRect(first, false)).toEqual({
      height: first.size,
      width: first.thickness,
      x: first.across,
      y: first.along,
    })
  })

  test('stacks a category, a negative reading below zero, and names its far ends', () => {
    const all = [series('A', [3]), series('B', [-2]), series('C', [4])]
    const columns = barColumns(all, 1, shows, new Set())
    const same = (v: number) => v
    const drawn = barColumnsAt(
      columns,
      0,
      true,
      () => same,
      (value, _depth, tone, _scale, from, end) => ({ end, from, tone, value }),
    )
    expect(drawn).toEqual([
      { end: undefined, from: 0, tone: 0, value: 3 },
      { end: 'negative', from: 0, tone: 1, value: -2 },
      { end: 'positive', from: 3, tone: 2, value: 7 },
    ])
  })

  test('draws columns thinner than a pixel as one path for each series and side of zero', () => {
    const layout = barLayout(1, false, 1000, 50)
    expect(barDense(layout, 1, 1)).toBe(true)
    expect(barDense(barLayout(1, false, 10, 50), 0.1, 1)).toBe(false)
    const paths = barPaths(
      { abreast: 1, count: 1000, pixel: 1, sideways: false, slot: layout.slot },
      (index, add) =>
        add(
          barBox(layout, index % 2 === 0 ? 1 : -1, index, 0, (v) => 50 - v * 10),
          {
            depth: 0,
            ink: undefined,
            sinks: index % 2 === 1,
            tone: 0,
          },
        ),
    )
    expect(paths.map(({ sinks }) => sinks)).toEqual([false, true])
    expect(paths[0]?.d.startsWith('M0,40h1v10h-1z')).toBe(true)
  })

  test('stands the bubble off the far end of the tallest column, and to the side of a bar', () => {
    const reach = (v: number) => 100 - v
    const flat = { mirrored: false, sideways: false, stacked: false }
    expect(barTip([20, 60], flat, reach, 1, 4)).toEqual({ placement: 'top', x: '37.5%', y: '40%' })
    expect(barTip([20, 60], { ...flat, stacked: true }, reach, 0, 4).y).toBe('20%')
    expect(barTip([20], { ...flat, mirrored: true, sideways: true }, (v) => v, 0, 2)).toEqual({
      placement: 'left',
      x: '20%',
      y: '25%',
    })
  })

  test('draws a phone column with its far end rounded and its edge open at its base', () => {
    const box = { across: 10, along: 20, size: 60, thickness: 20 }
    const up = barOutline(box, { end: 'positive', stacked: false }, false, { x: 2, y: 4 })
    expect(up.d).toBe('M10,80L10,24A2,4 0 0 1 12,20L28,20A2,4 0 0 1 30,24L30,80Z')
    expect(up.edge).toBe('M10,80L10,24A2,4 0 0 1 12,20L28,20A2,4 0 0 1 30,24L30,80')
    const down = barOutline(box, { end: 'negative', stacked: false }, false, { x: 2, y: 4 })
    expect(down.d).toBe('M10,20L10,76A2,4 0 0 0 12,80L28,80A2,4 0 0 0 30,76L30,20Z')
    const between = barOutline(box, { end: undefined, stacked: true }, false, { x: 2, y: 4 })
    expect(between.d).toBe('M10,80L10,20L10,20L30,20L30,20L30,80Z')
    const across = barOutline(box, { end: 'positive', stacked: false }, true, { x: 4, y: 2 })
    expect(across.d.startsWith('M20,10L76,10A4,2 0 0 1 80,12')).toBe(true)
  })

  test('takes a tone only where a custom property can carry its name', () => {
    expect(barToned('primary')).toBe('primary')
    expect(barToned('a; color: red')).toBeUndefined()
  })
})
