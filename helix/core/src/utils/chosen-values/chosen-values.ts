/**
 * The values a chooser's `value` holds, read against the values of its
 * options.
 *
 * **One chosen value is the whole string.** A single select whose option is
 * `x,y` holds `x,y`, and splitting it found no option of either half, so the
 * trigger showed the placeholder while the form sent `x,y`.
 *
 * **Several are joined with commas, and an option's own comma is kept.** The
 * string is split on its commas, and fragments next to each other are read as
 * one value where they join into the value of an option, the longest first.
 * A fragment that matches no option is kept as it is, so a value set ahead of
 * options that load later is not lost. Where an option's value is also two
 * other options' values joined, such as `x`, `y` and `x,y`, the longer one is
 * read.
 */
export const chosenValues = (
  value: string,
  known: ReadonlySet<string>,
  multiple: boolean,
): string[] => {
  if (value === '') {
    return []
  }
  if (!multiple || known.has(value)) {
    return [value]
  }
  const fragments = value.split(',')
  const values: string[] = []
  for (let from = 0; from < fragments.length; ) {
    let to = fragments.length
    while (to > from + 1 && !known.has(fragments.slice(from, to).join(','))) {
      to -= 1
    }
    values.push(fragments.slice(from, to).join(','))
    from = to
  }
  return values
}
