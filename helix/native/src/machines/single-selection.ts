import { selectionHost } from '@fusion.dev/helix-core/machines/single-selection/host'
import type {
  SelectionContext,
  SelectionInput,
  SelectionItem,
} from '@fusion.dev/helix-core/machines/single-selection/machine'
import * as selection from '@fusion.dev/helix-core/machines/single-selection/single-selection.generated'
import { useCallback, useLayoutEffect, useRef } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import type { Member } from './collection'
import { boundTo, camel, eventsOf, given, senderOf, tell } from './props'
import { useMachine } from './use-machine'

/** What a set with one chosen item gives its items and its drawing. */
export interface Chosen {
  /** The value of the current item, or `''` where none is. */
  readonly active: string
  /** Asks to make the item with this value current, as a press on it does. */
  readonly choose: (value: string) => void
}

const items = (members: readonly Member[]): SelectionItem[] =>
  members
    .filter((member) => member.chooses)
    .map((member) => ({
      disabled: member.disabled,
      value: member.value,
      ...(member.marked === true ? { selected: true } : {}),
    }))

/** The items as a string that changes when any of them does, to know when to tell the machine. */
const signature = (members: readonly Member[]): string =>
  members
    .map((member) => `${member.value}\u0000${member.disabled}\u0000${member.chooses}`)
    .join('\u0001')

/**
 * Hosts single selection on a set, as the expansion binds it: the prop that
 * holds the current item, its seed, and the events a choice sends.
 *
 * **A written value is a seed the set still updates.** `active` written by
 * the consumer takes the machine there with nothing sent, as a script writing
 * the web element's property does; where nothing is written, the seed prop,
 * and then the items, say where it opens.
 *
 * **A choice asks, then tells**: the `before` event first, which a handler
 * can refuse, and the `after` events once the item is current, with the item
 * it replaced, and then `changed`.
 */
export const useSingleSelection = (
  family: Family,
  props: Props,
  use: MachineUse,
  members: readonly Member[],
  changed?: () => void,
): Chosen => {
  const chosenProp = boundTo(use, 'chosen', 'prop')
  const optional = boundTo(use, 'optional', 'prop') !== undefined
  const before = boundTo(use, 'before', 'event')
  const after = eventsOf(use, 'after')
  const written = chosenProp === undefined ? undefined : props[camel(chosenProp)]
  const seeded = given(family, props, boundTo(use, 'seed', 'prop'))
  const active = typeof written === 'string' ? written : typeof seeded === 'string' ? seeded : ''
  /* The current item the set last drew, which an announcement names as the
     one it replaced. It is recorded after each move's effects have run. */
  const shown = useRef(active)
  const machine = useMachine<SelectionContext, SelectionInput, 'announce'>(
    selection,
    { active, held: [] },
    selectionHost({
      activate: (value) => {
        for (const event of after) {
          tell(family, props, event, { previous: shown.current, value }, senderOf(family, value))
        }
        changed?.()
      },
    }),
    (_events, proposed, current) =>
      before === undefined ||
      tell(family, props, before, { value: proposed.active }, senderOf(family, current.active)),
  )
  const { context, reseat, send } = machine
  useLayoutEffect(() => {
    shown.current = context.active
  })
  /* The latest items and context, read by the effects below, which run only
     when the items' shape or the written value changes. */
  const latest = useRef({ context, items: items(members) })
  latest.current = { context, items: items(members) }
  const known = useRef(false)
  const shape = signature(members)
  useLayoutEffect(() => {
    if (shape === '') {
      return
    }
    /* A set that may hold no choice opens on an item its markup marks, and
       on nothing where none is. */
    const opens =
      !known.current && (!optional || latest.current.items.some((one) => one.selected === true))
    send(opens ? selection.EVENT_SEED : selection.EVENT_ITEMS, {
      items: latest.current.items,
      value: '',
    })
    known.current = true
  }, [optional, shape, send])
  useLayoutEffect(() => {
    const now = latest.current.context
    if (typeof written === 'string' && written !== now.active) {
      reseat({ ...now, active: written })
    }
  }, [written, reseat])
  const choose = useCallback(
    (value: string) => send(selection.EVENT_CHOOSE, { items: latest.current.items, value }),
    [send],
  )
  return { active: context.active, choose }
}
