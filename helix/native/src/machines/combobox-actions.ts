/**
 * What a text field that filters a list does with its own presses, edits, and
 * choices, and what its host's states say, at one draw.
 */
import { chosenValues } from '@fusion.dev/helix-core/listbox'
import { Platform } from 'react-native'
import { type ChosenOption, choiceSaid, createWordsOf, says } from './combobox-model'
import type { ListOpening } from './list-owner'

/** What the field's own presses, edits, and choices do, read at one draw. */
interface Acting {
  readonly clear: () => void
  readonly close: () => void
  readonly closeList: () => void
  readonly commitEmptied: () => void
  readonly disabled: boolean
  readonly drop: (value: string) => void
  readonly edit: (text: string) => void
  readonly editing: boolean
  readonly emptied: { current: boolean }
  readonly focusField: () => void
  readonly known: ReadonlySet<string>
  readonly manual: boolean
  readonly multiple: boolean
  readonly open: boolean
  readonly openList: (where: ListOpening['where']) => void
  readonly openOnFocus: boolean
  readonly refocusing: { readonly current: boolean }
  readonly request: (next: string) => boolean
  readonly selectedLabel: string
  readonly setStatus: (next: string) => void
  readonly values: readonly string[]
  readonly wordsOf: (value: string) => string
}

/** The field's presses, edits, and choices. */
export const actionsOf = (now: Acting) => ({
  /* A choice from the list spends the search, and closes a single choice's list. */
  choose: (next: string): void => {
    if (!now.request(next)) {
      return
    }
    if (Platform.OS === 'ios') {
      const after = chosenValues(next, now.known, now.multiple)
      now.setStatus(choiceSaid(now.values, after, now.multiple, now.wordsOf, now.selectedLabel))
    }
    now.emptied.current = false
    now.clear()
    if (!now.multiple) {
      now.close()
    }
  },
  dropLast: (): void => {
    const last = now.values.at(-1)
    if (last !== undefined) {
      now.drop(last)
    }
  },
  edit: (text: string): void => {
    now.emptied.current = text.trim() === ''
    now.edit(text)
    if (!now.open && !now.manual) {
      now.openList('none')
    }
  },
  leave: (): void => {
    now.commitEmptied()
    if (now.open) {
      now.closeList()
    } else if (now.manual && now.editing) {
      now.clear()
    }
  },
  onFocused: (): void => {
    if (now.openOnFocus && !now.refocusing.current) {
      now.openList('none')
    }
  },
  openPressed: (pressedText: boolean): void => {
    if (now.disabled) {
      return
    }
    now.focusField()
    if (!(now.manual && pressedText)) {
      now.openList('none')
    }
  },
})

/** What the host's states say at one draw. */
export const hostStates = (
  state: (name: string) => string,
  now: {
    readonly chosen: readonly ChosenOption[]
    readonly creation: string
    readonly expandable: boolean
    readonly expanded: boolean
    readonly multiple: boolean
    readonly onCreate: boolean
    readonly over: number
    readonly status: string
    readonly values: readonly string[]
    readonly word: (name: string) => string
  },
): Readonly<Record<string, string | boolean>> => ({
  chosen: now.values.join('\n'),
  [state('createActive')]: now.onCreate,
  [state('createShown')]: now.creation !== '',
  [state('createWords')]: createWordsOf(now.word('createLabel'), now.creation),
  [state('fieldPlaceholder')]: now.chosen.length > 0 ? '' : now.word('placeholder'),
  [state('listName')]: now.word('listLabel'),
  [state('restLabel')]: now.word(now.expanded ? 'collapseLabel' : 'expandLabel'),
  [state('restPress')]: now.expandable && (now.over > 0 || now.expanded),
  [state('restShown')]: !now.expandable && now.over > 0,
  [state('restWords')]: now.expanded ? '' : says(now.word('restText'), { count: now.over }),
  [state('status')]: now.status,
  [state('tagsShown')]: now.multiple && now.chosen.length > 0,
})
