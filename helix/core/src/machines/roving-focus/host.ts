import { focus } from '../../capabilities/focus/index.js'
import type { Host, Performed } from '../runner.js'
import type { RovingContext } from './machine.js'
import type * as compiled from './roving-focus.generated.js'

/** The effects roving focus asks for. */
export type RovingEffect = Performed<typeof compiled>

/** What a family binds roving focus to: its items, and how one is chosen. */
export interface RovingParts<N> {
  /** The items a move can reach, in order, as the index `at` counts them. */
  readonly items: () => readonly N[]

  /** Chooses the item at `at`, where the set chooses on arrival. */
  readonly select: (at: number) => void
}

/**
 * What roving focus's effects do: `focus` moves focus to the item the move
 * landed on, through the focus capability, and `select` asks the family to
 * choose it, which tells the consumer.
 */
export const rovingHost = <N>(parts: RovingParts<N>): Host<RovingContext, RovingEffect> => ({
  notifies: ['select'],
  perform: {
    focus: (context) => {
      const item = parts.items()[context.at]
      if (item !== undefined) {
        focus().focus(item, false)
      }
    },
    select: (context) => {
      parts.select(context.at)
    },
  },
})
