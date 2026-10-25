import type { Form } from './contract.generated.js'

/** Does nothing: a server renders a form and takes no value from it. */
export const serverForm: Form<unknown> = {
  submit: () => undefined,
  validity: () => undefined,
  value: () => undefined,
}
