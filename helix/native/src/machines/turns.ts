import { useLayoutEffect, useRef } from 'react'
import type { MachineUse } from '../ir.generated'
import { type Behavior, merged, type Props } from '../render/behavior'
import type { Family } from '../style/form'
import { dismisses, type HandOff, useHandOff } from './hand-off'
import type { Joined } from './join'
import { boundTo } from './props'
import { type InSet, type Turned, useToggle } from './toggle'
import { useToggleSet } from './toggle-set'

/**
 * Whether an element's toggle turns: on its own, or as an item of a set whose
 * items turn on their own, as a checkbox in a checkbox group does. In any
 * other set, as a toggle in a toggle group, the set chooses it in place of
 * its toggle.
 */
export const turnsAlone = (joined: Joined | undefined): boolean =>
  joined?.offer === undefined || joined.offer.toggles === true

/** No hand-off, for an element that is not dismissed. */
const noHandOff = (_family: Family, _part: string, _shown: boolean): HandOff | undefined =>
  undefined

/** What the set an item turns in gives its toggle, or nothing outside such a set. */
const inSetOf = (joined: Joined | undefined): InSet => {
  const offer = joined?.offer
  if (offer?.toggles !== true || joined === undefined) {
    return {}
  }
  const { key } = joined
  const held = offer.holds?.(key)
  return {
    disabled: offer.disabled === true,
    gate: (checked) => offer.turn?.(key, checked) ?? true,
    keeps: (checked) => offer.keeps?.(key, checked) === true,
    turned: (checked) => offer.turned?.(key, checked),
    ...(held === undefined ? {} : { held }),
  }
}

/** The toggle's bindings, with the set's `disabled` on its part where the set disables it. */
const disabledIn = (toggled: Turned, set: InSet, prop: string | undefined): Turned =>
  set.disabled === true && prop !== undefined
    ? {
        ...toggled,
        behavior: merged(toggled.behavior, {
          marks: [],
          parts: { [toggled.part]: { states: { [prop]: true } } },
        }),
      }
    : toggled

/**
 * The toggle's bindings, with its part `locked` while its set keeps it as
 * it stands, as an accordion under `single` keeps its open section open:
 * **a screen reader hears it disabled, and it keeps its stop**, as the web
 * trigger is `aria-disabled` and still focusable.
 */
const lockedIn = (toggled: Turned, set: InSet): Turned =>
  set.keeps?.(!toggled.checked) === true
    ? {
        ...toggled,
        behavior: merged(toggled.behavior, {
          marks: [],
          parts: { [toggled.part]: { states: { locked: true } } },
        }),
      }
    : toggled

/**
 * Hosts the element's toggle, where its form binds one, telling `turned`
 * each time it turns. **In a set whose items turn**, the turn asks the set,
 * the set's writes take it, the set's `disabled` disables it, and the set
 * draws again each time it turns.
 */
export const turning = (
  family: Family,
  uses: readonly MachineUse[],
): ((props: Props, turned: () => void, joined: Joined | undefined) => Turned | undefined) => {
  const use = uses.find((each) => each.machine === 'toggle')
  if (use === undefined) {
    return () => undefined
  }
  const disabledProp = boundTo(use, 'disabled', 'prop')
  /* Decided once for the family, so the hooks run in one order. */
  const useHand = dismisses(family) ? useHandOff : noHandOff
  return (props, turned, joined) => {
    const set = inSetOf(joined)
    const handing = useRef<(() => void) | undefined>(undefined)
    const toggled = useToggle(
      family,
      props,
      use,
      (checked) => {
        turned()
        if (!checked) {
          handing.current?.()
        }
      },
      set,
    )
    const handOff = useHand(family, toggled.part, toggled.checked)
    /* Only where its dismiss press held focus, as the web hands focus on
       only from a message focus was in: a spent clock or a swipe moves none. */
    handing.current =
      handOff === undefined
        ? undefined
        : () => {
            if (handOff.holds()) {
              handOff.hand()
            }
          }
    if (joined !== undefined) {
      joined.turned.current = toggled.checked
      joined.request.current = (checked) => {
        if (checked !== toggled.checked) {
          toggled.turn()
        }
      }
    }
    const moved = joined?.offer?.moved
    // biome-ignore lint/correctness/useExhaustiveDependencies: the set draws again each time the item turns.
    useLayoutEffect(() => {
      moved?.()
    }, [moved, toggled.checked])
    const turnedHere = lockedIn(disabledIn(toggled, set, disabledProp), set)
    return handOff === undefined
      ? turnedHere
      : { ...turnedHere, behavior: merged(turnedHere.behavior, handOff.behavior) }
  }
}

/** What a set whose items turn reads of its element beside its props. */
interface Around {
  /** The set's value, which the verdict on it reads. */
  readonly chosen: { current: string | undefined }
  /** Touches the verdict on the set's answer, as a change does. */
  readonly touch: () => void
}

/**
 * Hosts a set whose items turn on their own, where its form binds
 * `toggle-set`, writing its value for the verdict on it.
 */
export const settingTurns =
  (family: Family, use: MachineUse) =>
  (props: Props, around: Around): Behavior => {
    const set = useToggleSet(family, props, use, around.touch)
    around.chosen.current = set.value
    return set.behavior
  }
