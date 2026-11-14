import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { type RefObject, useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { type Behavior, type Props, STILL } from '../render/behavior'
import type { Family, Node } from '../style/form'
import type { Member, Offer } from './collection'
import { given, senderOf, tell } from './props'

/**
 * The press in `tree` that sends `event`, where it is drawn: each `when`
 * around it holds as `holds` reads it.
 */
const pressSending = (
  tree: readonly Node[] | undefined,
  event: string,
  holds: (node: Node) => boolean,
): Node | undefined => {
  for (const node of tree ?? []) {
    if (node.kind === 'when' && !holds(node)) {
      continue
    }
    if (node.kind === 'pressable' && node.attributes?.sends === event) {
      return node
    }
    const inner = pressSending(node.children, event, holds)
    if (inner !== undefined) {
      return inner
    }
  }
  return undefined
}

/**
 * Whether the item draws a press that sends `event` and is not disabled, as
 * a `dismissible` tag draws its remove button.
 */
const removable = (family: Family, props: Props, event: string | undefined): boolean => {
  if (event === undefined) {
    return false
  }
  const holds = (node: Node) =>
    Boolean(given(family, props, node.name)) !== (node.attributes?.unless === true)
  const press = pressSending(family.tree, event, holds)
  const off = press?.attributes?.disabled
  const disabled =
    typeof off === 'object' && off !== null && 'bind' in off
      ? given(family, props, String(off.bind)) === true
      : off === true
  return press !== undefined && !disabled
}

/** What an item reads at the moment it is removed. */
interface Latest {
  readonly offer: Offer | undefined
  readonly props: Props
  readonly value: string
  readonly words: string
}

/**
 * An item's removal from its set, where its set removes items with the event
 * `event` and the item draws the press that sends it, as a `dismissible`
 * tag draws its remove button. **Delete and Backspace send it from the
 * set**, as the press does: the item's consumer hears it with the item's
 * words as its `label`, and then the set's, as the event bubbles on the web.
 */
export const useRemove = (
  family: Family,
  props: Props,
  event: string | undefined,
  latest: RefObject<Latest>,
): { readonly remove: () => void; readonly removes: boolean } => {
  const removes = removable(family, props, event)
  const remove = useCallback(() => {
    const { offer: set, props: now, value: own, words: said } = latest.current
    const sends = set?.removes
    if (sends === undefined) {
      return
    }
    const detail = { label: said, value: own }
    const sender = senderOf(family, own)
    if (tell(family, now, sends, detail, sender)) {
      set?.hear(sends, detail, sender)
    }
  }, [family, latest])
  return { remove, removes }
}

/**
 * Takes each item that asked to be removed and has left out of the set's
 * choice, where no item left stands for its value.
 */
const pruneLeft = (
  before: readonly Member[],
  present: (key: object) => boolean,
  asked: (value: string) => boolean,
  prune: ((removed: string, left: readonly string[]) => void) | undefined,
): void => {
  const stays = (member: Member) => member.key !== undefined && present(member.key)
  const left = before.filter(stays).map((member) => member.value)
  for (const member of before) {
    if (!stays(member) && asked(member.value)) {
      prune?.(member.value, left)
    }
  }
}

/** The keys that remove the item with focus. */
const REMOVING = new Set(['Backspace', 'Delete'])

/** The item that held focus as the set last drew, where one did, and the items then. */
interface Held {
  readonly at: number
  readonly key: object | undefined
  readonly members: readonly Member[]
}

/** What a set that removes its items adds to its keys, its parts, and its offer. */
export interface Removal {
  readonly behavior: Behavior
  /**
   * Hears whether an event an item sent the set `stands`, and answers it:
   * the set's removal event that stands is an item asking to be removed.
   */
  readonly heard: (event: string, sender: { readonly value?: string }, stands: boolean) => boolean
  /** Hands the set a key pressed on an item, and answers whether it removed the item with it. */
  readonly key: (from: string, press: KeyPress) => boolean
  /** What the set offers its items of removal: the event their remove button sends. */
  readonly offered: Pick<Offer, 'removes'>
}

/**
 * Where focus goes once the item at `at` of `members` has left: the next
 * item still there that is not disabled, then the nearest before it, then
 * the first item left where every one is disabled.
 */
const nextFocus = (
  members: readonly Member[],
  at: number,
  present: (key: object) => boolean,
): Member | undefined => {
  const left = (member: Member) => member.key !== undefined && present(member.key)
  const after = members.slice(at + 1)
  const before = members.slice(0, at).reverse()
  return (
    [...after, ...before].find((member) => left(member) && !member.disabled) ?? members.find(left)
  )
}

/**
 * Removes the item with focus with Delete and Backspace, and keeps focus in
 * the set once the page has taken an item out, where the set's collection
 * says how its items are removed, as a tag group's does.
 *
 * **The set reads which item holds focus each time it draws**, while the
 * item is still there, and once the page takes that item out, focus moves to
 * the next item, or to the one before after the last, passing over a
 * disabled one, to the first where only disabled ones are left, and to the
 * part the collection names, its `empty` part, where none is left. An item
 * that leaves and joins again in one draw, as one whose props change does,
 * has not left. **An item that asked to be removed and left takes its value
 * out of the set's choice**, through `prune`, as a selected tag does.
 */
export const useRemoval = (
  family: Family,
  members: readonly Member[],
  present: (key: object) => boolean,
  prune?: (removed: string, left: readonly string[]) => void,
): Removal => {
  const removes = family.api?.collection?.removes
  const held = useRef<Held | undefined>(undefined)
  const empty = useRef<unknown>(null)
  const drawn = useRef<readonly Member[]>([])
  const pending = useRef(new Set<string>()).current
  /* In the order the items stood when last drawn, since an item the page
     has just taken out of its children is ranked after the rest. */
  if (removes !== undefined) {
    const now = focus().focused()
    const order = drawn.current.length > 0 ? drawn.current : members
    const at = now === null ? -1 : order.findIndex((member) => member.node?.() === now)
    held.current = at < 0 ? undefined : { at, key: order[at]?.key, members: order }
  }
  useLayoutEffect(() => {
    const before = drawn.current
    drawn.current = members
    pruneLeft(before, present, (value) => pending.delete(value), prune)
    const was = held.current
    if (was?.key === undefined || present(was.key)) {
      return
    }
    held.current = undefined
    const to = nextFocus(was.members, was.at, present)?.node?.() ?? empty.current
    if (to !== null && to !== undefined) {
      focus().focus(to, false)
    }
  })
  const latest = useRef(members)
  latest.current = members
  const key = useCallback(
    (from: string, press: KeyPress): boolean => {
      if (removes === undefined || !REMOVING.has(press.key) || press.alt || press.claimed) {
        return false
      }
      if (press.control || press.meta) {
        return false
      }
      const member = latest.current.find((one) => one.value === from)
      if (member?.remove === undefined || member.disabled) {
        return false
      }
      member.remove()
      return true
    },
    [removes],
  )
  const part = removes?.empty
  const behavior = useMemo<Behavior>(() => {
    if (part === undefined) {
      return STILL
    }
    const ref = (node: unknown) => {
      empty.current = node
    }
    return { marks: [], parts: { [part]: { view: { accessible: true, ref } } } }
  }, [part])
  const event = removes?.event
  const heard = useCallback(
    (sent: string, sender: { readonly value?: string }, stands: boolean) => {
      if (stands && sent === event) {
        pending.add(sender.value ?? '')
      }
      return stands
    },
    [event, pending],
  )
  const offered = useMemo(() => (event === undefined ? {} : { removes: event }), [event])
  return { behavior, heard, key, offered }
}
