import { form } from '../../capabilities/form/index.js'
import type { Host, Performed } from '../runner.js'
import { type ValidationContext, verdictOf } from './machine.js'
import type * as compiled from './validation.generated.js'

/** The effects a host performs for validation. */
export type ValidationEffect = Performed<typeof compiled>

/**
 * What a family binds validation to: the control and its anchor, and how a
 * failure is told and shown.
 */
export interface ValidationParts<N> {
  /**
   * Where the form points a reader at a failure, a part focus can go to, or
   * `null` for the control itself.
   */
  readonly anchor: () => N | null

  /** The control the verdict is about, whose value the form accepts or refuses. */
  readonly control: () => N

  /** Fires `invalid` at the control, which tells the consumer the verdict fails. */
  readonly invalid: () => void

  /** Shows the reader the failure at the control: the browser's bubble on the web. */
  readonly point: () => void
}

/**
 * What validation's effects do: `apply` hands the verdict to the form
 * through the form capability, at the control and pointing at its anchor.
 * `announce` has the family fire `invalid`, which tells the consumer, and
 * `point` has it show the reader the failure.
 */
export const validationHost = <N>(
  parts: ValidationParts<N>,
): Host<ValidationContext, ValidationEffect> => ({
  notifies: ['announce'],
  perform: {
    announce: () => {
      parts.invalid()
    },
    apply: (context) => {
      const { flags, message } = verdictOf(context)
      form().validity(parts.control(), flags, message, parts.anchor())
    },
    point: () => {
      parts.point()
    },
  },
})
