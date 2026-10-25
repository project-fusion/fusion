import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { useCallback, useRef } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import type { Member } from './collection'
import { useMultipleSelection } from './multiple-selection'
import { boundTo, given } from './props'
import type { Arrived, Rove } from './roving-focus'
import { useSingleSelection } from './single-selection'

/** What a set's selection gives the rest of its machines. */
export interface Choice {
  /** Hears a key move focus onto an item, where the selection reads it, as a list's does. */
  readonly arrive?: Arrived
  readonly choose: (value: string) => void
  readonly chosen: (value: string) => boolean
  /** Whether the set follows an item's link itself. */
  readonly follows: boolean
  /** Hands the selection a key pressed on an item, and answers whether it took it. */
  readonly key: (from: string, press: KeyPress) => boolean
  /**
   * Takes the value of an item the page removed out of the choice, where no
   * item left stands for it, as a tag group's selection does.
   */
  readonly prune?: (removed: string, left: readonly string[]) => void
  /** Whether a disabled item is pressed and reached by the keys, and kept out of the choice alone. */
  readonly reachesDisabled: boolean
  /** The set's choice now, as its selection holds it. */
  readonly value: string
}

/** A selection that takes no key of its own. */
const NO_KEY = (): boolean => false

/** A choice a set whose items mark themselves never makes. */
const NO_CHOICE = (): void => undefined

/**
 * The item a set whose items mark themselves stands at: the one flagged
 * `page` where several are, as the web navigation's mark prefers the page,
 * and else the first flagged.
 */
export const markedOf = (members: readonly Member[]): Member | undefined =>
  members.find((member) => member.marked === true && member.flagged === 'page') ??
  members.find((member) => member.marked === true)

/**
 * How a set's keys move, as its form's collection says. **Arriving on an
 * item chooses nothing while any item is a link**, as the web's tab set
 * does, since choosing on arrival would follow it. A form with no keys moves
 * focus only, and stops at the ends. **A set whose selection hears arrivals
 * moves with Shift, Control, or Command held**, since the selection reads
 * them, and its keys reach a disabled item where its selection does.
 * **Where the keys run along a prop, the arrows across it move nothing**,
 * as a sequence of steps leaves them to the page.
 */
export const roveOf = (
  family: Family,
  props: Props,
  members: readonly Member[],
  choice: Choice,
): Rove => {
  const keys = family.api?.collection?.keys
  return {
    chooses: keys?.chooses === true && !members.some((member) => member.link !== undefined),
    held: choice.arrive !== undefined,
    reachesDisabled: choice.reachesDisabled,
    reserved: [...(keys?.keeps ?? []), ...across(family, props, keys?.along)],
    wrap: keys?.wrap === true,
  }
}

/** The arrows across the way the items run, where a prop says which way that is. */
const across = (family: Family, props: Props, along: string | undefined): readonly string[] => {
  if (along === undefined) {
    return []
  }
  return given(family, props, along) === 'vertical'
    ? ['ArrowLeft', 'ArrowRight']
    : ['ArrowDown', 'ArrowUp']
}

/** The values of a list written with commas, trimmed, with the empty ones dropped. */
export const listed = (value: string): string[] =>
  value
    .split(',')
    .map((one) => one.trim())
    .filter((one) => one !== '')

/**
 * Where a set chooses one item, what a press asks it to hold: the item, or
 * nothing where the press is on the chosen item and the set may be emptied.
 * Where each item presses on its own, the pressed values with this one put in
 * or taken out, in the order the items stand, as the web's `toggleValue`.
 */
const nextOf = (
  active: string,
  value: string,
  members: readonly Member[],
  how: { readonly clears: boolean; readonly presses: boolean },
): string => {
  if (!how.presses) {
    return how.clears && value === active ? '' : value
  }
  const now = listed(active)
  const next = now.includes(value) ? now.filter((one) => one !== value) : [...now, value]
  return members
    .map((member) => member.value)
    .filter((one) => next.includes(one))
    .join(',')
}

/**
 * Hosts a set's selection: one chosen item, or as many as its mode says.
 *
 * **A set whose items press on their own still holds one value**, the
 * pressed values separated by commas, which a press puts its item in or takes
 * it out of, as a toggle group does under `selection-mode="multiple"`. Where
 * the set chooses one, a press on the chosen item takes it back where the
 * prop its `clears` names allows it.
 */
export const choosing = (
  family: Family,
  use: MachineUse,
): ((props: Props, members: readonly Member[], changed: () => void) => Choice) => {
  /* **A set whose items mark themselves holds no choice**: the page writes
     each item's flag, and a press or a key chooses nothing. */
  if (use.machine === 'marked-set') {
    return (_props, members) => {
      const value = markedOf(members)?.value ?? ''
      const chosen = useCallback((one: string) => value !== '' && one === value, [value])
      return {
        choose: NO_CHOICE,
        chosen,
        follows: false,
        key: NO_KEY,
        reachesDisabled: false,
        value,
      }
    }
  }
  if (use.machine === 'single-selection') {
    return (props, members, changed) => {
      const { active, choose } = useSingleSelection(family, props, use, members, changed)
      const presses = given(family, props, boundTo(use, 'presses', 'prop')) === 'multiple'
      const clears = given(family, props, boundTo(use, 'clears', 'prop')) === true
      const latest = useRef({ active, members })
      latest.current = { active, members }
      const asked = useCallback(
        (value: string) =>
          choose(nextOf(latest.current.active, value, latest.current.members, { clears, presses })),
        [choose, clears, presses],
      )
      const chosen = useCallback(
        (value: string) => (presses ? listed(active).includes(value) : value === active),
        [active, presses],
      )
      return {
        choose: asked,
        chosen,
        follows: false,
        key: NO_KEY,
        reachesDisabled: false,
        value: active,
      }
    }
  }
  return (props, members) => {
    const selection = useMultipleSelection(family, props, use, members)
    const mode = given(family, props, boundTo(use, 'mode', 'prop'))
    return { ...selection, follows: mode !== 'single' && mode !== 'multiple' }
  }
}
