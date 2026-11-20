import { environment } from '@fusion.dev/helix-core/capabilities/environment'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { rovingHost } from '@fusion.dev/helix-core/machines/roving-focus/host'
import type { RovingContext } from '@fusion.dev/helix-core/machines/roving-focus/machine'
import * as roving from '@fusion.dev/helix-core/machines/roving-focus/roving-focus.generated'
import { type ReactNode, useCallback, useMemo, useRef } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import {
  type ToolbarAxis,
  ToolbarAxisContext,
  type ToolbarStop,
  type ToolbarStops,
  ToolbarStopsContext,
  useToolbarAxis,
  useToolbarStops,
} from '../render/toolbar'
import type { Family } from '../style/form'
import { boundTo, given } from './props'
import { eventOf } from './roving-focus'
import { useMachine } from './use-machine'

/** The arrow keys a toolbar leaves to its controls, across the way it runs. */
const ACROSS: Readonly<Record<ToolbarAxis, readonly string[]>> = {
  horizontal: ['ArrowDown', 'ArrowUp'],
  vertical: ['ArrowLeft', 'ArrowRight'],
}

/** The controls of a toolbar a key can move to: every one that is not disabled, in order. */
const reachable = (held: ReadonlyMap<object, ToolbarStop>): [object, ToolbarStop][] =>
  [...held.entries()].filter(([, stop]) => !stop.disabled())

/**
 * Keeps the controls that join a toolbar, in the order they join, which is
 * the order React attaches their views in, and moves focus among them with
 * the roving focus machine: the arrow keys along the way the toolbar runs,
 * Home and End to the ends, from the last back to the first unless `ends`
 * stops them. **A disabled control is passed over**, and a key pressed on
 * one, which takes no focus, moves nothing.
 *
 * **A machine lives for one press**, as for a set's items, so the toolbar
 * takes it to the control the key was pressed on before it sends the key's
 * event, and the move focuses the control it lands on.
 */
const useStops = (axis: ToolbarAxis, ends: boolean): ToolbarStops => {
  const held = useRef(new Map<object, ToolbarStop>())
  const latest = useRef({ axis, ends })
  latest.current = { axis, ends }
  const seed: RovingContext = { at: -1, count: 0, focus: true, selects: false, wrap: !ends }
  const { reseat, send } = useMachine(
    roving,
    seed,
    rovingHost({
      items: () => reachable(held.current).map(([, stop]) => stop.node()),
      select: () => undefined,
    }),
    () => true,
  )
  const key = useCallback(
    (from: object, press: KeyPress): boolean => {
      const now = latest.current
      const event = eventOf(press, environment().read().direction === 'rtl')
      const stops = reachable(held.current)
      const at = stops.findIndex(([one]) => one === from)
      if (event === undefined || press.claimed || ACROSS[now.axis].includes(press.key) || at < 0) {
        return false
      }
      const seated: RovingContext = {
        at,
        count: stops.length,
        focus: true,
        selects: false,
        wrap: !now.ends,
      }
      reseat(seated)
      send(event, undefined)
      return true
    },
    [reseat, send],
  )
  const join = useCallback((from: object, stop: ToolbarStop) => {
    held.current.set(from, stop)
  }, [])
  const leave = useCallback((from: object) => {
    held.current.delete(from)
  }, [])
  return useMemo(() => ({ join, key, leave }), [join, key, leave])
}

/**
 * Hosts a toolbar's roving focus, as the expansion binds it: the part that
 * holds its controls, and the props that turn it and stop its keys at the
 * ends.
 *
 * **Its controls are the presses drawn inside it that hear their own keys**,
 * which join it through `ToolbarStopsContext`: a Button, an Icon Button, a
 * Toggle, a Checkbox, or a Switch, and a Button Group's buttons. **It gives
 * its axis to what it holds** through `ToolbarAxisContext`, so a Divider in
 * it runs across it.
 *
 * **A toolbar inside another is `nested`**: it hands its controls the outer
 * toolbar's, whose keys walk them, and the element around announces its part
 * as a group. It runs the way its own `orientation` says, and its marks say
 * `horizontal` or `vertical` for its styles, as the web element's states do.
 */
export const useToolbar = (family: Family, props: Props, use: MachineUse): Behavior => {
  const outer = useToolbarStops()
  const nested = useToolbarAxis() !== undefined && outer !== undefined
  const axis: ToolbarAxis =
    given(family, props, boundTo(use, 'orientation', 'prop')) === 'vertical'
      ? 'vertical'
      : 'horizontal'
  const ends = given(family, props, boundTo(use, 'ends', 'prop')) === true
  const own = useStops(axis, ends)
  const stops = nested && outer !== undefined ? outer : own
  const provide = useCallback(
    (drawn: ReactNode) => (
      <ToolbarAxisContext.Provider value={axis}>
        <ToolbarStopsContext.Provider value={stops}>{drawn}</ToolbarStopsContext.Provider>
      </ToolbarAxisContext.Provider>
    ),
    [axis, stops],
  )
  return { marks: nested ? [axis, 'nested'] : [axis], parts: {}, provide }
}
