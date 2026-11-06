/**
 * What a text field that filters a list reads of what was typed, on the web and on
 * a phone: the words it offers to finish, and what it offers to add.
 */

/** An option as these read it. */
interface Worded {
  readonly disabled?: boolean
  readonly hidden?: boolean | string
  readonly text: string
}

/**
 * The words of the first option the typing begins, or nothing.
 *
 * Case-insensitively matched and returned in the option's own case, so a reader
 * typing "ru" is offered "Rust" rather than "rust": the completion is a name from
 * the list.
 */
export const completionFor = (typed: string, options: readonly Worded[]): string => {
  if (typed === '') {
    return ''
  }
  const needle = typed.toLowerCase()
  const match = options.find(
    (option) => !option.hidden && !option.disabled && option.text.toLowerCase().startsWith(needle),
  )
  return match && match.text.length > typed.length ? match.text : ''
}

/**
 * What a create row would add, or nothing where there is nothing to add.
 *
 * Empty where the words already name an option exactly, case aside: offering to add
 * "Rust" under a list showing "Rust" offers a second copy of what the reader sees.
 */
export const creationFor = (
  typed: string,
  creatable: boolean,
  options: readonly Worded[],
): string => {
  const wanted = typed.trim()
  if (!creatable || wanted === '') {
    return ''
  }
  const exists = options.some((option) => option.text.trim().toLowerCase() === wanted.toLowerCase())
  return exists ? '' : wanted
}
