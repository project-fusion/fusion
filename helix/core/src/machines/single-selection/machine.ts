import { resolveActiveItem } from '../../utils/resolve-active-item/resolve-active-item.js'
import type { Statechart } from '../statechart.js'

/*
 * Single selection: one item of a set is the current one. A choice is a
 * request: `helix-before-activate` asks first, and where no listener refuses
 * it the item becomes current and `helix-activate` says so. A refusal leaves
 * the set as it was and says nothing. The markup may name the item a set
 * opens on, and removing the current item hands the selection to the item
 * beside it, which `helix-activate` also says.
 *
 * The host holds the context in its properties: `active` is the value of the
 * current item, a property any script may write, so the machine is read from
 * the host before each event and writes its context back after it. The two
 * states are the two modes `active` can be in: `unresolved` where it names
 * nothing, and `settled` where it names an item.
 */

/** An item of the set, as the machine reads it. */
export interface SelectionItem {
  /** Whether the item is out of play. A disabled item is never chosen for you. */
  disabled?: boolean

  /** Whether the markup marks the item as the one the set opens on. */
  selected?: boolean

  /** What identifies the item. */
  value: string
}

/** What the machine holds between events. */
export interface SelectionContext {
  /** The value of the current item, or `''` where nothing names one. */
  active: string

  /** The values of the items the last `ITEMS` read, to tell a removed item from one not yet read. */
  held: readonly string[]
}

/** What an event carries. */
export interface SelectionInput {
  /** The items, for `ITEMS` and `SEED`. */
  items: SelectionItem[]

  /** The value asked for, for `CHOOSE`. */
  value: string
}

/** The item a set opens on: the one the markup marks, or else the first enabled one. */
const seedOf = (context: SelectionContext, input: SelectionInput): SelectionItem | undefined =>
  input.items.find((item) => item.selected) ?? resolveActiveItem(context.active, input.items)

/**
 * The item that takes over from a removed current item: the enabled item
 * nearest to where it stood, the next ones first, or else the first enabled
 * item. `undefined` where the current item was not removed.
 */
const replacementOf = (
  context: SelectionContext,
  input: SelectionInput,
): SelectionItem | undefined => {
  const { active, held } = context
  if (!held.includes(active) || input.items.some((item) => item.value === active)) {
    return undefined
  }
  const at = held.indexOf(active)
  const by = new Map(input.items.map((item) => [item.value, item]))
  const order = [...held.slice(at + 1), ...held.slice(0, at).reverse()]
  return (
    order.map((value) => by.get(value)).find((item) => item !== undefined && !item.disabled) ??
    resolveActiveItem(active, input.items)
  )
}

/** Whether nothing names the current item. */
export const unchosen = (context: SelectionContext): boolean => context.active === ''

/** Whether the value asked for is another item than the current one. */
export const differs = (context: SelectionContext, input: SelectionInput): boolean =>
  input.value !== context.active

/** Whether the value asked for names nothing, where an item is current. */
export const clears = (context: SelectionContext, input: SelectionInput): boolean =>
  input.value === '' && context.active !== ''

/** Whether there is an item to open on. */
export const seedable = (context: SelectionContext, input: SelectionInput): boolean =>
  seedOf(context, input) !== undefined

/** Whether the current item was removed and another can take over. */
export const replaceable = (context: SelectionContext, input: SelectionInput): boolean =>
  replacementOf(context, input) !== undefined

/** Opens on the item the markup marks, or on the first enabled one. */
export const seed = (context: SelectionContext, input: SelectionInput): SelectionContext => ({
  ...context,
  active: seedOf(context, input)?.value ?? '',
})

/** Makes the value asked for current. */
export const take = (context: SelectionContext, input: SelectionInput): SelectionContext => ({
  ...context,
  active: input.value,
})

/** Records the items read. */
export const hold = (context: SelectionContext, input: SelectionInput): SelectionContext => ({
  ...context,
  held: input.items.map((item) => item.value),
})

/** Hands the selection to the item that takes over, and records the items read. */
export const handOn = (context: SelectionContext, input: SelectionInput): SelectionContext => ({
  active: replacementOf(context, input)?.value ?? '',
  held: input.items.map((item) => item.value),
})

type State = 'settled' | 'unresolved'

type Event = 'CHOOSE' | 'ITEMS' | 'SEED'

type Effect = 'announce'

/** The machine, written once. `single-selection.generated.ts` is what runs. */
export const singleSelection: Statechart<State, Event, SelectionContext, SelectionInput, Effect> = {
  effects: ['announce'],
  events: ['CHOOSE', 'ITEMS', 'SEED'],
  initial: [{ guard: unchosen, target: 'unresolved' }, { target: 'settled' }],
  states: {
    /* An item is current: the markup, a script, the set's own fallback, a
       choice, or a removal named it. */
    settled: {
      on: {
        CHOOSE: [
          {
            accept: { effects: ['announce'], target: 'unresolved', update: take },
            ask: 'activate',
            guard: clears,
            refuse: {},
          },
          {
            accept: { effects: ['announce'], update: take },
            ask: 'activate',
            guard: differs,
            refuse: {},
          },
          'ignore',
        ],
        ITEMS: [{ effects: ['announce'], guard: replaceable, update: handOn }, { update: hold }],
        SEED: 'ignore',
      },
    },
    /* Nothing names the current item: before the items are read, after a
       choice of nothing, and always on a server. */
    unresolved: {
      on: {
        CHOOSE: [
          {
            accept: { effects: ['announce'], target: 'settled', update: take },
            ask: 'activate',
            guard: differs,
            refuse: {},
          },
          'ignore',
        ],
        ITEMS: { update: hold },
        SEED: [{ guard: seedable, target: 'settled', update: seed }, 'ignore'],
      },
    },
  },
}
