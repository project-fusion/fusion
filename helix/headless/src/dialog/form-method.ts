/**
 * Closes a shadow `<dialog>` on a `<form method="dialog">` submit slotted into
 * it, the way the platform closes its own. `Dialog` and `Drawer` share it.
 *
 * **The platform cannot find the dialog from the form.** A submit with the
 * `dialog` method closes the nearest `<dialog>` ancestor, and a slotted form's
 * ancestors are the light DOM, where there is none. So the submit is read on
 * the host, and the submitter's `value` is the `returnValue`, as it would be.
 * A form inside a `<dialog>` of its own, or with any other method, is left to
 * the platform.
 */
export const closeOnDialogSubmit = (
  event: SubmitEvent,
  close: (returnValue?: string) => void,
): void => {
  const form = event.target
  if (!(form instanceof HTMLFormElement) || form.closest('dialog')) {
    return
  }
  const submitter = event.submitter as HTMLButtonElement | HTMLInputElement | null
  const method = submitter?.hasAttribute('formmethod') ? submitter.formMethod : form.method
  if (method !== 'dialog') {
    return
  }
  event.preventDefault()
  close(submitter?.hasAttribute('value') ? submitter.value : undefined)
}

/**
 * What a `--close` command closes a dialog with: the value of the button that
 * sent it, as `command="close"` closes a native `<dialog>` with its invoker's.
 *
 * Read from the property, so a Helix button given its `value` by a framework
 * counts, and the attribute decides only whether an empty one was written. A
 * button with no value leaves `returnValue` as it was, as a submitter with
 * none does in `closeOnDialogSubmit`.
 */
export const commandValue = (source: Element | null): string | undefined => {
  const value = (source as { value?: unknown } | null)?.value
  if (typeof value !== 'string') {
    return undefined
  }
  return value !== '' || source?.hasAttribute('value') ? value : undefined
}
