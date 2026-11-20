import { internalsOf as attachedTo, type HelixElement } from '../../helix-element/helix-element.js'
import { submitImplicitly } from '../../utils/implicit-submit/implicit-submit.js'
import type { Flag } from '../types.generated.js'
import type { Form } from './contract.generated.js'

/**
 * The `ElementInternals` a control attached, or `undefined` where it keeps
 * none.
 *
 * **Read through core's `internalsOf`**, which holds them off the element.
 * `HelixElement` attaches the internals once in its constructor, and
 * `attachInternals()` throws on a second call, so core's record is the one
 * place to find them. Any other node, such as a native `<input>`, is in no
 * record and keeps none.
 */
const internalsOf = (node: HTMLElement): ElementInternals | undefined =>
  attachedTo(node as HelixElement) as ElementInternals | undefined

/** The flags `setValidity` takes, each one in `flags` set. */
const flagsOf = (flags: readonly Flag[]): ValidityStateFlags => {
  const set: ValidityStateFlags = {}
  for (const flag of flags) {
    set[flag] = true
  }
  return set
}

/** The form `node` belongs to, as its `form` property names it, or `null`. */
const formOf = (node: HTMLElement): HTMLFormElement | null => {
  const owner = (node as HTMLElement & { form?: unknown }).form
  return owner instanceof HTMLFormElement ? owner : null
}

/**
 * Hands the form a control's value and verdict through the `ElementInternals`
 * the control attached, and submits the control's form as Enter in a text
 * field does.
 *
 * **On a Helix control, `setValidity` is `HelixFormElement`'s wrapper**, so a
 * message from `setCustomValidity` or a field's `feedback` stays laid over the
 * verdict given here. A node that keeps no internals, such as a native
 * `<input>`, gives the form nothing through `value` and `validity`.
 *
 * `submit` runs implicit submission from `utils/implicit-submit`: it presses
 * the form's default button, and with none it calls `requestSubmit()` where
 * the form holds no more than one text field.
 */
export const webForm: Form<HTMLElement> = {
  submit: (node) => {
    submitImplicitly(formOf(node))
  },
  validity: (node, flags, message, anchor) => {
    const internals = internalsOf(node)
    if (!internals) {
      return
    }
    if (flags.length === 0) {
      internals.setValidity({})
      return
    }
    internals.setValidity(flagsOf(flags), message, anchor ?? undefined)
  },
  value: (node, value) => {
    internalsOf(node)?.setFormValue(value)
  },
}
