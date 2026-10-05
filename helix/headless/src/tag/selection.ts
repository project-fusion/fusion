import { commaList, toggleValue } from '@fusion.dev/helix-core'

/**
 * What a Tag Group's selection and tab stop come to, as arithmetic over its
 * tags.
 *
 * Pure and beside the family's `index.ts`, because which tag holds the stop and
 * what a press leaves selected are facts about a list, and a spec can hold them
 * without a page.
 */

/** How many tags a group lets a reader select. */
export type TagSelectionMode = 'multiple' | 'none' | 'single'

/** What the stop arithmetic needs of a tag. */
export interface StopCandidate {
  /** Whether the tag can be reached at all. */
  disabled: boolean
  /** Whether the tag is selected. */
  selected?: boolean | undefined
}

/**
 * The tag that holds the group's one tab stop: the one the reader was last
 * on, then the first selected one, then the first that can be reached.
 *
 * A disabled tag never holds it, so a group whose first tag is disabled can
 * still be entered from the keyboard.
 */
export const tabStop = <T extends StopCandidate>(
  tags: readonly T[],
  last?: T | undefined,
): T | undefined =>
  (last && !last.disabled && tags.includes(last) ? last : undefined) ??
  tags.find((tag) => tag.selected === true && !tag.disabled) ??
  tags.find((tag) => !tag.disabled)

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
