/**
 * A picker field's rows of segments on a phone: one row for a date or a time
 * and two for a range, each segment a field of its own, set with digits the
 * keyboard types, a letter for the half of the day, a screen reader's
 * increment and decrement, and the arrows of a hardware keyboard. Core's date
 * segments say what each key does to the parts, as the web's segments do.
 *
 * **The parts may be fewer than a whole value**, so the row holds them, and a
 * value from anywhere else, a pick in the panel or the page, is what the row
 * shows. Leaving the row says `change` once, where the value moved.
 */

import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import {
  isTwelveHourLayout,
  latinDigits,
  type SegmentKind,
  type Segments,
  segmentKey,
  segmentName,
  segmentRowsOf,
  segmentRowsPartial,
  segmentRowsValue,
  segmentText,
  segmentValueText,
  shownValue,
  withRow,
} from '@fusion.dev/helix-core/picker-text'
import { useRef, useState } from 'react'
import { TextInput } from 'react-native'
import type { PartBinding } from '../render/behavior'
import type { Entry } from '../render/entry'
import type { FieldKind } from './picker-field-kind'

/** What the rows read beside the kind: the value, and what moves it. */
export interface SegmentsAsked {
  readonly count: number
  readonly editable: boolean
  readonly kind: FieldKind
  /** The words a segment's name ends with: the field's label. */
  readonly label: string
  readonly rowWords: readonly [string, string]
  /** Words a screen reader hears for an empty segment. */
  readonly emptyWords: string
  /** Asks for a value, and answers whether it stood. */
  readonly request: (value: string) => boolean
  /** Says `change`, once the reader leaves the row with the value moved. */
  readonly settle: () => void
  readonly value: string
}

/** What the rows give the field. */
export interface SegmentsHeld {
  readonly binding: PartBinding
  /** Each segment and literal, as the copies of the row draw them. */
  readonly entries: readonly Readonly<Record<string, unknown>>[]
  /** Whether a reader has left a row half set. */
  readonly partial: boolean
  /** Puts focus in the first segment. */
  readonly focusFirst: () => void
}

/** A field a segment is drawn as. */
interface Focusable {
  readonly focus?: () => void
}

/** One segment's place: its row and its kind. */
interface Place {
  readonly kind: string
  readonly row: number
}

/** Where one segment stands: its key, its row's parts, and whether it holds focus. */
interface Standing {
  readonly focused: boolean
  readonly key: string
  readonly parts: Segments
  readonly row: number
  readonly rows: number
}

/** One segment's entry: what it shows, what it is named, and what a screen reader hears of it. */
const segmentEntry = (
  asked: SegmentsAsked,
  { focused, key, parts, row, rows }: Standing,
  kind: SegmentKind,
): Readonly<Record<string, unknown>> => {
  const { locale, system } = asked.kind
  const twelve = isTwelveHourLayout(asked.kind.layout)
  const empty = shownValue(kind, parts, twelve) === undefined
  const named = [segmentName(kind, locale), rows > 1 ? asked.rowWords[row] : '', asked.label]
  return {
    empty,
    field: true,
    focused,
    inputMode: kind === 'dayPeriod' ? 'text' : 'numeric',
    key,
    kind,
    label: named.filter(Boolean).join(', '),
    literal: false,
    placeholder: segmentText(kind, parts, twelve, locale),
    row,
    said: empty ? asked.emptyWords : segmentValueText(kind, parts, twelve, locale, system),
    separator: false,
    shown: empty ? '' : segmentText(kind, parts, twelve, locale),
    words: '',
  }
}

/** The rows' entries: each segment, each literal between them, and the dash between two rows. */
const entriesOf = (
  asked: SegmentsAsked,
  rows: readonly Segments[],
  focused: string,
): Readonly<Record<string, unknown>>[] => {
  const { kind } = asked
  const out: Readonly<Record<string, unknown>>[] = []
  rows.forEach((parts, row) => {
    if (row > 0) {
      out.push({ field: false, key: 'separator', literal: true, separator: true, words: ' – ' })
    }
    kind.layout.forEach((slot, at) => {
      const key = `${row}-${at}`
      if ('literal' in slot) {
        out.push({ field: false, key, literal: true, separator: false, words: slot.literal })
        return
      }
      out.push(
        segmentEntry(
          asked,
          { focused: focused === key, key, parts, row, rows: rows.length },
          slot.kind,
        ),
      )
    })
  })
  return out
}

/**
 * What a keystroke put into a segment's text, wherever the caret stood: the
 * words between what is unchanged at its start and at its end.
 */
export const inserted = (before: string, after: string): string => {
  let start = 0
  while (start < before.length && before[start] === after[start]) {
    start += 1
  }
  const room = before.length - start
  let end = 0
  while (end < room && before.at(-1 - end) === after.at(-1 - end)) {
    end += 1
  }
  return after.slice(start, after.length - end)
}

/** The arrows that move between segments, by the way each moves. */
const ALONG: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 }

/** The hardware keys a segment hears that type nothing. */
const STEPS = new Set(['ArrowDown', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp'])

/** Hosts a picker field's rows of segments. */
export const useSegments = (asked: SegmentsAsked): SegmentsHeld => {
  const { count, kind, value } = asked
  const [rows, setRows] = useState<Segments[]>(() =>
    segmentRowsOf(kind.segmented, value, count, kind.system),
  )
  const [focused, setFocused] = useState('')
  const typed = useRef('')
  /* The segment the digits so far were typed in. */
  const typedIn = useRef('')
  const own = useRef(false)
  const entered = useRef<string | undefined>(undefined)
  const views = useRef(new Map<string, Focusable>()).current
  const order = useRef<string[]>([])
  /* A value from anywhere else is what the rows show; one a segment made is already there. */
  const seen = useRef({ count, value })
  if (seen.current.value !== value || seen.current.count !== count) {
    seen.current = { count, value }
    if (
      !own.current &&
      (rows.length !== count ||
        segmentRowsValue(kind.segmented, rows, kind.layout, kind.system) !== value)
    ) {
      setRows(segmentRowsOf(kind.segmented, value, count, kind.system))
    }
    own.current = false
  }
  const latest = useRef({ asked, rows })
  latest.current = { asked, rows }
  const twelve = isTwelveHourLayout(kind.layout)
  const take = (row: number, next: Segments): void => {
    const now = latest.current
    const all = withRow(now.rows, row, next)
    const made = segmentRowsValue(kind.segmented, all, kind.layout, kind.system)
    latest.current = { ...now, rows: all }
    setRows(all)
    if (made !== now.asked.value) {
      own.current = true
      if (!now.asked.request(made)) {
        own.current = false
        setRows(segmentRowsOf(kind.segmented, now.asked.value, count, kind.system))
      }
    }
  }
  const move = (from: string, by: number): void => {
    typedIn.current = ''
    const at = order.current.indexOf(from)
    views.get(order.current[at + by] ?? '')?.focus?.()
  }
  const edit = (place: Place & { readonly key: string }, key: string): boolean => {
    if (!latest.current.asked.editable) {
      return false
    }
    const done = segmentKey(key, {
      kind: place.kind as never,
      locale: kind.locale,
      segments: latest.current.rows[place.row] ?? {},
      system: kind.system,
      twelve,
      typed: typed.current,
    })
    if (done === null) {
      return false
    }
    typed.current = done.typed
    take(place.row, done.segments)
    if (done.advance) {
      move(place.key, 1)
    }
    return true
  }
  const erase = (place: Place & { readonly key: string }): void => {
    if (!edit(place, 'Backspace') && latest.current.asked.editable) {
      typed.current = ''
      move(place.key, -1)
    }
  }
  const entries = entriesOf(asked, rows, focused)
  order.current = entries.filter((one) => one.field === true).map((one) => String(one.key))
  const placeOf = (item: Entry) => ({
    key: String(item.fields.key),
    kind: String(item.fields.kind),
    row: Number(item.fields.row ?? 0),
  })
  const heard = (item: Entry) => (press: KeyPress) => {
    const place = placeOf(item)
    if (press.alt || press.control || press.meta) {
      return false
    }
    const by = ALONG[press.key]
    if (by !== undefined) {
      typed.current = ''
      move(place.key, by)
      return true
    }
    return STEPS.has(press.key) && edit(place, press.key)
  }
  const listening = useRef(new Map<string, () => void>()).current
  const binding: PartBinding = {
    copy: (item: Entry) => {
      const place = placeOf(item)
      const shown = String(item.fields.shown ?? '')
      return {
        accessibilityActions: [{ name: 'increment' }, { name: 'decrement' }],
        accessibilityValue: { text: String(item.fields.said ?? '') },
        autoCapitalize: 'none',
        caretHidden: true,
        contextMenuHidden: true,
        editable: latest.current.asked.editable,
        onAccessibilityAction: (event: {
          readonly nativeEvent: { readonly actionName: string }
        }) => {
          edit(place, event.nativeEvent.actionName === 'increment' ? 'ArrowUp' : 'ArrowDown')
        },
        onBlur: () => {
          setFocused((was) => (was === place.key ? '' : was))
          /* A frame on, where focus has gone to the next segment or out of the row. */
          requestAnimationFrame(() => {
            if (
              !order.current.some(
                (one) => views.get(one) === TextInput.State.currentlyFocusedInput(),
              )
            ) {
              if (entered.current !== undefined && entered.current !== latest.current.asked.value) {
                latest.current.asked.settle()
              }
              entered.current = undefined
              typedIn.current = ''
            }
          })
        },
        onChangeText: (text: string) => {
          if (text.length < shown.length || text === '') {
            erase(place)
            return
          }
          const added = latinDigits(inserted(shown, text))
          for (const character of added) {
            edit(place, character)
          }
        },
        onFocus: () => {
          /* Digits run on in the segment they were typed in, though iOS focuses it
             again as its text is written back. */
          if (typedIn.current !== place.key) {
            typed.current = ''
          }
          typedIn.current = place.key
          setFocused(place.key)
          if (entered.current === undefined) {
            entered.current = latest.current.asked.value
          }
        },
        onSubmitEditing: () => move(place.key, 1),
        ref: (node: Focusable | null) => {
          listening.get(place.key)?.()
          listening.delete(place.key)
          if (node === null) {
            views.delete(place.key)
            return
          }
          views.set(place.key, node)
          listening.set(place.key, keys().listen(node, heard(item)))
        },
        /* The caret stays at the end, so what the keyboard types follows the text. */
        selection: { end: shown.length, start: shown.length },
        submitBehavior: 'submit',
        value: shown,
      }
    },
  }
  return {
    binding,
    entries,
    focusFirst: () => views.get(order.current[0] ?? '')?.focus?.(),
    partial: segmentRowsPartial(kind.segmented, rows, value, kind.layout, kind.system),
  }
}
