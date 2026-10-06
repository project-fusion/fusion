/** One option of a list fed as data, as the list reads and marks it. */
export interface DataOption {
  /** Whether the keyboard is on it. The list writes this. */
  active: boolean
  /** Whether it can be chosen. */
  disabled: boolean
  /** Whether a filter hides it. The list writes this. */
  hidden: boolean
  /** Whether it is chosen. The list writes this. */
  selected: boolean
  /** The words a reader sees, which the filter and the typeahead match. */
  text: string
  /** What choosing it puts in the value. */
  value: string
}

/**
 * An option as a page hands it over: its value alone, which is also its words,
 * or a record with a `value`, the `label` a reader sees (the value where it is
 * left out) and `disabled`.
 */
export type DataOptionItem =
  | number
  | string
  | { disabled?: boolean; label?: string; value: number | string }

/**
 * The options a page handed over as data, as a list reads them, built once per
 * array.
 *
 * Values and words are strings, as an option element's are, so a number and
 * its digits choose the same option.
 */
export const dataOptions = (items: readonly DataOptionItem[]): DataOption[] =>
  items.map((item) => {
    const record = typeof item === 'object' ? item : { value: item }
    return {
      active: false,
      disabled: Boolean(record.disabled),
      hidden: false,
      selected: false,
      text: String(record.label ?? record.value),
      value: String(record.value),
    }
  })

/**
 * The positions a window draws, in order, with `kept` added where it lies
 * outside the window: before it where it comes first, after it where it comes
 * later. `-1` keeps nothing. Positions past `count` are left out.
 *
 * `kept` is the option the keyboard is on. **It has to be drawn wherever it
 * is**, because `aria-activedescendant` points at an element, and an option
 * that is not drawn is one a screen reader cannot be told about.
 * `VirtualizeController.spacers(kept)` takes its room out of the spacer on its
 * side, so the scrollbar still measures the set.
 */
export const windowOf = (first: number, last: number, count: number, kept: number): number[] => {
  const at: number[] = []
  for (let index = first; index < Math.min(last, count); index += 1) {
    at.push(index)
  }
  if (kept >= 0 && kept < count && !at.includes(kept)) {
    kept < first ? at.unshift(kept) : at.push(kept)
  }
  return at
}

/**
 * Draws `rows[index]` for each of `at` into `box`, as elements named `tag`,
 * and returns them in order.
 *
 * **Reused by position.** A scroll moves the window by a row or two at a time,
 * so the elements already drawn take the next rows' words and state rather than
 * being thrown away: a list of ten thousand keeps the twenty or so elements a
 * screen holds.
 *
 * Each element carries its place in the whole set, `aria-posinset` and
 * `aria-setsize`, so a reader on the four-thousandth of ten thousand hears
 * that, and not its place in what happens to be drawn. `disabled` holds every
 * row down, for a list that is disabled itself.
 */
export const drawOptions = (
  box: Element,
  tag: string,
  rows: readonly DataOption[],
  at: readonly number[],
  disabled: boolean,
): HTMLElement[] => {
  const drawn = [...box.children] as HTMLElement[]
  while (drawn.length > at.length) {
    drawn.pop()?.remove()
  }
  while (drawn.length < at.length) {
    drawn.push(box.appendChild(box.ownerDocument.createElement(tag)))
  }
  at.forEach((index, i) => {
    const row = rows[index] as DataOption
    const element = drawn[i] as HTMLElement
    Object.assign(element, {
      active: row.active,
      disabled: row.disabled || disabled,
      selected: row.selected,
      value: row.value,
    })
    if (element.textContent !== row.text) {
      element.textContent = row.text
    }
    element.setAttribute('aria-posinset', String(index + 1))
    element.setAttribute('aria-setsize', String(rows.length))
  })
  return drawn
}
