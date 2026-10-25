import { openLink } from '../../capabilities/open-link/index.js'
import type { Host, Performed } from '../runner.js'
import type { ChoiceContext, ChoiceInput } from './machine.js'
import type * as compiled from './multiple-selection.generated.js'

/** The effects a host performs for multiple selection. */
export type ChoiceEffect = Performed<typeof compiled>

/**
 * What a family binds multiple selection to: where an item's link goes, and
 * how an action and a change are told. An item is named by its value, which
 * the event that acts on it carries.
 */
export interface ChoiceParts {
  /** Sends `helix-action` from the item with this value, which has no link. */
  readonly act: (value: string) => void

  /**
   * Tells the consumer the chosen items are now `value`, their values
   * separated by commas, as `change` does on the web. Called once a change no
   * listener refused has moved the value.
   */
  readonly change: (value: string) => void

  /** The destination of the item with this value, or `null` where it has no link. */
  readonly link: (value: string) => string | null
}

/**
 * What multiple selection's effects do: `act` follows the item's link through
 * the open-link capability, or has the family send `helix-action` from an
 * item with none, and `announce` has the family tell the consumer the value.
 */
export const choiceHost = (parts: ChoiceParts): Host<ChoiceContext, ChoiceEffect, ChoiceInput> => ({
  notifies: ['act', 'announce'],
  perform: {
    act: (_context, _argument, input) => {
      if (input === undefined) {
        return
      }
      const destination = parts.link(input.item.value)
      if (destination === null) {
        parts.act(input.item.value)
      } else {
        openLink().open(destination)
      }
    },
    announce: (context) => {
      parts.change(context.value)
    },
  },
})
