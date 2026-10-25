import { focus } from '../../capabilities/focus/index.js'
import type { Host, Performed } from '../runner.js'
import type { TypeaheadContext } from './machine.js'
import type * as compiled from './typeahead.generated.js'

/** The effects a host performs for typeahead. */
export type TypeaheadEffect = Performed<typeof compiled>

/** What a family binds typeahead to: its items by value, and how one is chosen. */
export interface TypeaheadParts<N> {
  /** The item whose value is `value`, or `undefined` where no item has it. */
  readonly item: (value: string) => N | undefined

  /** Chooses the item whose value is `value`, where the set chooses on arrival. */
  readonly select: (value: string) => void
}

/**
 * What typeahead's effects do: `focus` moves focus to the item the letters
 * landed on, through the focus capability, and `select` has the family choose
 * it, which tells the consumer. Both read the item from `at`.
 */
export const typeaheadHost = <N>(
  parts: TypeaheadParts<N>,
): Host<TypeaheadContext, TypeaheadEffect> => ({
  notifies: ['select'],
  perform: {
    focus: (context) => {
      const item = parts.item(context.at)
      if (item !== undefined) {
        focus().focus(item, false)
      }
    },
    select: (context) => {
      parts.select(context.at)
    },
  },
})
