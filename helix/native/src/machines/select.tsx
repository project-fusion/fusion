/**
 * A field that opens a list of options on a phone: what is chosen, what the
 * trigger says, and what its keys do while the list is closed.
 *
 * **The list is a drawn Listbox**, which takes the value from here and hands each
 * change back, so the value lives in one place, as the web's does. **A layer that
 * is closed holds nothing**, so the options also join a hidden copy of themselves,
 * which the trigger's words, its keys, and the verdict read.
 */
import {
  chosenValues,
  type DataOption,
  type DataOptionItem,
  dataOptions,
  Typeahead,
} from '@fusion.dev/helix-core/listbox'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Platform } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import type { Around } from './binder'
import type { ListOpening, ListOwner } from './list-owner'

export { type SelectHandle, usePutBack } from './select-handle'
export { closedKey } from './select-keys'
export type { ListOpening, ListOwner }

import { holdMember, useOrder } from './listbox'
import { useMembers, useWritten, wordsIn } from './listbox-hooks'
import { type Entry, entriesOf, type Held } from './listbox-model'
import { type OptionMember, type OptionOwner, OptionOwnerContext } from './option'
import { boundTo, given, type HelixEvent, senderOf, tell, told } from './props'
import type { SelectHandle } from './select-handle'
import { type Closed, triggerRef } from './select-keys'
import type { Turned } from './toggle'

/** What the hidden copy of the options joins. Nothing there is pressed, and nothing shows. */
export const heldOwner = (held: Held, schedule: () => void): OptionOwner => ({
  choose: () => undefined,
  disabled: false,
  drag: undefined,
  filtering: false,
  group: () => ({ hidden: false, later: false }),
  hold: (member: OptionMember) => holdMember(held, member, schedule),
  holdGroup: () => () => undefined,
  key: () => false,
  leave: (one) => {
    held.members.delete(one)
    held.order = held.order.filter((each) => each !== one)
    schedule()
  },
  lift: undefined,
  move: undefined,
  /* An option that is hidden joins and draws nothing, so nothing here takes a press. */
  standing: () => ({ active: false, hidden: true, move: undefined, selected: false }),
})

/** The chosen options' words in the reader's language, or the placeholder. */
const wordsFor = (chosen: readonly Entry[], placeholder: string): string => {
  const words = chosen.map((one) => one.text)
  if (words.length === 0) {
    return placeholder
  }
  return typeof Intl.ListFormat === 'function'
    ? new Intl.ListFormat(undefined, { style: 'short', type: 'unit' }).format(words)
    : words.join(', ')
}

/** What the options wrote `selected` on says the value is. */
const declaredBy = (held: Held, multiple: boolean): string | undefined => {
  const declared = [...held.members.values()].filter((one) => one.declared)
  return multiple ? declared.map((one) => one.value).join(',') : declared.at(-1)?.value
}

/** Takes `selected` on an option as the value where none is declared, and an option that left out of it. */
const useReconciled = (
  held: Held,
  entries: readonly Entry[],
  multiple: boolean,
  value: string,
  seedable: boolean,
  setValue: (next: string) => void,
): void => {
  const seeded = useRef(false)
  const seen = useRef<ReadonlySet<string>>(new Set())
  useLayoutEffect(() => {
    if (entries.length === 0) {
      return
    }
    const present = new Set(entries.map((one) => one.value))
    if (!seeded.current) {
      seeded.current = true
      const seed = declaredBy(held, multiple)
      if (seedable && seed) {
        setValue(seed)
      }
    }
    const was = chosenValues(value, new Set([...present, ...seen.current]), multiple)
    const gone = was.filter((one) => seen.current.has(one) && !present.has(one))
    seen.current = present
    if (gone.length > 0) {
      setValue(was.filter((one) => !gone.includes(one)).join(','))
    }
  })
}

/** What names the list, and what the trigger says: the label, then the choice. */
const namesOf = (
  state: (name: string) => string,
  label: string,
  listLabel: string,
  words: string,
): Readonly<Record<string, string>> => ({
  [state('listName')]: label || listLabel,
  [state('said')]: label === '' ? words : `${label} ${words}`,
})

/** Asks, then stands, then says so; a refusal leaves the list as it stands. */
export const requesterOf =
  (
    family: Family,
    props: Props,
    use: MachineUse,
    value: string,
    setValue: (next: string) => void,
    touch: () => void,
  ) =>
  (next: string): boolean => {
    const before = boundTo(use, 'onBeforeChange', 'event')
    if (
      before !== undefined &&
      !tell(family, props, before, { value: next }, senderOf(family, value))
    ) {
      return false
    }
    setValue(next)
    touch()
    for (const name of ['onInput', 'onChange']) {
      const event = boundTo(use, name, 'event')
      if (event !== undefined) {
        told(family, props, event, {}, senderOf(family, next))
      }
    }
    return true
  }

/** Closes a toggle that stands open. */
export const closeIf = (toggled: Turned | undefined): void => {
  if (toggled?.checked === true) {
    toggled.turn()
  }
}

/** Hosts a field that opens a list of options. */
export const useSelect = (
  family: Family,
  props: Props,
  use: MachineUse,
  toggled: Turned | undefined,
  touch: () => void,
  layering: Around['layering'],
): { readonly behavior: Behavior; readonly handle: SelectHandle; readonly value: string } => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const multiple = read('multiple') === true
  const disabled = read('disabled') === true
  /* Read-only: the choice can be read and focused, and neither a key nor a press changes it. */
  const readonly = read('readonly') === true
  const written = read('value')
  const seed = wordsIn(read('defaultValue'))
  const [value, setValue] = useWritten(written, seed)
  const latest = useRef({ setValue, value })
  latest.current = { setValue, value }
  const handle = useMemo<SelectHandle>(
    () => ({
      get value() {
        return latest.current.value
      },
      set value(next: string) {
        latest.current.setValue(next)
      },
    }),
    [],
  )
  const { held, schedule } = useMembers()
  useOrder(held, schedule)
  const items = read('items') as readonly DataOptionItem[] | undefined
  const records = useMemo(
    (): readonly DataOption[] | undefined =>
      Array.isArray(items) ? dataOptions(items) : undefined,
    [items],
  )
  const entries = entriesOf(records, held, () => true)
  useReconciled(
    held,
    entries,
    multiple,
    value,
    seed === '' && typeof written !== 'string',
    setValue,
  )
  const chosen = chosenValues(value, new Set(entries.map((one) => one.value)), multiple)
  const standing = toggled?.checked === true
  useLayoutEffect(() => {
    if (readonly && standing) {
      closeIf(toggled)
    }
  }, [readonly, standing, toggled])
  const opening = useRef<ListOpening>({ where: 'selected' })
  const [status, setStatus] = useState('')
  const close = (): void => closeIf(toggled)
  const request = requesterOf(family, props, use, value, setValue, touch)
  const words = wordsFor(
    entries.filter((one) => chosen.includes(one.value)),
    wordsIn(read('placeholder')),
  )
  const label = wordsIn(props.label) || wordsIn(props.ariaLabel)
  /* VoiceOver does not read a name that changes under focus. */
  const say = (next: string): void => {
    if (Platform.OS === 'ios') {
      setStatus(
        wordsFor(
          entries.filter((one) => one.value === next),
          '',
        ),
      )
    }
  }
  const typeahead = useRef(new Typeahead()).current
  const closed = useRef<Closed | undefined>(undefined)
  closed.current = {
    choose: (next) => {
      if (next !== value && request(next)) {
        say(next)
      }
    },
    disabled: disabled || readonly,
    entries,
    multiple,
    open: (at) => {
      opening.current = at
      toggled?.turn()
    },
    standing,
    typeahead,
    value,
  }
  const listening = useRef<(() => void) | undefined>(undefined)
  const owner = useMemo(() => heldOwner(held, schedule), [held, schedule])
  /* The option the list opened on, which the layer stands on the trigger. */
  const row = useRef<unknown>(null)
  if (props.position === 'item-aligned') {
    layering.over = { option: () => row.current }
  }
  const listOwner: ListOwner = {
    again: close,
    landed: (view) => {
      row.current = view
    },
    get opening() {
      return opening.current
    },
    tab: close,
  }
  const state = (name: string): string => boundTo(use, name, 'state') ?? name
  return {
    behavior: {
      marks: [],
      parts: {
        host: {
          states: {
            chosen: chosen.join('\n'),
            ...namesOf(state, label, wordsIn(read('listLabel')), words),
            [state('status')]: status,
            [state('unchosen')]: chosen.length === 0,
            [state('words')]: words,
          },
        },
        listbox: {
          view: {
            listOwner,
            onBeforeChange: (heard: HelixEvent) => {
              /* The list takes its value from here, whichever way this goes. */
              heard.preventDefault()
              const next = (heard.detail as { readonly value: string }).value
              if (request(next) && !multiple) {
                close()
                opening.current = { where: 'selected' }
              }
            },
            value,
          },
        },
        trigger: {
          view: {
            ref: triggerRef(listening, closed),
          },
        },
      },
      provide: (inside) => (
        <OptionOwnerContext.Provider value={owner}>{inside}</OptionOwnerContext.Provider>
      ),
    },
    handle,
    value,
  }
}
