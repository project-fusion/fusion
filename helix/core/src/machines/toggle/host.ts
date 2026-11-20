import { form } from '../../capabilities/form/index.js'
import type { Host, Performed } from '../runner.js'
import type { ToggleContext } from './machine.js'
import type * as compiled from './toggle.generated.js'

/** The effects a host performs for a toggle. */
export type ToggleEffect = Performed<typeof compiled>

/** What a family binds a toggle to: how a turn is told, and what the form receives. */
export interface ToggleParts<N> {
  /**
   * Tells the consumer the control turned to `checked`, as `input` and
   * `change` do on the web. Called after a press no listener refused.
   */
  readonly change: (checked: boolean) => void

  /** The control whose value the form receives. */
  readonly control: () => N

  /** What the control submits while checked, as its `value` says. */
  readonly value: () => string
}

/**
 * What a toggle's effects do: `announce` has the family tell the consumer the
 * control turned, and `report` hands the form, through the form capability,
 * the control's value while it is checked and no value while it is not, as a
 * native checkbox submits. A mixed control reports the state under the dash.
 */
export const toggleHost = <N>(parts: ToggleParts<N>): Host<ToggleContext, ToggleEffect> => ({
  notifies: ['announce'],
  perform: {
    announce: (context) => {
      parts.change(context.checked)
    },
    report: (context) => {
      form().value(parts.control(), context.checked ? parts.value() : null)
    },
  },
})
