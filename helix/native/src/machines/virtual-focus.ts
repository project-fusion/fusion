/**
 * Virtual focus on a phone: a set holds a highlight apart from what is chosen,
 * for a hardware keyboard to move, as the web holds `aria-activedescendant`.
 *
 * **A phone has no `aria-activedescendant`, so a screen reader cannot follow a
 * highlight that moves under a field.** Every item still takes a screen reader's
 * focus of its own. What this machine holds is the drawing: which item shows the
 * highlight, which the keys move from, and how it follows a filter. A set says the
 * highlight aloud where a reader cannot hear it another way, with `said`.
 *
 * Listbox runs it. Select, Combobox, Command, and Time Picker can run it too: each
 * hands in what a reader can reach, and calls `to`, `highlight`, `settle`, and
 * `typed`.
 */
import { measure } from '@fusion.dev/helix-core/capabilities/measure'
import { highlightStep, Typeahead } from '@fusion.dev/helix-core/listbox'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/** An item as the highlight reads it. */
export interface Reached {
  readonly disabled: boolean
  readonly hidden: boolean
  readonly text: string
  readonly value: string
}

/** Where a set may put its highlight, as the web's `highlight()` takes it. */
export type Highlight = 'first' | 'last' | 'none' | 'selected'

/** What a set does with its highlight. */
export interface VirtualFocus {
  /** The value of the item the highlight is on, or `''`. */
  readonly active: string
  /** Puts the highlight where the owner says, without choosing. */
  readonly highlight: (
    where: Highlight,
    items: readonly Reached[],
    chosen: readonly string[],
  ) => void
  /** Whether the reader moved the highlight since the filter last changed. */
  readonly steered: () => boolean
  /** Hands the highlight back to the filter's first match. */
  readonly release: () => void
  /** Keeps the highlight on something showing, as a filter changes what shows. */
  readonly settle: (items: readonly Reached[], filtering: boolean) => void
  /** Moves the highlight by a key that moves it, and answers the value it reached. */
  readonly step: (key: string, from: string, items: readonly Reached[], page: number) => string
  /** Puts the highlight on `value`, as a reader moved it. */
  readonly to: (value: string) => void
  /** Moves to the next item whose words start with the letters typed, or answers `undefined`. */
  readonly typed: (key: string, from: string, items: readonly Reached[]) => string | undefined
  /** Whether letters typed a moment ago are still one search. */
  readonly typing: () => boolean
}

/** The items a reader can reach: those showing and not disabled. */
export const reachable = <Item extends Reached>(items: readonly Item[]): Item[] =>
  items.filter((item) => !item.hidden && !item.disabled)

/**
 * Where the highlight stands as a filter changes what shows: on the first option a
 * filter leaves, until the reader moves it, and otherwise off anything now hidden.
 */
const settled = (
  items: readonly Reached[],
  now: string,
  filtering: boolean,
  parked: boolean,
  steered: boolean,
): string => {
  if (parked) {
    return now
  }
  const first = reachable(items)[0]?.value ?? ''
  if (filtering && !steered) {
    return first
  }
  const showing = items.some((one) => !one.hidden && one.value === now)
  return (filtering || now !== '') && !showing ? first : now
}

/** Hosts a highlight. */
export const useVirtualFocus = (): VirtualFocus => {
  const [active, setActive] = useState('')
  const now = useRef(active)
  const parked = useRef(false)
  const steered = useRef(false)
  const typeahead = useRef(new Typeahead()).current
  const place = useCallback((value: string) => {
    now.current = value
    setActive(value)
  }, [])
  const lasting = useMemo(
    (): Omit<VirtualFocus, 'active'> => ({
      highlight: (where, items, chosen) => {
        const shown = reachable(items)
        typeahead.reset()
        parked.current = where === 'none'
        steered.current = true
        const held =
          where === 'selected' ? shown.find((one) => chosen.includes(one.value)) : undefined
        const picked = where === 'last' ? shown.at(-1) : (held ?? shown[0])
        place(where === 'none' ? '' : (picked?.value ?? ''))
      },
      release: () => {
        steered.current = false
        parked.current = false
      },
      settle: (items, filtering) => {
        const next = settled(items, now.current, filtering, parked.current, steered.current)
        if (next !== now.current) {
          place(next)
        }
      },
      steered: () => steered.current,
      step: (key, from, items, page) => {
        const shown = reachable(items)
        typeahead.reset()
        const at = shown.findIndex((one) => one.value === from)
        const next = shown[highlightStep(key, at, shown.length, page)]?.value ?? ''
        if (next !== '') {
          parked.current = false
          steered.current = true
          place(next)
        }
        return next
      },
      to: (value) => {
        parked.current = false
        steered.current = true
        place(value)
      },
      typed: (key, from, items) => {
        const shown = reachable(items)
        const at = typeahead.match(
          key,
          shown.map((one) => one.text),
          shown.findIndex((one) => one.value === from),
        )
        const target = shown[at]?.value
        if (target !== undefined) {
          parked.current = false
          place(target)
        }
        return target
      },
      typing: () => typeahead.typing(),
    }),
    [place, typeahead],
  )
  return useMemo(() => ({ ...lasting, active }), [active, lasting])
}

/** What the list a highlight follows in offers. */
export interface FollowedList {
  /** The view of the highlighted item, where it is drawn. */
  readonly item: () => unknown
  /** The view that scrolls. */
  readonly list: () => unknown
  /** Where the list stands. */
  readonly offset: () => number
  /** Scrolls the list to an offset. */
  readonly scroll: (offset: number) => void
}

/** How far short of an edge a followed item stands, as the web's padding of 4. */
const SHY = 4

/** Scrolls by the least that brings the item in view. */
const followStep = ({ item, list, offset, scroll }: FollowedList): void => {
  const one = item()
  const frame = list()
  const box = one ? measure().box(one) : null
  const around = frame ? measure().box(frame) : null
  if (box === null || around === null) {
    return
  }
  const above = box.y - around.y - SHY
  const below = box.y + box.height - (around.y + around.height) + SHY
  if (above < 0) {
    scroll(offset() + above)
  } else if (below > 0) {
    scroll(offset() + below)
  }
}

/** Scrolls a list so the item the highlight moved to is in view, by the least. */
export const useFollow = (active: string, followed: FollowedList): void => {
  const latest = useRef(followed)
  latest.current = followed
  useEffect(() => {
    if (active !== '') {
      followStep(latest.current)
    }
  }, [active])
}
