import { HelixFormElement } from '../../helix-form-element/helix-form-element.js'

/** The native input types that count against implicit submission, from the HTML standard. */
const BLOCKING_TYPES = new Set([
  'date',
  'datetime-local',
  'email',
  'month',
  'number',
  'password',
  'search',
  'tel',
  'text',
  'time',
  'url',
  'week',
])

/**
 * The three hooks a Helix control answers implicit submission with, protected
 * on `HelixFormElement` because only this module reads them.
 */
interface Submitter {
  activate(): void
  readonly blocksImplicitSubmission: boolean
  readonly submitsForm: boolean
}

/** A Helix control seen through its implicit-submission hooks. */
const hooks = (element: HelixFormElement): Submitter => element as unknown as Submitter

/** Whether `element` is a submit button, native or Helix. */
export const submits = (element: Element): boolean => {
  if (element instanceof HelixFormElement) {
    return hooks(element).submitsForm
  }
  if (element instanceof HTMLButtonElement) {
    return element.type === 'submit'
  }
  return (
    element instanceof HTMLInputElement && (element.type === 'submit' || element.type === 'image')
  )
}

/** The form's default button, the first submit button in it, native or Helix. */
export const defaultButton = (form: HTMLFormElement): Element | undefined =>
  [...form.elements].find((element) => submits(element))

/** Whether `target` is a native field of `form` that Enter submits it from. */
export const submitsOnEnter = (target: EventTarget | undefined, form: HTMLFormElement): boolean =>
  target instanceof HTMLInputElement && target.form === form && BLOCKING_TYPES.has(target.type)

/**
 * Submits a control's form the way pressing Enter in a native text field does.
 *
 * A Helix control's own input is in a shadow root and has no form owner, so
 * the platform never runs implicit submission for it. This runs it: the form's
 * default button is activated, the first submit button in it, a Helix one
 * included. With none, the form is submitted when it holds no more than one
 * field that counts against implicit submission, and nothing happens
 * otherwise.
 *
 * **A module of its own rather than a method on the base**, so its code ships
 * only with the controls that submit on Enter (Input, Number Input, Pin Input,
 * Combobox, the picker fields and Button) and not with Switch, Checkbox or
 * Slider. `form` is the control's `form`, and a control with none submits
 * nothing.
 *
 * @reference https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#implicit-submission implicit submission
 */
export const submitImplicitly = (form: HTMLFormElement | null): void => {
  if (!form) {
    return
  }
  const button = defaultButton(form)
  if (button) {
    if (button.matches(':disabled')) {
      return
    }
    if (button instanceof HelixFormElement) {
      hooks(button).activate()
    } else {
      ;(button as HTMLElement).click()
    }
    return
  }
  const blocking = [...form.elements].filter((element) =>
    element instanceof HelixFormElement
      ? hooks(element).blocksImplicitSubmission
      : element instanceof HTMLInputElement && BLOCKING_TYPES.has(element.type),
  )
  if (blocking.length <= 1) {
    form.requestSubmit()
  }
}
