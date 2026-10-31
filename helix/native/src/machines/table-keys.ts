/**
 * The keys of a phone's `grid` table, on a hardware keyboard: one stop among its
 * cells, moved by core's `gridMove`, the same arithmetic the web's controller
 * reads, so a key lands on the same cell on both platforms.
 */

import { environment } from '@fusion.dev/helix-core/capabilities/environment'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { type GridPlace, gridMove, pageRows, type Typeahead } from '@fusion.dev/helix-core/table'

/** What the keys ask of a table. */
export interface GridHost {
  /** Acts on a cell for Enter or Space, and says whether it did. */
  readonly activate: (place: GridPlace, key: string, toggle: boolean) => boolean
  /** Moved to another row with no Shift. */
  readonly arrive: (row: number, toggle: boolean) => void
  /** Right or Left on a disclosure cell: done, a row to move to, or neither. */
  readonly disclose: (row: number, forward: boolean) => boolean | number
  /** How many columns lead the cells. */
  readonly lead: readonly string[]
  /** The last row's place. */
  readonly last: number
  /** Moves the stop, and focus with it. */
  readonly moveTo: (place: GridPlace) => void
  /** How tall the frame the rows scroll in is, in rows. */
  readonly page: number
  /** Selects every row, and says whether it did. */
  readonly selectAll: () => boolean
  /** Selects from the row last chosen to `to`, and says whether the table selects. */
  readonly selectRange: (to: number, from: number) => boolean
  /** The first row: the headings where there are any. */
  readonly top: number
  readonly typeahead: Typeahead
  /** How many columns a row has. */
  readonly widthOf: (row: number) => number
  /** The words a typed letter finds each row by. */
  readonly words: readonly string[]
}

/** What an arrow along the line does, which a right-to-left page swaps. */
const stepOf = (key: string): -1 | 0 | 1 => {
  if (key !== 'ArrowRight' && key !== 'ArrowLeft') {
    return 0
  }
  const rtl = environment().read().direction === 'rtl'
  return (key === 'ArrowRight') === rtl ? -1 : 1
}

const typed = (press: KeyPress, typeahead: Typeahead): boolean =>
  [...press.key].length === 1 &&
  !(press.control || press.meta || press.alt) &&
  (press.key !== ' ' || typeahead.typing())

/** A letter finds the next row whose first cell starts with it. */
const typedTo = (host: GridHost, place: GridPlace, press: KeyPress): boolean => {
  const found = host.typeahead.match(press.key, [...host.words], place.row)
  if (found < 0) {
    return false
  }
  if (found !== place.row) {
    host.moveTo({
      column: Math.max(0, Math.min(place.column, host.widthOf(found) - 1)),
      row: found,
    })
  }
  return true
}

/** An arrow, Home, End, or a Page key moves the stop. */
const moved = (host: GridHost, place: GridPlace, press: KeyPress, step: -1 | 0 | 1): boolean => {
  const toggle = press.control || press.meta
  const to = gridMove(
    press.key,
    place,
    { last: host.last, top: host.top, width: host.widthOf(place.row) },
    { control: toggle, page: pageRows(host.page, 1), step },
  )
  if (!to) {
    return false
  }
  const fitted = { ...to, column: Math.max(0, Math.min(to.column, host.widthOf(to.row) - 1)) }
  if (press.shift && press.key.match(/^Arrow(Up|Down)$/) && place.row >= 0 && fitted.row >= 0) {
    host.selectRange(fitted.row, place.row)
  } else if (!press.shift && fitted.row >= 0 && fitted.row !== place.row) {
    host.arrive(fitted.row, toggle)
  }
  if (fitted.row !== place.row || fitted.column !== place.column) {
    host.moveTo(fitted)
  }
  return true
}

/** Enter or Space on a cell, and Shift with Space, which runs a range. */
const pressed = (host: GridHost, place: GridPlace, press: KeyPress): boolean => {
  if (press.key === ' ' && press.shift && place.row >= 0) {
    return host.selectRange(place.row, place.row)
  }
  return host.activate(place, press.key, press.control || press.meta)
}

/** Right or Left on a disclosure cell. */
const disclosed = (
  host: GridHost,
  place: GridPlace,
  press: KeyPress,
  step: -1 | 0 | 1,
): boolean => {
  if (
    step === 0 ||
    place.row < 0 ||
    press.shift ||
    press.control ||
    press.meta ||
    host.lead[place.column] !== 'expand'
  ) {
    return false
  }
  const done = host.disclose(place.row, step > 0)
  if (typeof done === 'number') {
    host.moveTo({ column: place.column, row: done })
    return true
  }
  return done
}

/** A key on the cell at `place`, and whether the table took it. */
export const gridKey = (host: GridHost, place: GridPlace, press: KeyPress): boolean => {
  if (press.alt) {
    return false
  }
  if ((press.control || press.meta) && press.key.toLowerCase() === 'a' && !press.shift) {
    return host.selectAll()
  }
  if (typed(press, host.typeahead)) {
    return typedTo(host, place, press)
  }
  if (press.key === 'Enter' || press.key === ' ') {
    return pressed(host, place, press)
  }
  const step = stepOf(press.key)
  return disclosed(host, place, press, step) || moved(host, place, press, step)
}
