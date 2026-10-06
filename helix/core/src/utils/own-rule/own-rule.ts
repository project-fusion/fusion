/**
 * A page's own rule for a field's value: a message, a list of them, or `true`,
 * `null` or nothing to accept the value. Input's and Textarea's `validate`.
 */
export type OwnRule = (value: string) => string | string[] | true | null | undefined

/**
 * Applies a page's own rule after the native verdict was copied, as React
 * Aria's TextField `validate` does: only while the browser finds nothing
 * wrong, so a required empty field says the browser's sentence first. A list
 * of messages is joined with spaces, and the message is a `customError`
 * anchored at the control, so the bubble points at the text.
 *
 * A function rather than a member of `MixinField`, so only the fields that
 * take `validate` carry it.
 */
export const applyOwnRule = (
  internals: ElementInternals,
  control: HTMLInputElement | HTMLTextAreaElement,
  rule: OwnRule | undefined,
  value: string,
): void => {
  const own = control.validity.valid ? rule?.(value) : undefined
  const message = Array.isArray(own) ? own.join(' ') : typeof own === 'string' ? own : ''
  if (message !== '') {
    internals.setValidity({ customError: true }, message, control)
  }
}
