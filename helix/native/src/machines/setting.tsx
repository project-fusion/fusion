import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { type ReactNode, useCallback, useMemo, useRef } from 'react'
import type { MachineUse } from '../ir.generated'
import { type Behavior, merged, type Props, STILL } from '../render/behavior'
import type { Family } from '../style/form'
import type { Binder } from './binder'
import { type Choice, choosing, roveOf } from './choice'
import { collection, type Member, type Offer, useMembers } from './collection'
import { useIndicator } from './indicator'
import { boundTo, given, type Sender, tell } from './props'
import { useRemoval } from './removal'
import { type ReorderOffer, useReorder } from './reorder'
import { useRovingFocus } from './roving-focus'
import { useSetRole } from './set-role'
import { useTypeahead } from './typeahead'

/** Hosts the moves of a set's items, where the set binds reorder. */
const reordering = (
  family: Family,
  uses: readonly MachineUse[],
): ((props: Props, members: readonly Member[], value: string) => ReorderOffer | undefined) => {
  const use = uses.find((each) => each.machine === 'reorder')
  if (use === undefined) {
    return () => undefined
  }
  return (props, members, value) => useReorder(family, props, use, members, value)
}

/** Whether an item is chosen, where a set marks none. */
const NONE = (): boolean => false

/** The roving focus a set binds where it binds none, so every set runs the same hooks. */
const STAYS: MachineUse = { bind: {}, machine: 'roving-focus' }

/** Hosts the mark that shows a set's choice, where the set binds one. */
const marking = (
  family: Family,
  uses: readonly MachineUse[],
): ((props: Props, members: readonly Member[], chosen: Choice['chosen']) => Behavior) => {
  const use = uses.find((each) => each.machine === 'indicator')
  if (use === undefined) {
    return () => STILL
  }
  return (props, members, chosen) => useIndicator(family, props, use, members, chosen)
}

/**
 * Hosts a set: the items that join it, its selection, the mark that shows
 * the choice, the moves of its items, and the keys pressed on its items:
 * roving focus first, then typeahead, and then the selection's own. The set
 * offers itself to its items through the context its family's name makes.
 */
export const setting = (
  family: Family,
  uses: readonly MachineUse[],
  select: MachineUse,
): Binder => {
  const chosenBy = choosing(family, select)
  const indicate = marking(family, uses)
  const reorders = reordering(family, uses)
  const roving = uses.find((use) => use.machine === 'roving-focus')
  const types = uses.some((use) => use.machine === 'typeahead')
  const Offered = collection(family.name)
  /* A set whose items mark themselves tells them so, so each keeps its flag. */
  const marks = select.machine === 'marked-set' ? ({ marks: true } as const) : {}
  /* **A choice that stood closes the element**, where a set whose items
     mark themselves names `closes`, as a megamenu closes as a destination
     is chosen. */
  const closes = marks.marks === true && family.api?.collection?.closes !== undefined
  return (props, around) => {
    const { join, leave, members, present } = useMembers(props.children)
    const choice = chosenBy(props, members, around.touch)
    const { chosen, follows, key: picks, reachesDisabled, value } = choice
    around.chosen.current = value
    /* **A read-only set keeps its choice**: a press is refused and the keys
       move focus alone, as a read-only radio group does. */
    const fixed = given(family, props, boundTo(select, 'readonly', 'prop')) === true
    const off = given(family, props, boundTo(select, 'disabled', 'prop')) === true
    const role = useSetRole(family, props, select, roving)
    const choose = useCallback(
      (chose: string) => {
        if (!fixed) {
          choice.choose(chose)
        }
      },
      [choice.choose, fixed],
    )
    /* **A set whose items press on their own marks none of them**, and its
       keys move focus without pressing. */
    const presses = role.offered.shows === 'toggle'
    const marked = indicate(props, members, presses ? NONE : chosen)
    const reorder = reorders(props, members, value)
    const removal = useRemoval(family, members, present, choice.prune)
    const rove = {
      ...roveOf(family, props, members, choice),
      ...(fixed || presses ? { chooses: false } : {}),
    }
    const manual =
      roving !== undefined && given(family, props, boundTo(roving, 'manual', 'prop')) === true
    const latest = useRef(props)
    latest.current = props
    const toggled = useRef(around.toggled)
    toggled.current = around.toggled
    const chose = useCallback(() => {
      if (toggled.current?.checked === true) {
        toggled.current.turn()
      }
    }, [])
    const joined = useRef(members)
    joined.current = members
    /* A key that arrives on an item chooses it once the item's event stands,
       as a press does. */
    const arrive = useCallback(
      (value: string) => {
        if (joined.current.find((member) => member.value === value)?.ask?.() !== false) {
          choose(value)
        }
      },
      [choose],
    )
    const moves = useRovingFocus(
      family,
      props,
      roving ?? STAYS,
      members,
      arrive,
      rove,
      choice.arrive,
    )
    const { key: typed, reset } = useTypeahead(members, rove.chooses && !manual, arrive, {
      ...(choice.arrive === undefined ? {} : { arrived: choice.arrive }),
      reachesDisabled,
    })
    /* A Space typed into a word is the word's, as on the web list. */
    const key = useCallback(
      (from: string, press: KeyPress): boolean => {
        if (roving !== undefined && moves(from, press)) {
          reset()
          return true
        }
        return (types && typed(from, press)) || removal.key(from, press) || picks(from, press)
      },
      [moves, picks, removal.key, reset, typed],
    )
    const hear = useCallback(
      (event: string, detail: Readonly<Record<string, unknown>>, sender: Sender) =>
        removal.heard(
          event,
          sender,
          family.api?.events.some((sent) => sent.name === event) !== true ||
            (tell(family, latest.current, event, detail, sender) && !fixed),
        ),
      [fixed, removal.heard],
    )
    const offer = useMemo<Offer>(
      () => ({
        choose,
        ...(closes ? { chose } : {}),
        chosen,
        ...(off ? { disabled: true } : {}),
        follows,
        ...role.offered,
        hear,
        join,
        key,
        leave,
        ...marks,
        reachesDisabled,
        ...removal.offered,
        ...(reorder === undefined ? {} : { reorder }),
      }),
      [
        choose,
        chose,
        chosen,
        role.offered,
        follows,
        hear,
        join,
        key,
        leave,
        off,
        reachesDisabled,
        removal.offered,
        reorder,
      ],
    )
    return merged(marked, role.host, removal.behavior, {
      marks: [],
      parts: {},
      provide: (drawn: ReactNode) => <Offered.Provider value={offer}>{drawn}</Offered.Provider>,
    })
  }
}
