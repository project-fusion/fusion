/**
 * A row of a phone's table moved by its grip: a press picks it up, the keys or a
 * drag carry it, and a screen reader's actions step it.
 */
import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import { measure } from '@fusion.dev/helix-core/capabilities/measure'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { useMemo, useRef, useState } from 'react'
import type { HostInstance } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import { boundTo, tell } from './props'
import type { RowModel } from './table-model'
import { worded } from './table-words'
import { edgeStep, type WindowScroller } from './window'

/** What a row draws of a move. */
export type MoveState = 'dragging' | 'drop-after' | 'drop-before' | undefined

/** A held row, and where it would land. */
interface Hold {
  readonly from: number
  readonly key: string
  readonly to: number
}

/** How tall a row that has not drawn is taken to be, in points. */
const ROW = 44

/**
 * The place a row dragged `travel` points lands in: it passes a row once it has
 * come past that row's middle.
 */
export const travelTo = (
  order: readonly string[],
  heights: ReadonlyMap<string, number>,
  from: number,
  travel: number,
): number => {
  const step = travel > 0 ? 1 : -1
  let at = from
  let left = Math.abs(travel)
  for (;;) {
    const next = order[at + step]
    const height = next === undefined ? undefined : (heights.get(next) ?? ROW)
    if (height === undefined || left < height / 2) {
      return at
    }
    at += step
    left -= height
  }
}

/** A windowed table's list, as a drag scrolls it. */
type RowsList = WindowScroller & { readonly getNativeScrollRef?: () => unknown }

/**
 * The list a windowed table draws its rows in, scrolled by a finger near either
 * edge of its frame, so a far place is reached by dragging there, as a Virtual
 * List's is. A plain table has no list of its own, and `travel` stays 0.
 */
const useEdgeScroll = () => {
  const list = useRef<RowsList | null>(null)
  const offset = useRef(0)
  const began = useRef(0)
  const frame = useRef<{ readonly height: number; readonly y: number } | null>(null)
  return useMemo(
    () => ({
      /* How far the list has scrolled since the drag began, as the finger moves
         it there. A row the list carried is as far along as one the finger did. */
      at: (pageY: number): number => {
        const box = frame.current
        const by = box === null ? 0 : edgeStep(pageY - box.y, box.height)
        if (by !== 0) {
          list.current?.scrollToOffset?.({
            animated: false,
            offset: Math.max(0, offset.current + by),
          })
        }
        return offset.current - began.current
      },
      begin: () => {
        const node = list.current?.getNativeScrollRef?.() as HostInstance | null | undefined
        began.current = offset.current
        frame.current = node ? measure().box(node) : null
      },
      listRef: (next: RowsList | null) => {
        list.current = next
      },
      moved: (at: number) => {
        offset.current = at
      },
    }),
    [],
  )
}

/** The state a row draws for where the held row would land. */
const moveState = (hold: Hold | undefined, rowKey: string, at: number): MoveState => {
  if (hold === undefined) {
    return undefined
  }
  if (rowKey === hold.key) {
    return 'dragging'
  }
  if (hold.to === hold.from || at !== hold.to) {
    return undefined
  }
  /* The row the moved one lands beside, with the room it leaves closed. */
  return hold.to > hold.from ? 'drop-after' : 'drop-before'
}

/** The moves of a row by its grip. */
export const useMoves = (
  family: Family,
  props: Props,
  use: MachineUse,
  rows: readonly RowModel[],
  still: boolean,
) => {
  const edge = useEdgeScroll()
  const [hold, setHold] = useState<Hold>()
  const holding = useRef(hold)
  holding.current = hold
  const everyKey = rows.map((row) => row.key)
  const say = (name: string, values: Record<string, unknown>): void => {
    const words = worded(family, props, name, values)
    if (words !== '') {
      announce().say(words, 'polite')
    }
  }
  const nameOf = (key: string): string => rows.find((row) => row.key === key)?.words || key
  const moveTo = (key: string, to: number): boolean => {
    const from = everyKey.indexOf(key)
    if (from < 0 || to === from || to < 0 || to >= everyKey.length) {
      return false
    }
    const next = everyKey.filter((one) => one !== key)
    next.splice(to, 0, key)
    const detail = { from, key, keys: next, kind: 'row', to, value: next.join(',') }
    const before = boundTo(use, 'onBeforeReorder', 'event')
    const stood = before === undefined || tell(family, props, before, detail)
    if (stood) {
      const after = boundTo(use, 'onReorder', 'event')
      if (after !== undefined) {
        tell(family, props, after, detail)
      }
    }
    return stood
  }
  const drop = (done: boolean): void => {
    const now = holding.current
    holding.current = undefined
    setHold(undefined)
    if (now === undefined) {
      return
    }
    if (done && now.to !== now.from) {
      say(moveTo(now.key, now.to) ? 'droppedLabel' : 'canceledLabel', {})
    } else {
      say(done ? 'droppedLabel' : 'canceledLabel', {})
    }
  }
  const pick = (key: string): void => {
    if (still) {
      return
    }
    if (holding.current?.key === key) {
      drop(true)
      return
    }
    const from = everyKey.indexOf(key)
    holding.current = { from, key, to: from }
    setHold(holding.current)
    say('pickedUpLabel', { name: nameOf(key) })
  }
  const step = (to: number): void => {
    const now = holding.current
    if (now === undefined || to < 0 || to >= everyKey.length) {
      return
    }
    holding.current = { ...now, to }
    setHold(holding.current)
    say('movedLabel', { count: everyKey.length, name: nameOf(now.key), position: to + 1 })
  }
  const key = (held: string, press: KeyPress): boolean => {
    const now = holding.current
    if (now?.key !== held) {
      return false
    }
    const to = {
      ArrowDown: now.to + 1,
      ArrowUp: now.to - 1,
      End: everyKey.length - 1,
      Home: 0,
    }[press.key]
    if (to !== undefined) {
      step(to)
      return true
    }
    if (press.key === 'Escape') {
      drop(false)
      return true
    }
    return false
  }
  const dropOn = (at: string): boolean => {
    const now = holding.current
    if (now === undefined) {
      return false
    }
    holding.current = undefined
    setHold(undefined)
    const to = everyKey.indexOf(at)
    say(moveTo(now.key, to) ? 'droppedLabel' : 'canceledLabel', {})
    return true
  }
  const heights = useRef(new Map<string, number>()).current
  const moveOf = (rowKey: string): MoveState => moveState(hold, rowKey, everyKey.indexOf(rowKey))
  return {
    dropOn,
    edge,
    grip: {
      drag: {
        end: (dropped: boolean) => drop(dropped),
        move: (travel: number, pageY: number) => {
          const now = holding.current
          if (now === undefined) {
            return
          }
          const to = travelTo(everyKey, heights, now.from, travel + edge.at(pageY))
          if (to !== now.to) {
            step(to)
          }
        },
        start: (held: string) => {
          edge.begin()
          if (holding.current?.key !== held) {
            pick(held)
          }
        },
      },
      key,
      measured: (row: string, height: number) => {
        heights.set(row, height)
      },
      move: (held: string, by: number) => {
        const from = everyKey.indexOf(held)
        const stood = moveTo(held, from + by)
        say(stood ? 'movedLabel' : 'canceledLabel', {
          count: everyKey.length,
          name: nameOf(held),
          position: from + by + 1,
        })
      },
      pick,
      still,
    },
    held: hold?.key,
    moveOf,
  }
}
