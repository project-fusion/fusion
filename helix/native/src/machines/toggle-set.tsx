import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { type SetBox, selectAllPress, selectAllState } from '@fusion.dev/helix-core/select-all'
import { type ReactNode, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { listed } from './choice'
import { collection, type Member, type Offer, useMembers } from './collection'
import { closesPeers, keepsOpen, modeOf, settled } from './opening'
import { moveAmong } from './opening-keys'
import { boundTo, camel, eventsOf, given, type HelixEvent, senderOf, tell } from './props'

/** What a set whose items turn gives the rest of its element's machines. */
export interface Turning {
  readonly behavior: Behavior
  /** The values of the items that are on, separated by commas, in the order they stand. */
  readonly value: string
}

/** The values of the items that are on, in the order they stand. */
const valuesOn = (members: readonly Member[], on: (member: Member) => boolean): string =>
  members
    .filter(on)
    .map((member) => member.value)
    .join(',')

/** Each member as the select-all helpers read it. */
const boxesOf = (members: readonly Member[]): SetBox[] =>
  members.map((member) => ({
    checked: member.checked?.() === true,
    disabled: member.disabled,
    value: member.value,
  }))

/** Asks each open item but the one known by `key` to close, as an opened section closes its peers. */
const closePeers = (members: readonly Member[], key: object): void => {
  for (const peer of members) {
    if (peer.key !== key && peer.checked?.() === true) {
      peer.request?.(false)
    }
  }
}

/** Nothing a set whose items turn chooses on a press. */
const NOTHING = (): void => undefined

/**
 * Hosts a set whose items turn on their own, as a checkbox group holds its
 * boxes, bound as the expansion binds `toggle-set`: the prop that holds the
 * values of the items that are on, the prop that disables every item, the
 * events a change sends, and the box that turns every item at once.
 *
 * **The set reads its value from its items**, as the web group reads its
 * boxes, and holds them by item, since two boxes can share a value.
 *
 * **A turn asks twice.** An item's own `before` event stands first, then
 * the set asks with its `before` event, carrying the whole set that would
 * result, and a refusal by either keeps the item as it was. Where the change
 * stands, the set tells its `after` events before the item turns and tells
 * its own, as on the web.
 *
 * **A written value checks exactly the items whose values it names**, with
 * nothing sent, each time it is written.
 *
 * **The box that turns every item** checks every enabled item, or unchecks
 * them all once every one is, through the same `before` event, with a
 * disabled item kept as it is. It is checked while every enabled item is,
 * and mixed while only some are, as core's select-all helpers say.
 *
 * **A set whose items open holds them to its mode**, as an accordion does:
 * an item that opens under `single` or `single-collapsible` asks each other
 * open item to close, with its own `before-close`, and under `single` a press
 * on the open item sends nothing and keeps it open. The set settles on the
 * first open item as it draws, and on the first item under `single`, with
 * nothing sent.
 */
export const useToggleSet = (
  family: Family,
  props: Props,
  use: MachineUse,
  changed: () => void,
): Turning => {
  const { join, leave, members } = useMembers(props.children)
  const [, redraw] = useState(0)
  const before = boundTo(use, 'before', 'event')
  const after = eventsOf(use, 'after')
  const chosenProp = boundTo(use, 'chosen', 'prop')
  const written = chosenProp === undefined ? undefined : props[camel(chosenProp)]
  const off = given(family, props, boundTo(use, 'disabled', 'prop')) === true
  const value = valuesOn(members, (member) => member.checked?.() === true)
  /* Which items are open, by their place, which two items with one value do not blur. */
  const opened = members.map((member) => (member.checked?.() === true ? 1 : 0)).join('')
  const opensProp = boundTo(use, 'opens', 'prop')
  const mode = opensProp === undefined ? undefined : modeOf(given(family, props, opensProp))
  const latest = useRef({ changed, members, mode, props, value })
  latest.current = { changed, members, mode, props, value }
  /* Whether the set is closing an opened item's peers, which `single` lets close. */
  const peering = useRef(false)
  /* The items a turn opened, which closed their peers as they turned. */
  const pressed = useRef(new Set<object>())
  /* The items open at the last render, once the set has drawn. */
  const wasOpen = useRef<Set<object> | undefined>(undefined)

  /* What the set last wrote on each item, by item, and a count of writes. */
  const writes = useRef({ at: 0, held: new Map<object, boolean>() })
  const write = useCallback((on: (member: Member) => boolean) => {
    const next = new Map<object, boolean>()
    for (const member of latest.current.members) {
      if (member.key !== undefined) {
        next.set(member.key, on(member))
      }
    }
    writes.current = { at: writes.current.at + 1, held: next }
    redraw((count) => count + 1)
  }, [])
  const shape = members.map((member) => member.value).join('\u0000')
  useLayoutEffect(() => {
    if (typeof written === 'string' && shape !== '') {
      const wanted = new Set(listed(written))
      write((member) => wanted.has(member.value))
    }
  }, [shape, write, written])

  /* Asks the consumer for the set `on` leaves, and tells the change where it stands. */
  const change = useCallback(
    (on: (member: Member) => boolean): boolean => {
      const now = latest.current
      const next = valuesOn(now.members, on)
      if (
        before !== undefined &&
        !tell(family, now.props, before, { value: next }, senderOf(family, now.value))
      ) {
        return false
      }
      for (const event of after) {
        tell(family, now.props, event, {}, senderOf(family, next))
      }
      now.changed()
      return true
    },
    [after, before, family],
  )
  const turn = useCallback(
    (key: object, checked: boolean) => {
      if (!change((member) => (member.key === key ? checked : member.checked?.() === true))) {
        return false
      }
      if (checked) {
        pressed.current.add(key)
      }
      return true
    },
    [change],
  )
  /* **An item that opened closes its peers once it stands open**, after its
     own events, as the web section announces, then applies, then closes
     them. */
  const turned = useCallback((key: object, checked: boolean) => {
    const now = latest.current
    if (checked && now.mode !== undefined && closesPeers(now.mode) && !peering.current) {
      peering.current = true
      closePeers(now.members, key)
      peering.current = false
    }
  }, [])
  /* The arrow keys, Home and End move between the items of a set that opens them. */
  const opening = opensProp !== undefined
  const key = useCallback(
    (_from: string, press: KeyPress, member?: object) =>
      opening && moveAmong(latest.current.members, member, press),
    [opening],
  )
  const keeps = useCallback(
    (_key: object, checked: boolean) =>
      !peering.current &&
      latest.current.mode !== undefined &&
      keepsOpen(latest.current.mode, checked),
    [],
  )
  /* The set settles on its mode as its items join and as the mode changes. */
  const count = members.length
  // biome-ignore lint/correctness/useExhaustiveDependencies: the set settles again as items join or leave.
  useLayoutEffect(() => {
    const now = latest.current.members
    const open = now.map((one) => one.checked?.() === true)
    const next = mode === undefined ? undefined : settled(mode, open)
    if (next !== undefined) {
      write((member) => next[now.indexOf(member)] === true)
    }
  }, [count, mode, write])
  /* **An item opened any other way closes its peers too**, as a page that
     writes `open` does on the web, but not as the set first draws. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: the set looks again each time an item opens or closes.
  useLayoutEffect(() => {
    const now = latest.current
    const open = new Set(
      now.members.filter((one) => one.checked?.() === true).map((one) => one.key),
    )
    const was = wasOpen.current
    wasOpen.current = open as Set<object>
    if (was === undefined || now.mode === undefined || !closesPeers(now.mode)) {
      pressed.current.clear()
      return
    }
    for (const key of open) {
      if (key !== undefined && !was.has(key) && !pressed.current.has(key)) {
        peering.current = true
        closePeers(now.members, key)
        peering.current = false
      }
    }
    pressed.current.clear()
  }, [opened])
  const holds = useCallback((key: object) => {
    const checked = writes.current.held.get(key)
    return checked === undefined ? undefined : { at: writes.current.at, checked }
  }, [])
  const moved = useCallback(() => redraw((count) => count + 1), [])

  /* The box that turns every item, drawn as the part the binding names. */
  const allPart = boundTo(use, 'all-part', 'part')
  const words = given(family, props, boundTo(use, 'all-label', 'prop'))
  const every = selectAllState(boxesOf(members))
  const all = useCallback(
    (event: HelixEvent) => {
      event.preventDefault()
      const pressed = selectAllPress(boxesOf(latest.current.members))
      const keys = new Set(
        latest.current.members.filter((_, at) => pressed[at]).map((member) => member.key),
      )
      if (change((member) => keys.has(member.key))) {
        write((member) => keys.has(member.key))
      }
    },
    [change, write],
  )

  const Offered = collection(family.name)
  const offer = useMemo<Offer>(
    () => ({
      choose: NOTHING,
      chosen: () => false,
      ...(off ? { disabled: true } : {}),
      follows: false,
      hear: () => true,
      holds,
      join,
      keeps,
      key,
      leave,
      moved,
      ownKeys: true,
      toggles: true,
      turn,
      turned,
    }),
    [holds, join, keeps, key, leave, moved, off, turn, turned],
  )
  return {
    behavior: {
      marks: [],
      parts:
        allPart === undefined
          ? {}
          : {
              [allPart]: {
                view: {
                  checked: every.checked,
                  disabled: off,
                  indeterminate: every.indeterminate,
                  label: typeof words === 'string' ? words : '',
                  onBeforeCheck: all,
                },
              },
            },
      provide: (drawn: ReactNode) => <Offered.Provider value={offer}>{drawn}</Offered.Provider>,
    },
    value,
  }
}
