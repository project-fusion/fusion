/**
 * The parts of a list of options that hold across its draws: the value, the
 * filter, what a list says as a filter narrows it, a finger's move, and how its
 * options join.
 */
import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import { measure } from '@fusion.dev/helix-core/capabilities/measure'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import { type EdgeFollow, edgeFollow } from './edge-follow'
import { type Drag, type Entry, type Held, landing, movesWith, reordered } from './listbox-model'
import { boundTo, given, tell, told } from './props'
import type { VirtualFocus } from './virtual-focus'
import type { WindowDrag } from './window'

/** The words of a move a screen reader hears, where the page names none. */
const MOVED = '{name} moved to position {position} of {count}'

/** How near an edge of the list, in points, a held option scrolls it. */
const EDGE = 24

/** How far a held option near an edge scrolls the list each frame, in points. */
const EDGE_STEP = 8

/** The value a prop holds as words. */
export const wordsIn = (value: unknown): string => (typeof value === 'string' ? value : '')

/** What the page writes, once it writes a new one, and between writes what a reader chose. */
export const useWritten = (written: unknown, seed: string) => {
  const [held, setHeld] = useState(typeof written === 'string' ? written : seed)
  const [seen, setSeen] = useState(written)
  if (seen !== written) {
    setSeen(written)
    if (typeof written === 'string') {
      setHeld(written)
    }
  }
  return [held, setHeld] as const
}

/** What the options join, and a redraw that runs once, however many ask for it. */
export const useMembers = () => {
  const [, redraw] = useState(0)
  const held = useRef<Held>({ groups: [], members: new Map(), order: [], pass: [] }).current
  const scheduled = useRef(false)
  const schedule = (): void => {
    if (!scheduled.current) {
      scheduled.current = true
      void Promise.resolve().then(() => {
        scheduled.current = false
        redraw((at) => at + 1)
      })
    }
  }
  return { held, schedule }
}

/** The filter: what the page writes, and what a reader types, asking first and waiting out the delay. */
export const useFilter = (family: Family, props: Props, use: MachineUse, focus: VirtualFocus) => {
  const before = boundTo(use, 'onBeforeFilter', 'event')
  const after = boundTo(use, 'onFilter', 'event')
  const seed = wordsIn(given(family, props, boundTo(use, 'defaultFilter', 'prop')))
  const [filter, setFilter] = useWritten(given(family, props, boundTo(use, 'filter', 'prop')), seed)
  const [draft, setDraft] = useState<string | undefined>(undefined)
  const waiting = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const clearWaiting = (): void => {
    clearTimeout(waiting.current)
    waiting.current = undefined
  }
  useEffect(() => () => clearTimeout(waiting.current), [])
  const ask = (next: string): void => {
    clearWaiting()
    setDraft(undefined)
    if (
      next === filter ||
      (before !== undefined && !tell(family, props, before, { value: next }))
    ) {
      return
    }
    focus.release()
    setFilter(next)
    if (after !== undefined) {
      told(family, props, after, { value: next })
    }
  }
  const delay = Number(given(family, props, boundTo(use, 'filterDelay', 'prop')) ?? 0)
  const typed = (next: string): void => {
    if (!(delay > 0)) {
      ask(next)
      return
    }
    clearWaiting()
    setDraft(next)
    waiting.current = setTimeout(() => ask(next), delay)
  }
  const flush = (): void => {
    if (draft !== undefined) {
      ask(draft)
    }
  }
  return { ask, draft, filter, flush, typed }
}

/** Says how many options a filter left, and what a load brought, as the web's live region does. */
export const useTelling = (
  family: Family,
  props: Props,
  use: MachineUse,
  filter: string,
  loading: boolean,
  entries: readonly Entry[],
): void => {
  const count = entries.filter((one) => !one.hidden).length
  const before = useRef({ filter, loading })
  useEffect(() => {
    const was = before.current
    before.current = { filter, loading }
    const loaded = was.loading && !loading
    const narrowed = was.filter !== filter && filter !== ''
    if ((narrowed || loaded) && count > 0) {
      const sentence = wordsIn(given(family, props, boundTo(use, 'resultsLabel', 'prop')))
      announce().say(formatMessage(sentence, { count }, locale().read()), 'polite')
    }
  })
}

/** Asks for a move of an option, and says it once it stands. */
export const moveOption = (
  family: Family,
  props: Props,
  use: MachineUse,
  entries: readonly Entry[],
  key: object,
  to: number,
): void => {
  const found = reordered(entries, key, to)
  if (found === undefined) {
    return
  }
  const { from, moved, order, size } = found
  const detail = { from, key: moved.value, keys: order, kind: 'item', to, value: order.join(',') }
  const before = boundTo(use, 'onBeforeReorder', 'event')
  if (before !== undefined && !tell(family, props, before, detail)) {
    return
  }
  const after = boundTo(use, 'onReorder', 'event')
  if (after !== undefined) {
    told(family, props, after, detail)
  }
  const sentence = wordsIn(given(family, props, 'moved-label')) || MOVED
  const values = { count: size, name: moved.text, position: to + 1 }
  announce().say(formatMessage(sentence, values, locale().read()), 'polite')
}

/** Scrolls the list while a finger rests near one of its edges. */
const followEdge = (
  edge: EdgeFollow,
  frame: unknown,
  finger: number,
  scrollBy: (by: number) => void,
): void => {
  const list = frame ? measure().box(frame) : null
  edge.follow((frames) => {
    if (list === null) {
      return false
    }
    const near = finger - list.y < EDGE ? -1 : list.y + list.height - finger < EDGE ? 1 : 0
    if (near !== 0) {
      scrollBy(near * EDGE_STEP * frames)
    }
    return near !== 0
  })
}

/** A finger held on an option lifts it, and its travel says where it would land. */
export const useOptionDrag = (
  latest: RefObject<() => readonly Entry[]>,
  held: Held,
  move: RefObject<(key: object, to: number) => void>,
  frame: RefObject<unknown>,
  scrollBy: RefObject<(by: number) => void>,
) => {
  const [drag, setDrag] = useState<Drag | undefined>(undefined)
  const now = useRef(drag)
  const edge = useRef(edgeFollow()).current
  useEffect(() => edge.stop, [edge])
  const dragging = useMemo((): WindowDrag & { readonly pick: (key: object) => void } => {
    const set = (next: Drag | undefined): void => {
      now.current = next
      setDrag(next)
    }
    return {
      end: () => {
        edge.stop()
        const was = now.current
        set(undefined)
        if (was !== undefined) {
          move.current(was.key, was.to)
        }
      },
      move: (_at, along) => {
        const was = now.current
        const land = was === undefined ? undefined : landing(latest.current(), held, was, along)
        if (was === undefined || land === undefined) {
          return
        }
        if (land.to !== was.to) {
          set({ ...was, to: land.to })
        }
        followEdge(edge, frame.current, land.finger, (by) => scrollBy.current(by))
      },
      pick: (key) => {
        const at = movesWith(latest.current(), key).findIndex((one) => one.key === key)
        set({ from: at, key, to: at })
      },
      start: () => undefined,
    }
  }, [edge, frame, held, latest, move, scrollBy])
  return { drag, dragging }
}
