/**
 * What a list property may hold: what an attribute writes, or an array a
 * framework assigned to the property.
 *
 * **An array as well, because React 19 sets the property.**
 * `values={[1240, 1318]}` arrives as an array, and splitting it as a string
 * threw inside the render and left the old drawing on the screen.
 */
export type WrittenList = string | readonly (number | string)[] | null | undefined

/**
 * A list a consumer wrote into an attribute, split the way they write one.
 *
 * **Whitespace or commas, because a reader listing words puts commas between
 * them.** A split on whitespace alone turns `extra-controls="speed, pip"` into
 * `speed,` and `pip`, and `speed,` is not a control name: the control is
 * dropped, nothing is logged, and the docblock on the property says
 * unrecognized values are skipped, so the behavior looks like the documented
 * one. That is the undebuggable case `gridlines` names in its own docblock,
 * arrived at from the other direction, and it is why the widest spelling is the
 * one every consumer-written list takes.
 *
 * **Not for a value.** A payload is comma separated and nothing else, because a
 * value may hold a space: splitting `value="New York,Paris"` on whitespace
 * would submit a city that does not exist. Select, Listbox, Combobox and
 * Checkbox Group each split their own value on a comma and trim, which is the
 * other rule and not a lesser version of this one.
 *
 * **Nor for an IDREF list**, which is the platform's own format: `aria-*` and
 * `for` take whitespace and only whitespace, and accepting a comma there would
 * resolve an id nobody can write.
 */
export const writtenList = (source: WrittenList): string[] =>
  (Array.isArray(source) ? source.join(' ') : String(source ?? ''))
    .split(/[\s,]+/)
    .filter((one) => one !== '')

/**
 * The same list read as numbers, with everything that is not one dropped.
 *
 * **A stray entry leaves rather than becoming `NaN`.** A comparison against
 * `NaN` is false in both directions and a `NaN` drawn is nothing at all, so one
 * mistyped bound in `thresholds="0, 1, x, 6"` would color cells by a rule no
 * reader can see. Dropped, the rest of the list still means what it says.
 *
 * **Which numbers count is the caller's question.** Finiteness is all this can
 * answer, because a number that makes sense here is a bound, a reading and a
 * playback rate, and only the caller knows that a rate of zero is not a rate.
 */
export const writtenNumbers = (source: WrittenList): number[] =>
  writtenList(source)
    .map(Number)
    .filter((one) => Number.isFinite(one))

/**
 * A value list: the entries between commas, trimmed, with the empty ones
 * dropped.
 *
 * **Commas only**, which is the value rule `writtenList` describes beside it: a
 * value may hold a space, and `value="New York, Paris"` is two cities. Select,
 * Listbox, Checkbox Group, Tag Group, Toggle Group, Date Picker, Time Picker
 * and Legend's hidden series all read their lists this way.
 */
export const commaList = (value: string): string[] =>
  value
    .split(',')
    .map((one) => one.trim())
    .filter((one) => one !== '')

/**
 * A list with `value` taken out where it is in it, or added at the end where
 * it is not.
 *
 * With `order`, the result is put in that order and holds only what `order`
 * holds, so a set of pressed items reads the same whichever was pressed first.
 */
export const toggleValue = (
  list: readonly string[],
  value: string,
  order?: readonly string[],
): string[] => {
  const next = list.includes(value) ? list.filter((one) => one !== value) : [...list, value]
  return order ? order.filter((one) => next.includes(one)) : next
}

/**
 * `chosen` with every one of `values` added, or with every one taken out
 * where each was already in it: a select-all box, or a branch of a checkbox
 * tree pressed. `values` empty changes nothing.
 *
 * With `order`, the result is put in that order and holds only what `order`
 * holds. Without it, what was chosen keeps its place and what is added
 * follows.
 */
export const toggleEvery = (
  chosen: Iterable<string>,
  values: readonly string[],
  order?: readonly string[],
): string[] => {
  const next = new Set(chosen)
  const every = values.length > 0 && values.every((value) => next.has(value))
  for (const value of values) {
    if (every) {
      next.delete(value)
    } else {
      next.add(value)
    }
  }
  return order ? order.filter((value) => next.has(value)) : [...next]
}

/** How many items a set lets a reader select: Tag Group's and List's `selection-mode`. */
export type SelectionMode = 'multiple' | 'none' | 'single'

/**
 * The comma-separated `value` a press on the item carrying `pressed` leaves.
 *
 * `single` selects that item alone, or none where it was the one selected.
 * `multiple` adds it, or takes it out. `none` selects nothing and leaves the
 * value as it was. Tag Group and List answer the same question for their
 * tags and rows.
 */
export const pressedValue = (mode: SelectionMode, value: string, pressed: string): string => {
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
 * The comma-separated `value` once an item carrying `removed` has left, where
 * `left` is what the items still there stand for.
 *
 * Taken out only where no item left still stands for it, so two items with
 * one value keep it while either remains. The rest is written back as it was.
 */
export const prunedValue = (value: string, removed: string, left: readonly string[]): string => {
  const now = commaList(value)
  if (!now.includes(removed) || left.includes(removed)) {
    return value
  }
  return now.filter((one) => one !== removed).join(', ')
}
