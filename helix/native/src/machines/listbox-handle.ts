/**
 * What a list's ref holds beside `validate`: `reveal()`, as the web's Listbox
 * has it, which an element that draws the list calls to bring its answer to the
 * middle, as a time list does once and each wheel on every turn.
 */
import { measure } from '@fusion.dev/helix-core/capabilities/measure'
import { useMemo, useRef } from 'react'
import type { Entry, Held } from './listbox-model'
import type { WindowScroller } from './window'

/** What a list's ref holds beside `validate`. */
export interface ListHandle {
  /**
   * Brings the chosen option, or the highlight where nothing is chosen, to the
   * middle of the list, as the web's `reveal()`: a time list comes to rest on the
   * time it holds, and each wheel on its answer.
   */
  readonly reveal: () => void
}

/** What the list's own scrolling offers: its window of `items`, or its scroll view. */
interface Scrolling {
  readonly frame: { readonly current: unknown }
  readonly list: { readonly current: WindowScroller | null }
  readonly offset: { readonly current: number }
  readonly scrollTo: (to: number) => void
}

/** What the handle reads of the list as it last drew. */
interface Drawn {
  readonly active: string
  readonly chosen: readonly string[]
  readonly entries: readonly Entry[]
  readonly scrolling: Scrolling
  readonly windowed: boolean
}

/** Where the option to bring to the middle stands among those shown, or -1. */
const restingAt = (now: Drawn, shown: readonly Entry[]): number => {
  const wanted = now.chosen.find((one) => shown.some((entry) => entry.value === one))
  return shown.findIndex((one) => one.value === (wanted ?? now.active))
}

/** Centers a written option in the list's scroll view, by the boxes the two measure. */
const centerWritten = (now: Drawn, held: Held, entry: Entry | undefined): void => {
  const node = entry?.key === undefined ? undefined : held.members.get(entry.key)?.node()
  const frame = now.scrolling.frame.current
  const box = node ? measure().box(node) : null
  const around = frame ? measure().box(frame) : null
  if (box !== null && around !== null) {
    const off = box.y + box.height / 2 - (around.y + around.height / 2)
    now.scrolling.scrollTo(now.scrolling.offset.current + off)
  }
}

/** The list's handle, one object across draws, which reads the list as it last drew. */
export const useHandle = (
  entries: readonly Entry[],
  chosen: readonly string[],
  active: string,
  held: Held,
  scrolling: Scrolling,
  windowed: boolean,
): ListHandle => {
  const latest = useRef<Drawn>({ active, chosen, entries, scrolling, windowed })
  latest.current = { active, chosen, entries, scrolling, windowed }
  return useMemo(
    () => ({
      reveal: () => {
        const now = latest.current
        const shown = now.entries.filter((one) => !one.hidden)
        const at = restingAt(now, shown)
        if (at < 0) {
          return
        }
        if (now.windowed) {
          now.scrolling.list.current?.scrollToIndex?.({
            animated: false,
            index: at,
            viewPosition: 0.5,
          })
        } else {
          centerWritten(now, held, shown[at])
        }
      },
    }),
    [held],
  )
}
