/**
 * A heatmap's selection on a phone, as the web's element holds it: under
 * `selection-mode` a press, a tap, Enter or Space selects the cell the reading
 * rests on or lets it go, and under `multiple` Shift with a key that moves
 * the reading takes in every cell from the last one pressed, or the rectangle
 * between the two under `selection-shape="rectangle"`.
 *
 * **`value` names each selected day** by the date its row's header carries,
 * or by the row's name, and a change asks first, with `before-change`
 * carrying the value it would leave, tells `change` once it stands, and says
 * how many are selected in `selection-label`.
 */

import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { commaList, heatmapStretch, pressedValue } from '@fusion.dev/helix-core/chart'
import { rangeAdd } from '@fusion.dev/helix-core/listbox'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { useMemo, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import { useHeldWords, wordsIn } from './date-picker-read'
import { boundTo, tell } from './props'

type Read = (name: string) => unknown

/** What the selection reads of the strip. */
export interface SelectionSetup {
  /** The name every row of the table stands for in `value`, oldest first. */
  readonly all: readonly string[]
  /** How many of the oldest rows a narrow strip leaves undrawn. */
  readonly dropped: number
  readonly lang: string
  /** The cells to a column. */
  readonly rows: number
}

/** The keys that move the reading, which take a range in with Shift. */
const MOVES = /^(Arrow|Page|Home$|End$)/

/** What the selection gives the strip. */
export interface Selection {
  /** Whether a reader can select cells at all. */
  readonly asked: boolean
  /** Whether the drawn cell at this place is selected. */
  readonly chosen: (index: number) => boolean
  /** Selects the drawn cell at this place, or lets it go, as a press does. */
  readonly press: (index: number) => void
  /** Hears a key that moved the reading from `from` to `at`, taking a range in with Shift. */
  readonly keyed: (key: KeyPress, at: number, from: number) => void
  /** How many are selected, in words, from the first change. */
  readonly said: string
  readonly value: string
}

/** Holds the cells selected under `selection-mode`. */
export const useHeatmapSelection = (
  family: Family,
  props: Props,
  use: MachineUse,
  read: Read,
  setup: SelectionSetup,
): Selection => {
  const mode = wordsIn(read('selection-mode'))
  const asked = mode === 'single' || mode === 'multiple'
  const [value, setValue] = useHeldWords(read('value'), '')
  const [said, setSaid] = useState('')
  /* The value written last, which a second key in the same draw reads. */
  const latest = useRef(value ?? '')
  latest.current = value ?? ''
  /* Where a range starts, as a row of the table; what a rectangle is added to; the value it wrote. */
  const held = useRef({ anchor: -1, base: undefined as string[] | undefined, shaped: '' })
  const choose = (next: string) => {
    if (next === latest.current) {
      return
    }
    const asks = boundTo(use, 'onBeforeChange', 'event')
    if (asks !== undefined && !tell(family, props, asks, { value: next })) {
      return
    }
    latest.current = next
    setValue(next)
    const words = wordsIn(read('selection-label'))
    setSaid(formatMessage(words, { count: commaList(next).length }, setup.lang || 'en'))
    const changed = boundTo(use, 'onChange', 'event')
    if (changed !== undefined) {
      tell(family, props, changed, {})
    }
  }
  const drawnKeys = setup.all.slice(setup.dropped)
  const press = (index: number) => {
    const key = drawnKeys[index]
    if (!asked || key === undefined || key === '') {
      return
    }
    held.current = { ...held.current, anchor: setup.dropped + index, base: undefined }
    choose(pressedValue(mode, latest.current, key))
  }
  const stretch = (to: number, from: number) => {
    const now = held.current
    if (setup.all[now.anchor] === undefined) {
      now.anchor = setup.dropped + (from < 0 ? to : from)
    }
    const corner = setup.all[now.anchor]
    const base =
      now.base === undefined || latest.current !== now.shaped
        ? commaList(latest.current).filter((one: string) => one !== corner)
        : now.base
    now.base = base
    const taken = heatmapStretch({ ...setup, anchor: now.anchor, base, to })
    choose(taken.join(', '))
    now.shaped = latest.current
  }
  const keyed = (key: KeyPress, at: number, from: number) => {
    if (!asked || at < 0 || key.alt || key.control || key.meta) {
      return
    }
    if (!key.shift || !MOVES.test(key.key) || mode !== 'multiple') {
      return
    }
    if (wordsIn(read('selection-shape')) === 'rectangle') {
      stretch(at, from)
      return
    }
    const anchor = held.current.anchor
    const start = setup.all[anchor] === undefined ? -1 : anchor
    const added = rangeAdd(commaList(latest.current), setup.all, start, setup.dropped + at)
    if (added) {
      choose(added.join(', '))
    }
  }
  const shown = asked ? (value ?? '') : ''
  const drawnKey = drawnKeys.join('\n')
  /* One answer while the selection and the cells drawn are the same, so the cells stay drawn. */
  const chosen = useMemo(() => {
    const picked = new Set(commaList(shown))
    const named = drawnKey.split('\n')
    return (index: number) => picked.has(named[index] ?? '')
  }, [drawnKey, shown])
  return {
    asked,
    chosen,
    keyed,
    press,
    said,
    value: value ?? '',
  }
}
