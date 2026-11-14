/**
 * The rows a phone's graph draws: the list's notes, windowed as the web's
 * list draws only the rows in view, and the legend's groups, each in the
 * color its notes are drawn in.
 */
import {
  type Entry,
  type GraphGroupEntry,
  nameOf,
  type Relation,
} from '@fusion.dev/helix-core/graph'
import type { Theme } from '../theme/theme'
import { colorOf } from './heatmap-cells'
import type { DrawnRow, WindowDrawing } from './window'

/** How many series colors the legend hands out, as the web's swatches cycle. */
const SERIES = 24

/** One row of the list, as the tree's `entry.x` reads it. */
export interface NoteRow extends DrawnRow {
  readonly cursor: boolean
  readonly linked: boolean
  readonly name: string
  readonly relation: string
  readonly selected: boolean
  readonly unrelated: boolean
}

/** The list's rows, each a note and how it stands to the selected one. */
export const noteRows = (
  entries: readonly Entry[],
  relationOf: (relation: Relation | undefined) => string,
): NoteRow[] =>
  entries.map((entry, at) => {
    const relation = relationOf(entry.relation)
    return {
      at,
      cursor: false,
      header: false,
      key: entry.node.id,
      linked: entry.relation !== undefined && entry.relation !== 'selected',
      name: nameOf(entry.node),
      relation,
      selected: entry.relation === 'selected',
      unrelated: relation === '',
    }
  })

/** The list's rows drawn through the window: one line each, in a list the page scrolls apart from. */
export const notesDrawing = (rows: readonly NoteRow[]): WindowDrawing => ({
  across: 1,
  gap: 0,
  horizontal: false,
  laid: () => undefined,
  listRef: () => undefined,
  measured: () => undefined,
  moved: () => undefined,
  rows,
})

/**
 * A group's mark color, as the web's swatch takes it: the group's place among
 * the groups' names picks a series color, the first eight taking the second
 * eight's in dark, as the web's `light-dark()` swaps them.
 */
const swatchOf = (at: number, theme: Theme): string => {
  const place = (at % SERIES) + 1
  const dark = theme.mode === 'dark' && place <= 8
  return colorOf(theme, `color-series-${dark ? place + 8 : place}`)
}

/** A tone's mark color, as the web's swatch takes it. */
const toneOf = (tone: string, theme: Theme): string =>
  colorOf(
    theme,
    tone === 'neutral'
      ? 'color-foreground-muted'
      : tone === 'warning'
        ? 'color-warning-mark'
        : `color-${tone}`,
  )

/** The legend's groups, each shown or hidden, in its color. */
export const groupRows = (
  groups: readonly GraphGroupEntry[],
  hidden: readonly string[],
  theme: Theme,
) =>
  groups.map(({ name, tone }, at) => {
    const off = hidden.includes(name)
    const swatch = tone === undefined ? swatchOf(at, theme) : toneOf(tone, theme)
    return {
      fill: off ? 'transparent' : swatch,
      hidden: off,
      key: name,
      name,
      shown: !off,
      swatch,
      tone: tone ?? '',
    }
  })
