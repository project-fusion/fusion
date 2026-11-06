/**
 * A heatmap's cells on a phone, as core lays them out for the web's element:
 * each row's reading and tone, how many whole columns fit, where each cell
 * stands, and the color it is painted.
 *
 * **Core decides, and this paints.** `heatmapTone` gives a reading its tone
 * from its own `data-tone` or the thresholds, `heatmapFits` how many cells
 * fit the strip's width as whole columns, newest kept, and `heatmapCellBox`
 * where each cell stands. The tones are the theme's colors, the numbered ones
 * a ramp of the primary's active weight walked toward the sunken surface at
 * the web's fixed shares, and emphasis and material are mixed in here, since
 * a phone mixes no color at a share a custom property computes.
 */

import {
  type HeatmapReading,
  heatmapCellBox,
  heatmapTone,
  type Row,
  writtenList,
  writtenNumbers,
} from '@fusion.dev/helix-core/chart'
import { showsSeries } from '../render/chart-sources'
import { mix } from '../style/color'
import type { Theme } from '../theme/theme'
import { columnName, plottedOf } from './axis-chart'

/** The theme's token for each tone a cell can name, as the web's `--heatmap-tone-*` rest at. */
const TONES: Readonly<Record<string, string>> = {
  accent: 'color-accent',
  danger: 'color-danger',
  info: 'color-info',
  muted: 'color-surface-sunken',
  primary: 'color-primary',
  success: 'color-success',
  warning: 'color-warning',
}

/** A color of the theme. */
const colorOf = (theme: Theme, token: string): string =>
  String(theme.tokens[token] ?? 'transparent')

/**
 * A tone's color: a token for a named tone, a step of the ramp for `1` to
 * `5`, and the quiet ground for no tone or one the theme has no color for,
 * as an unset `--heatmap-tone` falls back on the web.
 */
export const toneColor = (theme: Theme, tone: string | undefined): string => {
  const ground = colorOf(theme, 'color-surface-sunken')
  const step = Number(tone)
  if (Number.isInteger(step) && step >= 1 && step <= 5) {
    const top = colorOf(theme, 'color-primary-active')
    return step === 5 ? top : mix(top, step * 20, ground)
  }
  const token = tone === undefined ? undefined : TONES[tone]
  return token === undefined ? ground : colorOf(theme, token)
}

/** A length of the theme in points, from a number, a `px`, or a `rem` length. */
export const lengthOf = (theme: Theme, token: string, fallback: number): number => {
  const written = String(theme.tokens[token] ?? fallback)
  const value = Number.parseFloat(written)
  if (!Number.isFinite(value)) {
    return fallback
  }
  return written.endsWith('rem') ? value * theme.spaceRem : value
}

/** The strip's lengths in points: a cell's width and height, and the gap between cells. */
export interface Lengths {
  readonly cell: number
  readonly gap: number
  readonly height: number
}

/** The lengths the style's hooks rest at: a cell of `0.75rem` and a gap of `space-2xs`. */
export const lengthsOf = (theme: Theme): Lengths => {
  const cell = 0.75 * theme.spaceRem
  return { cell, gap: lengthOf(theme, 'space-2xs', 4), height: cell }
}

/** The readings a strip draws from: the table's rows, and one reading a row from its first series. */
export interface Points {
  readonly column: number
  readonly readings: readonly HeatmapReading[]
  readonly rows: readonly Row[]
}

/**
 * A reading for every row, a blank row a cell with no reading, from the
 * first column of numbers a legend has not hid, as the web's first series.
 */
export const pointsOf = (rows: readonly Row[], hidden: ReadonlySet<string>): Points => {
  const column = plottedOf(rows).find((one) => showsSeries(hidden, columnName(rows, one))) ?? -1
  const readings = rows.map((row) => {
    const cell = row.cells[column]
    return cell?.value === undefined
      ? { value: undefined }
      : { value: cell.value, ...(cell.tone ? { tone: cell.tone } : {}) }
  })
  return { column, readings, rows }
}

/** How strongly the cells are drawn, as the styled tier's `emphasis` and `material` ask. */
export interface Treatment {
  readonly emphasis: string
  readonly material: string
}

/** What a cell's paint comes through as: all of it, or a share under `glass` and `frosted`. */
const throughOf = (theme: Theme, material: string): number => {
  const opacity = Number(theme.tokens['material-opacity'] ?? 1)
  return material === 'glass' ? 0.62 * opacity : material === 'frosted' ? 0.88 * opacity : 1
}

/** A cell's fill and its edge: the paint, faded toward the page under `outlined`, washed under `subtle`. */
const paintOf = (theme: Theme, paint: string, treatment: Treatment) => {
  const through = throughOf(theme, treatment.material)
  const { emphasis } = treatment
  const fill = emphasis === 'outlined' ? mix(paint, 60, colorOf(theme, 'color-background')) : paint
  const area = emphasis === 'subtle' ? 0.2 : 1
  const edged = emphasis === 'outlined' || emphasis === 'subtle'
  return {
    fill: mix(fill, area * through * 100, 'transparent'),
    ring: edged ? mix(paint, through * 100, 'transparent') : 'transparent',
  }
}

/** What the strip reads of its props to tone and place its cells. */
export interface Asked {
  readonly rows: number
  readonly thresholds: unknown
  readonly tones: unknown
  readonly treatment: Treatment
}

/** Words a prop holds, or none. */
const wordsOf = (value: unknown): string => (typeof value === 'string' ? value : '')

/**
 * Each cell drawn, as the tree draws it: its place in points, its tone, its
 * fill and edge, and whether `chosen` says it is selected.
 */
export const cellsOf = (
  drawn: readonly HeatmapReading[],
  asked: Asked,
  lengths: Lengths,
  theme: Theme,
  chosen: (index: number) => boolean,
) => {
  const bounds = writtenNumbers(wordsOf(asked.thresholds))
  const palette = writtenList(wordsOf(asked.tones))
  return drawn.map((reading, index) => {
    const tone = heatmapTone(reading, bounds, palette)
    const box = heatmapCellBox(index, asked.rows, lengths.cell, lengths.gap, lengths.height)
    return {
      ...paintOf(theme, toneColor(theme, tone), asked.treatment),
      index: String(index),
      key: String(index),
      selected: chosen(index),
      tone: tone ?? '',
      x: `${box.x}px`,
      y: `${box.y}px`,
    }
  })
}

/** A cell as the tree draws it. */
export type Cell = ReturnType<typeof cellsOf>[number]

/**
 * The strip's size in points: as many columns as it draws, and `rows` cells
 * tall whatever it holds, as the web's grid lays its rows out before a cell
 * stands in them.
 */
export const stripSize = (count: number, rows: number, lengths: Lengths) => {
  const columns = Math.ceil(count / rows)
  return {
    height: rows * lengths.height + (rows - 1) * lengths.gap,
    width: columns > 0 ? columns * lengths.cell + (columns - 1) * lengths.gap : 0,
  }
}
