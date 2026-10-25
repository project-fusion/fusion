import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { typeaheadHost } from '@fusion.dev/helix-core/machines/typeahead/host'
import type {
  TypeaheadContext,
  TypeaheadInput,
} from '@fusion.dev/helix-core/machines/typeahead/machine'
import * as typeahead from '@fusion.dev/helix-core/machines/typeahead/typeahead.generated'
import { useCallback, useRef } from 'react'
import { type Member, reaches } from './collection'
import type { Arrived } from './roving-focus'
import { useMachine } from './use-machine'

/** What typeahead gives a set: a handler for each key an item hears, and a way to end a search. */
export interface Typing {
  /** Answers whether the set took the key, so the platform does nothing else with it. */
  readonly key: (from: string, press: KeyPress) => boolean
  /** Ends a search, as a move by an arrow key, Home, or End does. */
  readonly reset: () => void
}

/**
 * Whether a key types one character, with nothing held that makes it a command.
 *
 * **One character is one code point here.** The typeahead machine leaves what
 * counts as one character to each platform. An emoji of one code point, such
 * as U+1F600, types, and one built of several, such as a flag, is left to the
 * page. The web counts UTF-16 units in `typesCharacter`, and leaves U+1F600 to
 * the page.
 */
const types = (press: KeyPress): boolean =>
  !press.claimed && !press.alt && !press.control && !press.meta && [...press.key].length === 1

/** What typeahead reads of its set beside its items. */
export interface Searched {
  /** Hears each search that lands on another item, with the key typed. */
  readonly arrived?: Arrived
  /** Whether the search reaches a disabled item, as a list's does under `disabled-behavior="selection"`. */
  readonly reachesDisabled?: boolean
}

/**
 * Hosts typeahead on a set: a typed character moves to the next item whose
 * words start with the letters typed so far, and half a second with nothing
 * typed ends the search.
 *
 * **A key the machine does not answer is left to the page**, as the web set
 * leaves it, so the set asks the compiled module whether the key is one it
 * answers before it sends it. Arriving focuses the item and, where the set
 * chooses on arrival, chooses it. The answer says where the search lands,
 * which `arrived` hears where it is another item.
 */
export const useTypeahead = (
  members: readonly Member[],
  selects: boolean,
  choose: (value: string) => void,
  searched: Searched = {},
): Typing => {
  const latest = useRef({ choose, members, searched, selects })
  latest.current = { choose, members, searched, selects }
  const machine = useMachine<TypeaheadContext, TypeaheadInput, 'focus' | 'select'>(
    typeahead,
    { at: '', letters: '' },
    typeaheadHost({
      item: (value) => latest.current.members.find((member) => member.value === value)?.node?.(),
      select: (value) => latest.current.choose(value),
    }),
    () => true,
  )
  const now = useRef({ context: machine.context, state: machine.state })
  now.current = { context: machine.context, state: machine.state }
  const { send } = machine
  const key = useCallback(
    (from: string, press: KeyPress): boolean => {
      if (!types(press)) {
        return false
      }
      const { members: all, searched: around, selects: chooses } = latest.current
      const input: TypeaheadInput = {
        character: press.key,
        focus: true,
        from,
        items: all
          .filter((member) => reaches(member, around.reachesDisabled))
          .map((member) => ({ value: member.value, words: member.words })),
        selects: chooses,
      }
      const answer = typeahead.step(
        now.current.state,
        now.current.context,
        typeahead.EVENT_TYPE,
        input,
      )
      if (answer === undefined) {
        return false
      }
      send(typeahead.EVENT_TYPE, input)
      const landed = 'context' in answer ? answer.context.at : ''
      if (landed !== '' && landed !== from) {
        around.arrived?.(landed, from, press)
      }
      return true
    },
    [send],
  )
  const reset = useCallback(
    () =>
      send(typeahead.EVENT_RESET, {
        character: '',
        focus: true,
        from: '',
        items: [],
        selects: latest.current.selects,
      }),
    [send],
  )
  return { key, reset }
}
