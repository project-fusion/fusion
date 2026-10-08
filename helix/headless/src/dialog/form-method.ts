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
