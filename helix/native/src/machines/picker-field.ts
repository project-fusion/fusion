/**
 * A field of dates or times on a phone, as Date Input and Time Input are: the
 * text it shows, or its rows of segments, the tags of several, the clear and
 * the trigger, and the picker it opens in its panel.
 *
 * **It holds its value, whoever set it**, and moves it through a request a
 * handler can refuse, as the web's does: `before-change`, then `input`, and
 * `change` once the reader is done, as they leave the text or the row, or as
 * a pick in the panel stands. **The text shows each value written** while
 * nobody is in it, and the value itself while somebody is. Core's picker text
 * says what each keystroke, commit, and key leaves, as it does for the web's.
 */

import type { Flag } from '@fusion.dev/helix-core/machines/validation/machine'
import { pickerDisplay } from '@fusion.dev/helix-core/picker-text'
import { useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, PartBinding, Props } from '../render/behavior'
import type { Family } from '../style/form'
import type { Around } from './binder'
import { kebab, useHeldWords, wordsIn } from './date-picker-read'
import { type FieldKind, type Read, sayIn } from './picker-field-kind'
import { fieldParts, type Moves } from './picker-field-parts'
import { useSegments } from './picker-field-segments'
import { boundTo, given, tell } from './props'
import type { Spun } from './spin'

/** What a picker field hands the verdict, beside its drawing. */
export interface PickerFielded {
  readonly behavior: Behavior
  /** What is wrong with the values, in the field's own words. */
  readonly spun: Spun | undefined
  readonly value: string
}

/** The kind of field each family is, by the words its tag ends with. */
export type KindOf = (read: Read) => FieldKind

/** Sends `event` where the form binds it, from a field that holds `value`. */
const sender =
  (family: Family, props: Props, use: MachineUse, value: () => string) =>
  (name: string, detail: Readonly<Record<string, unknown>> = {}): boolean => {
    const event = boundTo(use, name, 'event')
    return event === undefined || tell(family, props, event, detail, { value: value() })
  }

/** The verdict a field's values earn: a fault, half-set segments, or a required row left empty. */
const verdictOf = (
  kind: FieldKind,
  value: string,
  partial: boolean,
  read: Read,
  segmented: boolean,
): Spun | undefined => {
  const say = sayIn(read, kind.lang)
  if (partial) {
    const message =
      wordsIn(read('bad-input-message')) || say('incomplete-message', { kind: kind.segmented })
    return { flaw: undefined, locale: '', said: { flag: 'badInput', message } }
  }
  if (segmented && value === '' && read('required') === true) {
    const message =
      wordsIn(read('value-missing-message')) || say('empty-message', { kind: kind.segmented })
    return { flaw: undefined, locale: '', said: { flag: 'valueMissing', message } }
  }
  const fault = kind.fault(value)
  if (fault === '') {
    return undefined
  }
  return typeof fault === 'string'
    ? { flaw: undefined, locale: '', said: { flag: 'badInput', message: fault } }
    : { flaw: undefined, locale: '', said: { flag: fault[0] as Flag, message: fault[1] } }
}

/** Hosts a field of dates or times, as the expansion binds it. */
export const usePickerField = (
  family: Family,
  props: Props,
  use: MachineUse,
  around: Pick<Around, 'layering' | 'toggled' | 'touch'>,
  kindOf: KindOf,
): PickerFielded => {
  const read: Read = (name) => given(family, props, kebab(name))
  const kind = kindOf(read)
  const flag = (name: string): string => boundTo(use, name, 'state') ?? kebab(name)
  const [value, setValue] = useHeldWords(
    props.value,
    wordsIn(given(family, props, boundTo(use, 'defaultProp', 'prop'))),
  )
  const held = value ?? ''
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [expanded, setExpanded] = useState(false)
  const disabled = read('disabled') === true
  const readonly = read('readonly') === true
  const editable = !disabled && !readonly
  const latest = useRef(held)
  latest.current = held
  const send = sender(family, props, use, () => latest.current)
  const kept = {
    control: useRef(null),
    entered: useRef(held),
    pressing: useRef(false),
    returning: useRef(false),
  }
  /* A request stands once `before-change` does, and says `input`. */
  const request = (next: string): boolean => {
    if (next === latest.current) {
      return true
    }
    if (readonly || !send('onBeforeChange', { value: next })) {
      return false
    }
    latest.current = next
    setValue(next)
    send('onInput')
    around.touch()
    return true
  }
  const settle = (): void => {
    send('onChange')
  }
  const segmented = read('segmented') === true && kind.mode !== 'multiple'
  const rows = useSegments({
    count: kind.mode === 'range' ? 2 : 1,
    editable,
    emptyWords: wordsIn(read('empty-segment-label')),
    kind,
    label: wordsIn(read('label')) || wordsIn(read('aria-label')),
    request,
    rowWords: [wordsIn(read('range-start-label')), wordsIn(read('range-end-label'))],
    settle,
    value: held,
  })
  const turned = useRef(around.toggled)
  turned.current = around.toggled
  const open = around.toggled?.checked === true
  const moves: Moves = {
    clear: () => {
      if (latest.current !== '' && request('')) {
        settle()
        send('onClear')
      }
    },
    close: () => {
      if (turned.current?.checked === true) {
        turned.current.turn()
      }
    },
    open: (from) => {
      if (turned.current?.checked !== true && editable) {
        if (from === 'trigger') {
          around.layering.enter?.('first')
        }
        turned.current?.turn()
      }
    },
    picked: (next) => {
      if (!request(next)) {
        return false
      }
      settle()
      return true
    },
    request,
    setDraft,
    setEditing,
    settle,
    toggleExpanded: () => setExpanded((was) => !was),
  }
  const display = pickerDisplay(
    { draft, editing, iso: kind.iso, mode: kind.mode, value: held },
    kind.text,
  )
  const { binding, lists, states } = fieldParts({
    disabled,
    display,
    draft,
    editable,
    expanded,
    flag,
    held: kept,
    kind,
    moves,
    open,
    read,
    segmented,
    value: held,
  })
  const parts: Record<string, PartBinding> = { ...binding, segment: rows.binding }
  return {
    behavior: {
      marks: held === '' ? ['blank'] : [],
      parts: {
        ...parts,
        host: {
          lists: { ...lists, [flag('segments')]: segmented ? rows.entries : [] },
          states: { ...states, [flag('segmented')]: segmented },
        },
      },
    },
    spun: verdictOf(kind, held, segmented && rows.partial, read, segmented),
    value: held,
  }
}
