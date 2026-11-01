/**
 * A field that opens a list of options on a phone: what is chosen, what the
 * trigger says, and what its keys do while the list is closed.
 *
 * **The list is a drawn Listbox**, which takes the value from here and hands each
 * change back, so the value lives in one place, as the web's does. **A layer that
 * is closed holds nothing**, so the options also join a hidden copy of themselves,
 * which the trigger's words, its keys, and the verdict read.
 */
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import {
  chosenValues,
  type DataOption,
  type DataOptionItem,
  dataOptions,
  Typeahead,
} from '@fusion.dev/helix-core/listbox'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { I18nManager, Platform } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { holdMember, useOrder } from './listbox'
import { useMembers, useWritten, wordsIn } from './listbox-hooks'
import { type Entry, entriesOf, type Held } from './listbox-model'
import { type OptionMember, type OptionOwner, OptionOwnerContext } from './option'
import { boundTo, given, type HelixEvent, senderOf, tell, told } from './props'
import type { Turned } from './toggle'
import { reachable } from './virtual-focus'

/** Where the highlight goes as the list opens, by the key that opened it. */
export interface ListOpening {
  /** The option a typed letter landed on, which takes the place of `where`. */
  readonly value?: string | undefined
  readonly where: 'first' | 'last' | 'selected'
}

/** What a list drawn inside a Select reads of the Select. */
export interface ListOwner {
  /** Closes the list, as the chosen option pressed again does. */
  readonly again: () => void
  /** Where the highlight goes as the list opens. */
  readonly opening: ListOpening
  /** Closes the list and lets focus move on, as Tab does. */
  readonly tab: () => void
}

/** What the hidden copy of the options joins. Nothing there is pressed, and nothing shows. */
const heldOwner = (held: Held, schedule: () => void): OptionOwner => ({
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

const OPENS: Readonly<Record<string, ListOpening['where']>> = {
  ' ': 'selected',
  ArrowDown: 'selected',
  ArrowUp: 'last',
  End: 'last',
  Enter: 'selected',
  Home: 'first',
}

/** What the closed trigger's keys read at one draw. */
interface Closed {
  readonly choose: (value: string) => void
  readonly disabled: boolean
  readonly entries: readonly Entry[]
  readonly multiple: boolean
  readonly open: (opening: ListOpening) => void
  readonly standing: boolean
  readonly typeahead: Typeahead
  readonly value: string
}

/** Whether a key types one character, with nothing held that makes it a command. */
const typesOne = (press: KeyPress): boolean =>
  !press.alt && !press.control && !press.meta && [...press.key].length === 1

/** A typed letter: chooses, or under `multiple` opens the list on what it matched. */
const typed = (press: KeyPress, now: Closed): boolean => {
  const shown = reachable(now.entries)
  const at = now.typeahead.match(
    press.key,
    shown.map((one) => one.text),
    shown.findIndex((one) => one.value === now.value),
  )
  const match = shown[at]?.value
  if (match !== undefined && now.multiple) {
    now.open({ value: match, where: 'selected' })
  } else if (match !== undefined) {
    now.choose(match)
  }
  return true
}

/** The inline arrows step the choice, the other way round on a right-to-left page. */
const stepped = (press: KeyPress, now: Closed): boolean => {
  const forward = press.key === 'ArrowRight' ? 1 : -1
  const by = I18nManager.isRTL ? -forward : forward
  const shown = reachable(now.entries)
  const next = shown[Math.max(0, shown.findIndex((one) => one.value === now.value) + by)]
  if (next !== undefined) {
    now.choose(next.value)
  }
  return true
}

/** What a key does to the closed trigger, and whether it took it. */
export const closedKey = (press: KeyPress, now: Closed): boolean => {
  if (now.disabled || now.standing) {
    return false
  }
  if (typesOne(press) && (press.key !== ' ' || now.typeahead.typing())) {
    return typed(press, now)
  }
  const inline = press.key === 'ArrowLeft' || press.key === 'ArrowRight'
  if (inline && !now.multiple && !press.alt && !press.control && !press.meta) {
    return stepped(press, now)
  }
  const where = OPENS[press.key]
  if (where === undefined) {
    return false
  }
  /* Up opens on the chosen option where there is one, and on the last where there is none. */
  now.open({
    where: where === 'last' && press.key === 'ArrowUp' && now.value !== '' ? 'selected' : where,
  })
  return true
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
const requesterOf =
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
const closeIf = (toggled: Turned | undefined): void => {
  if (toggled?.checked === true) {
    toggled.turn()
  }
}

/** A view's keys on the closed trigger, heard as the view is drawn and let go as it goes. */
const triggerRef =
  (
    listening: { current: (() => void) | undefined },
    closed: { readonly current: Closed | undefined },
  ) =>
  (node: unknown): void => {
    listening.current?.()
    listening.current =
      node === null
        ? undefined
        : keys().listen(node, (press) =>
            closed.current === undefined ? false : closedKey(press, closed.current),
          )
  }

/** Hosts a field that opens a list of options. */
export const useSelect = (
  family: Family,
  props: Props,
  use: MachineUse,
  toggled: Turned | undefined,
  touch: () => void,
): { readonly behavior: Behavior; readonly value: string } => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const multiple = read('multiple') === true
  const disabled = read('disabled') === true
  const written = read('value')
  const seed = wordsIn(read('defaultValue'))
  const [value, setValue] = useWritten(written, seed)
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
    disabled,
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
  const listOwner: ListOwner = {
    again: close,
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
    value,
  }
}
