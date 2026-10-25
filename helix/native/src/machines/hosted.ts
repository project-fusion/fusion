/**
 * The machines a hook hosts on its own, beside the element's join, toggle,
 * set, and presses, and the hand-off an element the page takes out makes as
 * it leaves.
 */
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { useClocked } from './clock'
import { useCountdowned, useQueued } from './countdown'
import { useDelayed } from './delay'
import { useDisclosed } from './disclosed'
import { leavesBy, useLeavingHandOff } from './hand-off'
import { useLoad } from './load'
import { boundTo } from './props'
import { useScrollState } from './scroll-state'
import { useSectionOf } from './section'
import { useSections } from './sections'
import type { Turned } from './toggle'

/**
 * The machines a hook hosts on its own: a picture's load, a clock, a delay, a
 * countdown, a queue, where a part that scrolls stands, a section of the
 * page, the sections of the page an outline follows, and whether an element
 * drawn inside stands open. Each is given
 * what the machines before it bound, as a countdown reads whether its queue
 * waits.
 */
export const HOOKS: Readonly<
  Record<
    string,
    (
      family: Family,
      props: Props,
      use: MachineUse,
      earlier: readonly Behavior[],
      toggled?: Turned,
    ) => Behavior
  >
> = {
  clock: useClocked,
  countdown: useCountdowned,
  delay: useDelayed,
  disclosed: useDisclosed,
  load: useLoad,
  queue: useQueued,
  scroll: useScrollState,
  section: useSectionOf,
  sections: useSections,
}

/** Hands focus on as an element the page takes out leaves, where it has a press that dismisses it. */
export const leaving = (
  family: Family,
  uses: readonly MachineUse[],
): ((props: Props, around: { readonly bound: readonly Behavior[] }) => Behavior)[] => {
  const part = leavesBy(family)
  const waits = uses.find((use) => use.machine === 'queue')
  const state = waits === undefined ? undefined : boundTo(waits, 'waiting', 'state')
  return part === undefined
    ? []
    : [
        (_props, around) =>
          useLeavingHandOff(
            family,
            part,
            state === undefined ||
              !around.bound.some((one) => one.parts.host?.states?.[state] === true),
          ),
      ]
}
