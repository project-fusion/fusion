/** What the select-all helper reads from one box in the set. */
export interface SetBox {
  /** Whether the box is checked. */
  readonly checked: boolean
  /** Whether the box refuses a press, so select-all leaves it as it is. */
  readonly disabled: boolean
  /** What the box submits when checked. */
  readonly value: string
}

/**
 * What the select-all box shows: checked while every enabled box is checked,
 * mixed while only some are, and clear while none is.
 *
 * A disabled box counts for nothing, because a press leaves it as it is. A
 * set whose every box is disabled reads every box, so the select-all box still
 * shows what the set holds.
 */
export const selectAllState = (
  boxes: readonly SetBox[],
): { checked: boolean; indeterminate: boolean } => {
  const enabled = boxes.filter((box) => !box.disabled)
  const counted = enabled.length > 0 ? enabled : boxes
  const ticked = counted.filter((box) => box.checked).length
  const checked = counted.length > 0 && ticked === counted.length
  return { checked, indeterminate: ticked > 0 && !checked }
}

/**
 * The values a press on the select-all box leaves, in the set's order: every
 * enabled box checked, or every enabled box clear once all of them are
 * checked. A disabled box keeps its state either way.
 */
export const selectAllPress = (boxes: readonly SetBox[]): string[] => {
  const enabled = boxes.filter((box) => !box.disabled)
  const every = enabled.length > 0 && enabled.every((box) => box.checked)
  return boxes.filter((box) => (box.disabled ? box.checked : !every)).map((box) => box.value)
}
