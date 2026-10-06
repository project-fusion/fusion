/**
 * Submitting a form through a native submit button that stands in for one in a
 * shadow root.
 *
 * `requestSubmit(submitter)` takes only a native submit button whose form is
 * the form, and a button inside a shadow root is neither. A hidden native
 * `<button type="submit">` carrying the same name, value and `form*`
 * overrides is put into the form for the one synchronous call, as Shoelace and
 * Web Awesome do, so the platform does the rest: `event.submitter` is a
 * button with the name and value, `new FormData(form, event.submitter)`
 * includes them, and the overrides apply to that submission alone.
 */

/** What a submit button carries into the submission it starts. */
export interface Carried {
  formAction: string
  formEnctype: string
  formMethod: string
  formNoValidate: boolean
  formTarget: string
  name: string
  value: string
}

/**
 * Submits `form` as a native submit button carrying `carried` would, and takes
 * that button out again whether or not a listener refused the submission.
 */
export const submitAs = (form: HTMLFormElement, carried: Carried): void => {
  const stand = form.ownerDocument.createElement('button')
  stand.type = 'submit'
  stand.hidden = true
  for (const [attribute, value] of [
    ['formaction', carried.formAction],
    ['formenctype', carried.formEnctype],
    ['formmethod', carried.formMethod],
    ['formtarget', carried.formTarget],
    ['name', carried.name],
  ] as const) {
    if (value !== '') {
      stand.setAttribute(attribute, value)
    }
  }
  stand.value = carried.value
  stand.formNoValidate = carried.formNoValidate
  form.append(stand)
  try {
    form.requestSubmit(stand)
  } finally {
    stand.remove()
  }
}
