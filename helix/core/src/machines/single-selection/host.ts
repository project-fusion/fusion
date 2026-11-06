import type { Host, Performed } from '../runner.js'
import type { SelectionContext } from './machine.js'
import type * as compiled from './single-selection.generated.js'

/** The effects a host performs for single selection. */
export type SelectionEffect = Performed<typeof compiled>

/** What a family binds single selection to: how a new current item is told. */
export interface SelectionParts {
  /**
   * Tells the consumer that the item with `value` is now current, or that no
   * item is where `value` is `''`, as `helix-activate` does on the web. Called
   * after a choice no listener refused, and after a removed current item
   * hands the selection to its neighbor.
   */
  readonly activate: (value: string) => void
}

/**
 * What single selection's effects do: `announce` has the family tell the
 * consumer which item is current. The markup's own choice and the set's
 * fallback move nothing, so they run no effect.
 */
export const selectionHost = (parts: SelectionParts): Host<SelectionContext, SelectionEffect> => ({
  notifies: ['announce'],
  perform: {
    announce: (context) => {
      parts.activate(context.active)
    },
  },
})
