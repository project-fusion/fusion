import { environment } from '@fusion.dev/helix-core/capabilities/environment'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { rovingHost } from '@fusion.dev/helix-core/machines/roving-focus/host'
import type { RovingContext } from '@fusion.dev/helix-core/machines/roving-focus/machine'
import * as roving from '@fusion.dev/helix-core/machines/roving-focus/roving-focus.generated'
import { useCallback, useRef } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import { useToolbarAxis } from '../render/toolbar'
import type { Family } from '../style/form'
import { type Member, reaches } from './collection'
import { boundTo, given } from './props'
import { roamsIn } from './set-role'
import { useMachine } from './use-machine'

/** The event each key sends, on a page read left to right. */
const KEYS: Readonly<Record<string, number>> = {
  ArrowDown: roving.EVENT_NEXT,
  ArrowLeft: roving.EVENT_PREVIOUS,
  ArrowRight: roving.EVENT_NEXT,
  ArrowUp: roving.EVENT_PREVIOUS,
  End: roving.EVENT_LAST,
  Home: roving.EVENT_FIRST,
}

/** The horizontal arrows follow the reading direction, so right to left swaps them. */
const SWAPPED: Readonly<Record<string, string>> = {
  ArrowLeft: 'ArrowRight',
  ArrowRight: 'ArrowLeft',
}

/**
 * The event a key sends, or `undefined` for a key that moves nothing. A key
 * with Alt held moves nothing, and neither does one with Shift, Control, or
 * Command held, except where `held`.
 */
export const eventOf = (press: KeyPress, rtl: boolean, held = false): number | undefined => {
  if (press.alt || (!held && (press.control || press.meta || press.shift))) {
    return undefined
  }
  return KEYS[rtl ? (SWAPPED[press.key] ?? press.key) : press.key]
}

/** How a set's keys move among its items, which the set's kind says. */
export interface Rove {
  /** Whether arriving on an item chooses it, where the binding's `manual` does not say otherwise. */
  readonly chooses: boolean
  /**
   * Whether a key moves with Shift, Control, or Command held, as a list's
   * does, whose selection reads them as focus arrives.
   */
  readonly held?: boolean
  /** Whether the keys reach a disabled item, as a list's do under `disabled-behavior="selection"`. */
  readonly reachesDisabled?: boolean
  /** The keys the items keep for themselves, such as a list row's Left and Right. */
  readonly reserved: readonly string[]
  /** Whether a move past the last item comes round to the first. */
  readonly wrap: boolean
}

/** Hears a key move focus onto an item other than the one it was pressed on, with the key. */
export type Arrived = (value: string, from: string, press: KeyPress) => void

/**
 * Hosts roving focus on a set, as the expansion binds it: the prop that stops
 * arriving on an item from choosing it.
 *
 * **A machine lives for one press**, so the set takes it to where the press
 * starts, the item the key was pressed on among those a move can reach, and
 * then sends the key's event. Arriving focuses the item and, where `rove`
 * chooses and the set is not manual, chooses it. A key something nearer took,
 * or one the items keep, is left alone.
 *
 * **`arrived` hears each move that lands on another item, with the key**, as
 * the web list hears focus arrive with the modifiers of the key that moved
 * it. Where the move lands is read from the compiled module as the key is
 * pressed, since the move's own effects run once React has drawn it.
 *
 * **A set whose `roves` prop holds nothing moves nothing**, as a button
 * group without a selection mode, and neither does a set that is a toolbar
 * of its own inside a toolbar, whose keys walk its items.
 *
 * Answers whether the set took the key, so the platform does nothing else
 * with it.
 */
export const useRovingFocus = (
  family: Family,
  props: Props,
  use: MachineUse,
  members: readonly Member[],
  choose: (value: string) => void,
  rove: Rove,
  arrived?: Arrived,
): ((from: string, press: KeyPress) => boolean) => {
  const manual = given(family, props, boundTo(use, 'manual', 'prop')) === true
  const selects = rove.chooses && !manual
  const roams = roamsIn(family, props, use, useToolbarAxis() !== undefined)
  const reachable = (all: readonly Member[]) =>
    all.filter((member) => reaches(member, rove.reachesDisabled))
  /* The items the keys reach, read again as each key is pressed, since an
     item's view may be drawn or put away between renders. */
  const latest = useRef({
    all: members,
    arrived,
    choose,
    members: reachable(members),
    roams,
    rove,
    selects,
  })
  latest.current = { ...latest.current, all: members, arrived, choose, roams, rove, selects }
  const seed: RovingContext = { at: -1, count: 0, focus: true, selects, wrap: rove.wrap }
  const machine = useMachine(
    roving,
    seed,
    rovingHost({
      items: () => latest.current.members.map((member) => member.node?.()),
      select: (at) => {
        const member = latest.current.members[at]
        if (member !== undefined) {
          latest.current.choose(member.value)
        }
      },
    }),
    () => true,
  )
  const { reseat, send } = machine
  return useCallback(
    (from: string, press: KeyPress): boolean => {
      const all = latest.current
      all.members = all.all.filter((member) => reaches(member, all.rove.reachesDisabled))
      const now = latest.current
      const event = eventOf(press, environment().read().direction === 'rtl', now.rove.held)
      if (
        !now.roams ||
        event === undefined ||
        press.claimed ||
        now.rove.reserved.includes(press.key) ||
        now.members.length === 0
      ) {
        return false
      }
      const seated: RovingContext = {
        at: now.members.findIndex((member) => member.value === from),
        count: now.members.length,
        focus: true,
        selects: now.selects,
        wrap: now.rove.wrap,
      }
      const moved = roving.step(roving.start(seated), seated, event, undefined)
      reseat(seated)
      send(event, undefined)
      const landed =
        moved === undefined || !('context' in moved) ? undefined : now.members[moved.context.at]
      if (landed !== undefined && landed.value !== from) {
        now.arrived?.(landed.value, from, press)
      }
      return true
    },
    [reseat, send],
  )
}
