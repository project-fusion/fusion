/**
 * What a bar chart on a phone draws around its columns: the plot's measured
 * box, the numbers of each scale, the rules, and the names of the
 * categories that fit, along the row under columns or down the column
 * beside bars.
 */

import {
  type BarAsked,
  type BarFrame,
  placeLabels,
  type Row,
  type Series,
  seriesKey,
  ticks,
} from '@fusion.dev/helix-core/chart'
import { useCallback, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import { gridlinesAsked, labelsOf, percent } from './axis-chart'
import type { Color } from './chart-common'

/** What the canvases, the scales, and the names are drawn from, as the props ask. */
export interface Plotted {
  readonly asked: BarAsked
  /** The plot's box in points, as it was last laid out. */
  readonly box: { readonly height: number; readonly width: number }
  readonly gridlines: unknown
  readonly lang: string
  /** The size of the names' type in points. */
  readonly size: number
}

/** The plot's box in points, measured as it is laid out. */
export const useBox = () => {
  const [box, setBox] = useState({ height: 0, width: 0 })
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const height = Math.round(event.nativeEvent.layout.height)
    const width = Math.round(event.nativeEvent.layout.width)
    setBox((was) => (was.height === height && was.width === width ? was : { height, width }))
  }, [])
  return { box, onLayout }
}

/** A name's length in the face the names are set in, near enough: a digit or a lowercase letter is about half its size. */
const lengthOf = (name: string, size: number): number => name.length * size * 0.55

/**
 * The names that fit along the categories: the row under columns, by the
 * plot's width, or down the column beside bars, each name one line tall.
 */
export const labelsAlong = (rows: readonly Row[], plotted: Plotted, count: number) => {
  if (!plotted.asked.sideways) {
    return labelsOf(rows, plotted.box.width, plotted.size, count)
  }
  const { height } = plotted.box
  const line = plotted.size * 1.2
  const placed = placeLabels(
    rows,
    height > 0 ? { gap: plotted.size / 2, length: height, name: () => line } : undefined,
  )
  return {
    at: placed.map((one) => one.at).filter((at) => at < count),
    labels: placed.map((one) => ({
      key: String(one.at),
      size: percent(one.size),
      start: percent(one.start),
      text: rows[one.at]?.label ?? '',
    })),
  }
}

/**
 * The rules `gridlines` asks for, as paths: across the measure at each level
 * of the primary scale, and through the middle of each category whose name is
 * drawn, each turned with `orientation`.
 */
export const gridlinesOf = (
  plotted: Plotted,
  frame: BarFrame,
  named: readonly number[],
  count: number,
) => {
  const asked = gridlinesAsked(plotted.gridlines)
  if (asked === '') {
    return []
  }
  const { sideways } = plotted.asked
  const slot = 100 / Math.max(count, 1)
  const down = asked === 'both' || asked === 'category'
  const across = asked !== 'category'
  const rule = (at: number, measure: boolean) =>
    measure === sideways ? `M${at},0L${at},100` : `M0,${at}L100,${at}`
  return [
    ...(down ? named.map((at) => rule((at + 0.5) * slot, false)) : []),
    ...(across ? ticks(frame.domain).map((level) => rule(frame.y(level), true)) : []),
  ].map((d, key) => ({ d, key: String(key) }))
}

/**
 * The numbers of each scale `value-axis` and `secondary` draw: each level as
 * `write` writes it, where it stands along the measure, and the second
 * scale in the color of the one series on it, with how wide each stands and
 * how wide the names stand beside bars, in points.
 */
export const axesOf = (
  frame: BarFrame,
  drawn: { readonly rows: readonly Row[]; readonly series: readonly Series[] },
  plotted: Plotted,
  colorOf: Color,
  write: (value: number) => string,
) => {
  const { asked, size } = plotted
  const lone = drawn.series.filter((one) => asked.scaled.has(seriesKey(one.name)))
  const tint =
    lone.length === 1 && lone[0] !== undefined ? colorOf(drawn.series.indexOf(lone[0])) : ''
  const axis = (
    which: string,
    domain: readonly [number, number],
    scale: (value: number) => number,
  ) => ({
    key: which,
    ticks: ticks(domain).map((level, key) => ({
      at: percent(scale(level)),
      key: String(key),
      text: write(level),
      which,
    })),
    tint: which === 'secondary' ? tint : '',
    which,
    width: asked.sideways ? '' : `${frame.widest}ch`,
  })
  const list = [
    ...(frame.z !== undefined || asked.valueAxis ? [axis('primary', frame.domain, frame.y)] : []),
    ...(frame.z === undefined ? [] : [axis('secondary', frame.other, frame.z)]),
  ]
  /* A figure is about six tenths of its type, and one more for a sign. */
  const figures = (frame.widest + 1) * 0.6 * size
  const widest = Math.max(0, ...drawn.rows.map((row) => lengthOf(row.label, size)))
  return {
    list,
    measured: {
      'bar-chart-axis-size': figures,
      'bar-chart-labels-size': Math.ceil(widest),
      'bar-chart-other-size': figures,
    },
  }
}
