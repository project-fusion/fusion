/**
 * Reports a control's answer to its form: one entry for each value, the way a
 * native `<select multiple>` and a row of checkboxes send theirs.
 *
 * **Several answers are several entries, not one joined string.** A server
 * reading `tags=a,b` has to know to split it on a convention this library
 * chose, and one reading `tags=a&tags=b` reads it the way it reads every
 * other multi-valued control on the platform. Listbox, Select and Combobox
 * sent the first and Date Picker the second, so what a server received for the
 * same answer depended on which control asked for it.
 *
 * **The joined string is the state by default**, which is what the browser
 * hands back to `formStateRestoreCallback` and what `value` holds, so a
 * restored control reads the shape it wrote. A control whose answers can hold
 * a comma asks for `state: 'entries'`, and the browser hands back the form
 * data itself, one entry per answer, so `b,1` comes back as one answer and not
 * two.
 *
 * **Nothing without a `name`.** A plain string is skipped by the form when its
 * control has no name, but `FormData` carries its own names and its entries
 * are appended whatever the element is called, so an unnamed control would
 * submit empty-named values.
 */
/** How `reportValues` saves the state the browser restores. */
export interface ReportValuesOptions {
  /**
   * What the browser hands back to `formStateRestoreCallback`: `joined`, the
   * answers joined with commas, or `entries`, the form data with one entry per
   * answer. Defaults to `joined`.
   */
  state?: 'entries' | 'joined'
}

export const reportValues = (
  internals: ElementInternals,
  name: string,
  values: readonly string[],
  { state = 'joined' }: ReportValuesOptions = {},
): void => {
  if (name === '' || values.length === 0) {
    internals.setFormValue(null)
    return
  }
  const data = new FormData()
  for (const value of values) {
    data.append(name, value)
  }
  internals.setFormValue(data, state === 'entries' ? data : values.join(','))
}
