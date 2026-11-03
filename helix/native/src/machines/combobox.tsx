/**
 * A text field that filters a list of options on a phone: what is chosen, the row
 * that adds what was typed, and the tags under `multiple`.
 *
 * **Focus stays in the field**, as on the web, so the software keyboard stays up. The
 * list is a drawn Listbox that takes its filter and its value from here. **A phone has
 * no `aria-activedescendant`**: on iOS the field says the highlight and the count in
 * its live region, as the web does on Apple devices, and every option still takes a
 * screen reader's own focus.
 */
import { chosenValues, creationFor, filterKeeps } from '@fusion.dev/helix-core/listbox'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { actionsOf, hostStates } from './combobox-actions'
import { answersOf } from './combobox-answers'
import type { FieldNow, ListHands } from './combobox-keys'
import { type ChosenOption, selectionOf, tagsOf, useSayingHighlight } from './combobox-model'
import { type Control, partsOf } from './combobox-parts'
import { useTyping } from './combobox-typing'
import type { ListOpening, ListOwner } from './list-owner'
import { useOrder } from './listbox'
import { useMembers, useWritten, wordsIn } from './listbox-hooks'
import { type Entry, entriesOf, type Held } from './listbox-model'
import { OptionOwnerContext } from './option'
import { boundTo, given, tell, told } from './props'
import { closeIf, heldOwner, requesterOf } from './select'
import type { Turned } from './toggle'
import { reachable } from './virtual-focus'

/** `selected` on an option is the value where none is written, as on a native select. */
const useSeeded = (
  held: Held,
  multiple: boolean,
  seedable: boolean,
  setValue: (next: string) => void,
): void => {
  const seeded = useRef(false)
  useLayoutEffect(() => {
    if (seeded.current || held.order.length === 0) {
      return
    }
    seeded.current = true
    const declared = [...held.members.values()].filter((one) => one.declared)
    if (seedable && declared.length > 0) {
      const values = declared.map((one) => one.value)
      setValue(multiple ? values.join(',') : (values.at(-1) ?? ''))
    }
  })
}

/** The chosen options, in the value's order, with their words where an option holds them. */
const chosenOf = (values: readonly string[], entries: readonly Entry[]): ChosenOption[] => {
  const words = new Map(entries.map((one) => [one.value, one.text]))
  return values
    .filter((one) => entries.length > 0 || words.has(one))
    .map((one) => ({ text: words.get(one) ?? one, value: one }))
}

/**
 * What the field shows: the text while a reader types, and the chosen words
 * otherwise. **From the first letter**, before the list it opens has drawn: a phone's
 * text field written back to the chosen words for one draw drops the letter.
 */
const shownOf = (
  multiple: boolean,
  editing: boolean,
  typedWords: string,
  chosenWords: string,
): string => (multiple || editing ? typedWords : chosenWords)

/** What a close spends, and what an open selects, once each. */
const useOpenAndClose = (
  open: boolean,
  manual: boolean,
  selectable: boolean,
  leave: () => void,
  clear: () => void,
  setSelectsAll: (all: boolean) => void,
): void => {
  const was = useRef(open)
  const latest = useRef({ clear, leave, manual, selectable })
  latest.current = { clear, leave, manual, selectable }
  useLayoutEffect(() => {
    const closed = was.current && !open
    was.current = open
    if (closed) {
      latest.current.leave()
      latest.current.clear()
    }
    setSelectsAll(open && latest.current.selectable)
  }, [open, setSelectsAll])
}

/** Asks the page before the list narrows, and tells it after; answers whether it may. */
const filterAsker =
  (family: Family, props: Props, use: MachineUse) =>
  (text: string): boolean => {
    const before = boundTo(use, 'onBeforeFilter', 'event')
    if (before !== undefined && !tell(family, props, before, { value: text })) {
      return false
    }
    const after = boundTo(use, 'onFilter', 'event')
    if (after !== undefined) {
      told(family, props, after, { value: text })
    }
    return true
  }

/** Hosts a text field that filters a list of options. */
export const useCombobox = (
  family: Family,
  props: Props,
  use: MachineUse,
  toggled: Turned | undefined,
  touch: () => void,
): { readonly behavior: Behavior; readonly value: string } => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const flag = (name: string): boolean => read(name) === true
  const word = (name: string): string => wordsIn(read(name))
  const multiple = flag('multiple')
  const disabled = flag('disabled')
  const readonly = flag('readonly')
  const manual = word('openOn') === 'manual'
  const written = read('value')
  const seed = word('defaultValue')
  const [value, setValue] = useWritten(written, seed)
  const { held, schedule } = useMembers()
  useOrder(held, schedule)
  const entriesFor = (text: string): Entry[] =>
    entriesOf(undefined, held, (words) => filterKeeps(words, text.trim(), undefined))
  const typing = useTyping({
    ask: filterAsker(family, props, use),
    delay: Number(read('filterDelay') ?? 0),
    entriesFor,
    suggests: flag('suggest'),
  })
  const { editing, onCreate, suggestion, typed } = typing
  const entries = entriesFor(typing.filter)
  useSeeded(held, multiple, seed === '' && typeof written !== 'string', setValue)
  const created = useRef(new Set<string>()).current
  const known = new Set([...created, ...entries.map((one) => one.value)])
  const values = chosenValues(value, known, multiple)
  const chosen = chosenOf(values, entries)
  const open = toggled?.checked === true
  const [active, setActive] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState('')
  const hands = useRef<ListHands | undefined>(undefined)
  const opening = useRef<ListOpening>({ where: 'none' })
  const emptied = useRef(false)
  const refocusing = useRef(false)
  const control = useRef<Control>(null)
  const asked = requesterOf(family, props, use, value, setValue, touch)
  const request = (next: string): boolean => !readonly && asked(next)
  /* A press and a letter in one batch both read the list closed, and a handler from
     an earlier draw reads it as it stood then, so a second turn closed it again:
     each reads the toggle as last drawn, and an open asked waits for the next draw. */
  const turned = useRef(toggled)
  turned.current = toggled
  const asking = useRef(false)
  useLayoutEffect(() => {
    asking.current = false
  })
  const openList = (where: ListOpening['where']): void => {
    if (turned.current?.checked !== true && !asking.current && !readonly && !disabled) {
      asking.current = true
      opening.current = { where }
      turned.current?.turn()
    }
  }
  const focusField = (): void => {
    refocusing.current = true
    control.current?.focus?.()
    refocusing.current = false
  }
  const close = (): void => {
    closeIf(turned.current)
    focusField()
  }
  const chosenWords = chosen[0]?.text ?? ''
  const shown = shownOf(multiple, editing, suggestion || typed, chosenWords)
  const creation = creationFor(typed, flag('creatable'), entries)
  const { commitEmptied, commitTyped, create, drop } = answersOf({
    allowsCustom: flag('allowsCustomValue'),
    asksCreate: (one) => {
      const asks = boundTo(use, 'onCreate', 'event')
      return asks === undefined || tell(family, props, asks, { value: one })
    },
    clear: typing.clear,
    close,
    created,
    creation,
    editing,
    emptied,
    entries,
    multiple,
    request,
    typed,
    value,
    values,
  })
  useOpenAndClose(
    open,
    manual,
    !editing && !multiple && chosenWords !== '',
    commitEmptied,
    typing.clear,
    typing.setSelectsAll,
  )
  const wordsOf = (one: string): string => entries.find((each) => each.value === one)?.text ?? ''
  const reach = reachable(entries).map((one) => one.value)
  useSayingHighlight({
    active: onCreate ? '' : active,
    chosen: values,
    count: reach.length,
    open,
    resultsLabel: word('resultsLabel'),
    selectedLabel: word('selectedLabel'),
    setStatus,
    wordsOf,
  })
  const actions = actionsOf({
    clear: typing.clear,
    close,
    closeList: () => closeIf(turned.current),
    commitEmptied,
    disabled,
    drop,
    edit: typing.edit,
    editing,
    emptied,
    focusField,
    known,
    manual,
    multiple,
    open,
    openList,
    openOnFocus: word('openOn') === 'focus',
    refocusing,
    request,
    selectedLabel: word('selectedLabel'),
    setStatus,
    values,
    wordsOf,
  })
  const now: FieldNow = {
    active,
    allowsCustom: flag('allowsCustomValue'),
    back: () => {
      emptied.current = false
    },
    chosenCount: values.length,
    clearChoice: () => request(''),
    close,
    commitTyped,
    create,
    creation,
    disabled,
    dropLast: actions.dropLast,
    flush: typing.flush,
    hands: hands.current,
    leave: actions.leave,
    multiple,
    onCreate,
    open,
    openOn: openList,
    reachable: reach,
    readonly,
    setOnCreate: typing.setOnCreate,
    showing: entries.some((one) => !one.hidden),
    typed,
    value,
  }
  const latest = useRef(now)
  latest.current = now
  const listening = useRef<(() => void) | undefined>(undefined)
  const onText = useRef(false)
  const owner = useMemo(() => heldOwner(held, schedule), [held, schedule])
  const listOwner: ListOwner = {
    active: setActive,
    again: close,
    filter: typing.filter,
    hands,
    keepsFocus: true,
    landed: () => undefined,
    get opening() {
      return opening.current
    },
    tab: () => latest.current.leave(),
  }
  const { over, tags } = tagsOf(
    chosen,
    expanded ? 0 : Number(read('maxTags') ?? 0),
    !disabled && !readonly,
    word('removeLabel'),
  )
  const state = (name: string): string => boundTo(use, name, 'state') ?? name
  const parts = partsOf({
    choose: actions.choose,
    control,
    create,
    deleting: typing.deleting,
    disabled,
    drop,
    edit: actions.edit,
    editable: !disabled && !readonly,
    focusField,
    latest,
    listening,
    listOwner,
    multiple,
    onFocused: actions.onFocused,
    onText,
    open,
    openPressed: actions.openPressed,
    selection: selectionOf(typed.length, suggestion, typing.selectsAll, shown),
    shown,
    toggleExpanded: () => setExpanded((was) => !was),
    value,
  })
  return {
    behavior: {
      marks: [...(value === '' ? ['blank'] : []), ...(flag('loading') ? ['loading'] : [])],
      parts: {
        ...parts,
        host: {
          lists: { [state('tags')]: tags },
          states: hostStates(state, {
            chosen,
            creation,
            expandable: flag('expandable'),
            expanded,
            multiple,
            onCreate,
            over,
            status,
            values,
            word,
          }),
        },
      },
      provide: (inside) => (
        <OptionOwnerContext.Provider value={owner}>{inside}</OptionOwnerContext.Provider>
      ),
    },
    value,
  }
}
