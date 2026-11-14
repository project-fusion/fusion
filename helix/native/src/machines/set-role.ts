import { useMemo } from 'react'
import { type MachineUse, ROLES } from '../ir.generated'
import { type Behavior, type Props, STILL } from '../render/behavior'
import { inToolbarAs, useToolbarAxis } from '../render/toolbar'
import type { Family } from '../style/form'
import { boundTo, given } from './props'

/**
 * How a set's items show they are chosen: as radios, of which the set
 * chooses one, or as toggle buttons that each press on their own.
 */
export type Shown = 'radio' | 'toggle'

/** What a set offers its items beside its choice, where its collection says so. */
export interface Offered {
  /**
   * Whether Space and Enter on an item are the item's own press, which
   * chooses it as a tap does, so the set's selection takes no key.
   */
  readonly ownKeys?: true
  /**
   * How the items show they are chosen, as the prop the collection's
   * `presses` names says. Absent where it names none, and where the prop
   * its `roves` names holds nothing, so each item is a control of its own.
   */
  readonly shows?: Shown
}

/** What a set's collection says of its role, at one render. */
export interface SetRole {
  /** What the set announces itself as on its host, where no part carries its role. */
  readonly host: Behavior
  /** What the set offers its items beside its choice. */
  readonly offered: Offered
}

/**
 * Whether each item's press hears Space and Enter itself, as a button
 * group's buttons do, where the collection's `keys.selects` is `false`.
 */
export const ownKeys = (family: Family): boolean => family.api?.collection?.keys.selects === false

/** Whether the prop a set's `roves` names holds a value, or the set names none. */
const moded = (family: Family, props: Props, roving: MachineUse | undefined): boolean => {
  const roves = roving === undefined ? undefined : boundTo(roving, 'roves', 'prop')
  return roves === undefined || given(family, props, roves) !== undefined
}

/**
 * Whether a set's arrow keys move among its items: **only while the prop its
 * `roves` names holds a value**, where it names one, and **not inside a
 * toolbar where its items hear their own keys**, since each item is then a
 * control of the toolbar, whose keys walk them, as they walk a button
 * group's.
 */
export const roamsIn = (
  family: Family,
  props: Props,
  roving: MachineUse | undefined,
  inToolbar: boolean,
): boolean =>
  roving !== undefined && moded(family, props, roving) && !(ownKeys(family) && inToolbar)

/**
 * How a set's items show they are chosen, by the prop its `presses` names:
 * toggle buttons where it says `multiple`, and radios otherwise, while the
 * set is in a mode its `roves` allows.
 */
const shownBy = (
  family: Family,
  props: Props,
  select: MachineUse,
  roving: MachineUse | undefined,
): Shown | undefined => {
  const presses = boundTo(select, 'presses', 'prop')
  if (presses === undefined || !moded(family, props, roving)) {
    return undefined
  }
  return given(family, props, presses) === 'multiple' ? 'toggle' : 'radio'
}

/**
 * What a set's collection says beside its selection and its keys.
 *
 * - **`presses`**: the items are radios, or toggle buttons that each press
 *   on their own, while the set is in a mode its `roves` allows.
 * - **`keys.selects: false`**: Space and Enter are each item's own press.
 * - **`label`**: the set announces itself on its host, named by that prop: a
 *   radio group where its items are radios, a toolbar where they are toggle
 *   buttons, and a group otherwise, disabled where its `disabled` holds. A
 *   toolbar inside a toolbar is a group of it, as a part is.
 */
export const useSetRole = (
  family: Family,
  props: Props,
  select: MachineUse,
  roving: MachineUse | undefined,
): SetRole => {
  const collection = family.api?.collection
  const inToolbar = useToolbarAxis() !== undefined
  const shows = shownBy(family, props, select, roving)
  const own = ownKeys(family)
  const offered = useMemo<Offered>(
    () => ({ ...(own ? { ownKeys: true } : {}), ...(shows === undefined ? {} : { shows }) }),
    [own, shows],
  )
  if (collection?.label === undefined) {
    return { host: STILL, offered }
  }
  const label = given(family, props, collection.label)
  const off = given(family, props, boundTo(select, 'disabled', 'prop')) === true
  const role =
    shows === 'radio'
      ? 'radiogroup'
      : inToolbarAs(shows === 'toggle' ? 'toolbar' : 'group', inToolbar)
  const view = {
    ...ROLES[role],
    ...(typeof label === 'string' && label !== '' ? { accessibilityLabel: label } : {}),
    ...(off ? { accessibilityState: { disabled: true } } : {}),
  }
  return { host: { marks: [], parts: { host: { view } } }, offered }
}
