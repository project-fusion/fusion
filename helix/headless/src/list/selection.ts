import { commaList, pressedValue, rangeAdd, type SelectionMode } from '@fusion.dev/helix-core'

/*
 * What an interactive list's selection and its arrow keys come to, as
 * arithmetic over its rows. Which row holds the tab stop is core's
 * `rovingStop`. Pure and beside the family's `index.ts`, so a spec can hold it
 * without a page.
 */

/** How many rows a reader can select in an interactive list: core's `SelectionMode`. */
export type ListSelectionMode = SelectionMode

/**
 * What a press does to the rows already selected: `toggle` adds or takes out
 * the row, and `replace` selects it alone, as a file list does.
 */
export type ListSelectionBehavior = 'replace' | 'toggle'

/** A press on a row, or a key arriving on one, and what the list held then. */
export interface ListChoice {
  /** The list's `selection-mode`. */
  mode: ListSelectionMode
  /** The list's `selection-behavior`. */
  behavior: ListSelectionBehavior
  /** The list's `value`, before the press. */
  value: string
  /** The value of the row pressed or arrived on. */
  pressed: string
  /** The values of the rows a reader can reach, in order. */
  shown: readonly string[]
  /** The value of the row a range runs from, where there is one. */
  anchor?: string | undefined
  /** Whether Shift was held, which takes in the rows from the anchor. */
  extend?: boolean
  /** Whether Control or Command was held, which toggles under `replace` and moves without choosing. */
  toggle?: boolean
  /** Whether a key moved focus onto the row, where a press is false. */
  arrived?: boolean
}

/**
 * The `value` a press or an arrival leaves, or `null` where it changes nothing.
 *
 * - With Shift, in a list that selects many, every row from the anchor to this
 *   one is added, as Data Table and Listbox add a range.
 * - Under `replace`, the row is selected alone, by a press or by a key moving
 *   onto it. Control or Command toggles it under a press, and moves without
 *   choosing under a key.
 * - Under `toggle`, a press adds or takes out the row, and a key only moves.
 */
export const choiceValue = ({
  anchor,
  arrived = false,
  behavior,
  extend = false,
  mode,
  pressed,
  shown,
  toggle = false,
  value,
}: ListChoice): string | null => {
  if (mode === 'none') {
    return null
  }
  const now = commaList(value)
  if (extend && mode === 'multiple') {
    const from = anchor === undefined ? -1 : shown.indexOf(anchor)
    const range = rangeAdd(now, shown, from, shown.indexOf(pressed))
    return range ? range.join(', ') : null
  }
  if (behavior === 'replace' && !toggle) {
    return now.length === 1 && now[0] === pressed ? null : pressed
  }
  if (arrived) {
    return null
  }
  const next = pressedValue(mode, value, pressed)
  return next === value ? null : next
}

/**
 * Where Left or Right goes inside a row: `at` is the row's place among its
 * `count` stops, the cell first and its controls after it, and `step` is the
 * way the key points along the line.
 *
 * Past either end it comes back to the cell, so the keys never leave the row,
 * and from the cell going back reaches the last control.
 */
export const rowStop = (count: number, at: number, step: -1 | 1): number => {
  if (count <= 1) {
    return 0
  }
  const next = at + step
  if (next >= count) {
    return 0
  }
  return next < 0 ? count - 1 : next
}
