import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { type Context, createContext, useCallback, useRef, useState } from 'react'
import type { PartBinding } from '../render/behavior'
import { carryIntoLayers } from '../render/carry'
import type { Sender } from './props'
import type { ReorderOffer } from './reorder'

/** An item of a set, as it joins: what the set's machines read of it. */
export interface Member {
  /** Tells the item's own consumer it was acted on, before the set's hears it, as an event bubbles on the web. */
  readonly act?: () => void
  /**
   * Sends the event a press on the item sends before it is chosen, such as a
   * tab's `select`, to the item's own consumer and then the set's, and answers
   * whether both let it stand. An item whose press sends none has no `ask`.
   */
  readonly ask?: () => boolean
  /** Whether it is checked now, for an item that turns on its own, as a box in a checkbox group. */
  readonly checked?: () => boolean
  /** Whether a press on it chooses it, as a tab's does and a panel's does not. */
  readonly chooses: boolean
  readonly disabled: boolean
  /** Whether it is one of a run of which one is checked, in a set that mixes, as a menu's radio rows. */
  readonly exclusive?: boolean
  /** What the set knows the item by, which two items with one value do not share. */
  readonly key?: object
  /** Where acting on it goes, where it is a link. */
  readonly link?: string
  /**
   * The word its flag holds, where the flag holds one, as a destination is
   * current as `page` or `location`.
   */
  readonly flagged?: string
  /** Whether its markup writes it `selected`, which a set that may hold no choice opens on. */
  readonly marked?: boolean
  /** The view focus moves to on the item, once it is drawn. */
  readonly node?: () => unknown
  /**
   * Presses the item's remove button, where its set removes items and the
   * item draws one, as Delete and Backspace on a tag do.
   */
  readonly remove?: () => void
  /**
   * Asks an item that turns on its own to turn to `checked`, as a press on
   * it does, with its events, as an accordion closes a section's peers.
   */
  readonly request?: (checked: boolean) => void
  readonly value: string
  /**
   * Its words, which typeahead matches and a screen reader hears. `''` where
   * it has none, which typeahead passes over.
   */
  readonly words: string
}

/** What a set offers the items that join it. */
export interface Offer {
  /** Asks the set to choose the item with this value, as a press on it does. */
  readonly choose: (value: string) => void
  /** Whether the item with this value is chosen. */
  readonly chosen: (value: string) => boolean
  /**
   * Whether the set disables every item, as a disabled radio group does. An
   * item is disabled while it or its set says so.
   */
  readonly disabled?: boolean
  /**
   * Whether the set follows an item's link itself, as a list that selects
   * nothing does in place of acting on the row. Elsewhere the item follows
   * its own once its choice is sent.
   */
  readonly follows: boolean
  /**
   * Hears that a press chose an item and its event stood, with the item's
   * own prop its item's `closes` names, where the set's `closes` closes the
   * element as an item is chosen, as a menu closes as a row is chosen, and
   * whether a Space chose a choice, which keeps it open where the item's own
   * prop says nothing, as on the web.
   */
  readonly chose?: (own: unknown, kept?: boolean) => void
  /**
   * Tells the set's consumer an event an item sent, with what its `target`
   * carries of the item, as the event bubbles to the set on the web, and
   * answers whether the consumer let it stand. An event the set does not
   * send stands.
   */
  readonly hear: (
    event: string,
    detail: Readonly<Record<string, unknown>>,
    sender: Sender,
  ) => boolean
  /**
   * What the set last wrote on the item it knows by `key`, where its items
   * turn on their own: whether it is checked, and a count that moves each
   * time the set writes, so the item takes a write that repeats its state.
   */
  readonly holds?: (key: object) => { readonly at: number; readonly checked: boolean } | undefined
  readonly join: (key: object, member: Member) => void
  /**
   * Whether the set keeps the item it knows by `key` from turning to
   * `checked` before the item asks anyone, as an accordion under `single`
   * keeps its open section open and sends nothing.
   */
  readonly keeps?: (key: object, checked: boolean) => boolean
  /**
   * Hands the set a key pressed on the item with this value, and the key
   * the set knows the item by, and answers whether the set took it, so the
   * platform does nothing else with it.
   */
  readonly key: (from: string, press: KeyPress, member?: object) => boolean
  readonly leave: (key: object) => void
  /**
   * Whether the items say themselves which is current, as a navigation's
   * destinations do: the set lays no flag over an item, which keeps its own.
   */
  readonly marks?: true
  /**
   * Whether the set mixes commands and choices, as a menu does: each item
   * that is a choice holds whether it is checked, and turns before the
   * event its press sends.
   */
  readonly mixes?: true
  /**
   * The other items of the run the item known by `key` stands in, in a set
   * that mixes: the items of a run next to it, up to the first that is none.
   */
  readonly runOf?: (key: object) => readonly Member[]
  /** Tells the set an item that turns on its own has turned, so it draws its set again. */
  readonly moved?: () => void
  /**
   * The event an item's remove button sends, where the set's collection
   * says how its items are removed, as a tag group's says `dismiss`.
   */
  readonly removes?: string
  /**
   * What the set lays over the parts of the item with this value, by the
   * item's part names, as a list that reorders binds each row's grip.
   */
  readonly parts?: (value: string) => Readonly<Record<string, PartBinding>>
  /**
   * Whether Space and Enter on an item are the item's own press, as a button
   * group's buttons and a checkbox group's boxes hear them. The item's press
   * then hears its keys itself, is a control of the toolbar around it, and
   * the set's selection takes no key.
   */
  readonly ownKeys?: true
  /**
   * How the items show they are chosen, as the prop the collection's
   * `presses` names says: **as radios**, of which the set chooses one, as a
   * toggle group's toggles are where one is chosen, **or as toggle buttons
   * that each press on their own**, as they are under
   * `selection-mode="multiple"`. An item is then in the state its form's
   * `item` names while chosen, as a Button is `pressed`. Absent where the
   * set says neither, as a button group without a selection mode.
   */
  readonly shows?: 'radio' | 'toggle'
  /**
   * Whether a disabled item is still pressed, acted on, and reached by the
   * keys, and kept out of the choice alone, as a list with
   * `disabled-behavior="selection"` keeps its disabled rows.
   */
  readonly reachesDisabled?: boolean
  /**
   * Whether the items turn on their own, as a checkbox group's boxes do: an
   * item asks the set with `turn` before it turns, and is a stop of its own.
   */
  readonly toggles?: true
  /**
   * Asks the set whether the item it knows by `key` may turn to `checked`,
   * once the item's own event stands: the set asks its consumer with the
   * whole set that would result, and tells the change where it stands.
   */
  readonly turn?: (key: object, checked: boolean) => boolean
  /**
   * Tells the set the item it knows by `key` has turned to `checked`, once
   * its own events are sent, as an opened accordion section then closes its
   * peers.
   */
  readonly turned?: (key: object, checked: boolean) => void
  /**
   * Tells a set that mixes an item's press has sent its event, which sends
   * the set's `after` events where the press turned a choice: at once where
   * the event was refused, and once the set has heard it where it stands.
   */
  readonly sent?: (stands: boolean) => void
  /** How the set moves its items, where it binds reorder, which an item with a grip draws itself from. */
  readonly reorder?: ReorderOffer
}

/**
 * Whether the keys reach `member`: an item a press chooses that is not
 * disabled, or that is disabled where `disabledToo`. **An item whose view is
 * not drawn is out of reach**, as a row on a page of a stack that is not
 * showing is, read as the key is pressed.
 */
export const reaches = (member: Member, disabledToo = false): boolean =>
  member.chooses &&
  (!member.disabled || disabledToo) &&
  (member.node === undefined || drawnNode(member.node()))

/** Whether a member's view is drawn: a view, where the item has given one. */
const drawnNode = (node: unknown): boolean => node !== null

/* One context per set, by the name its items join it by, made once. */
const made = new Map<string, Context<Offer | undefined>>()

/** The context a set offers itself through, by the name its items join it by. */
export const collection = (name: string): Context<Offer | undefined> => {
  let found = made.get(name)
  if (found === undefined) {
    found = createContext<Offer | undefined>(undefined)
    made.set(name, found)
    /* What a layer holds joins the set of the element that opens it, as a
       menu's items join their menu. */
    carryIntoLayers(found)
  }
  return found
}

/**
 * The value of each element among `children`, in the order they are drawn,
 * which is the order a set reads its items in, as the web element reads its
 * own children.
 */
export const ranked = (
  children: unknown,
  into = new Map<string, number>(),
): Map<string, number> => {
  if (Array.isArray(children)) {
    for (const child of children) {
      ranked(child, into)
    }
    return into
  }
  if (typeof children !== 'object' || children === null || !('props' in children)) {
    return into
  }
  const props = (children as { props: Readonly<Record<string, unknown>> }).props
  if (typeof props.value === 'string' && !into.has(props.value)) {
    into.set(props.value, into.size)
  }
  ranked(props.children, into)
  return into
}

/**
 * Keeps the items that have joined a set, in the order its children name
 * them, and those drawn deeper after, in the order they joined. An item that
 * joins or leaves draws the set again. `present` answers whether the item a
 * set knows by a key has joined now, after what has been drawn since.
 */
export const useMembers = (
  children: unknown,
): {
  readonly join: Offer['join']
  readonly leave: Offer['leave']
  readonly members: readonly Member[]
  readonly present: (key: object) => boolean
} => {
  const held = useRef(new Map<object, { readonly member: Member; readonly order: number }>())
  const joined = useRef(0)
  const [, setVersion] = useState(0)
  const join = useCallback((key: object, member: Member) => {
    const before = held.current.get(key)
    held.current.set(key, { member, order: before?.order ?? joined.current++ })
    setVersion((version) => version + 1)
  }, [])
  const leave = useCallback((key: object) => {
    held.current.delete(key)
    setVersion((version) => version + 1)
  }, [])
  const present = useCallback((key: object) => held.current.has(key), [])
  const ranks = ranked(children)
  const place = (entry: { readonly member: Member; readonly order: number }): number =>
    ranks.get(entry.member.value) ?? ranks.size + entry.order
  const members = [...held.current.values()]
    .sort((left, right) => place(left) - place(right))
    .map((entry) => entry.member)
  return { join, leave, members, present }
}
