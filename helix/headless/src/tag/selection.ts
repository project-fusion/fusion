import { commaList, toggleValue } from '@fusion.dev/helix-core'

/**
 * What a Tag Group's selection comes to, as arithmetic over its tags. Which
 * tag holds the tab stop is core's `rovingStop`.
 *
 * Pure and beside the family's `index.ts`, because what a press leaves
 * selected is a fact about a list, and a spec can hold it without a page.
 */

/** How many tags a group lets a reader select. */
export type TagSelectionMode = 'multiple' | 'none' | 'single'

/**
 * The `value` a press on the tag carrying `pressed` leaves.
 *
 * `single` selects that tag alone, or none where it was the one selected.
 * `multiple` adds it, or takes it out. `none` selects nothing and leaves the
 * value as it was.
 */
export const pressedValue = (mode: TagSelectionMode, value: string, pressed: string): string => {
  const now = commaList(value)
  const held = now.includes(pressed)
  if (mode === 'single') {
    return held ? '' : pressed
  }
  if (mode === 'multiple') {
    return toggleValue(now, pressed).join(', ')
  }
  return value
}
