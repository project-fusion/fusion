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
 * What a press on the select-all box does to each box, in the set's order:
 * every enabled box checked, or every one cleared once all of them are, with a
 * disabled box keeping its state. A set with no enabled box stays as it is.
 *
 * **By box and not by value**, so boxes that share a value, such as boxes
 * written with none, which all submit `on`, are each moved on their own: by
 * value, one checked box made every box with its value count as checked, and
 * the press cleared the set where it should have filled it.
 */
export const selectAllPress = (boxes: readonly SetBox[]): boolean[] => {
  const enabled = boxes.filter((box) => !box.disabled)
  const every = enabled.length > 0 && enabled.every((box) => box.checked)
  return boxes.map((box) => (box.disabled ? box.checked : !every))
}
