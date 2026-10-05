import { commaList, toggleValue } from '@fusion.dev/helix-core'

/*
 * What an interactive list's selection and its arrow keys come to, as
 * arithmetic over its rows. Which row holds the tab stop is core's
 * `rovingStop`. Pure and beside the family's `index.ts`, so a spec can hold it
 * without a page.
 */

/** How many rows a reader can select in an interactive list. */
export type ListSelectionMode = 'multiple' | 'none' | 'single'

/**
 * The `value` a press on the row carrying `pressed` leaves.
 *
 * `single` selects that row alone, or none where it was the one selected.
 * `multiple` adds it, or takes it out. `none` selects nothing and leaves the
 * value as it was. Tag Group answers the same question for its tags.
 */
export const pressedValue = (mode: ListSelectionMode, value: string, pressed: string): string => {
  const now = commaList(value)
  if (mode === 'single') {
    return now.includes(pressed) ? '' : pressed
  }
  if (mode === 'multiple') {
    return toggleValue(now, pressed).join(', ')
  }
  return value
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
