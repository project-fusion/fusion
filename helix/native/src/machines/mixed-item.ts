import { kindOf, type MixedItem, nextChecked } from '@fusion.dev/helix-core/menu-items'
import { useLayoutEffect, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { PartBinding, Props } from '../render/behavior'
import type { Family } from '../style/form'
import type { Binder } from './binder'
import type { Joined } from './join'
import { boundTo, camel, given, senderOf, tell } from './props'

/**
 * Turns an item as a press does: to what core says a press turns it to,
 * once its `before` event stands, turning the rest of its run off where it
 * is one of a run. Says whether the item is a choice, whether or not it
 * turned.
 */
const tick = (
  family: Family,
  before: string | undefined,
  joined: Joined,
  now: { readonly flags: MixedItem; readonly props: Props },
  turn: (checked: boolean) => void,
): boolean => {
  const next = nextChecked(now.flags)
  if (next === undefined) {
    return kindOf(now.flags) !== 'command'
  }
  const sender = senderOf(family, joined.value)
  if (before !== undefined && !tell(family, now.props, before, { checked: next }, sender)) {
    return true
  }
  turn(next)
  if (kindOf(now.flags) === 'exclusive') {
    for (const peer of joined.offer?.runOf?.(joined.key) ?? []) {
      peer.request?.(false)
    }
  }
  /* The set hears the turn, which sends its own `after` events. */
  joined.offer?.turned?.(joined.key, next)
  return true
}

/**
 * Hosts an item of a set that mixes commands and choices, as a menu's row,
 * bound as the expansion binds `mixed-item`: the props that make it a
 * choice, one of a run, and checked, and the event it asks before a press
 * turns it. Core's `menu-items` says what kind of item it is and what a
 * press turns it to.
 *
 * **Its checked prop seeds it**, and a press then turns it, as the web's
 * `checked` attribute is the state a row starts in. Writing the prop again
 * sets it.
 *
 * **A press turns it before the press's event is sent**, after its
 * `before` event stands, as the web's Menu Item ticks a row and then sends
 * `helix-select`: a choice turns over, an item of a run only turns on, and a
 * command never turns. An item of a run that turns on turns the rest of its
 * run off, with nothing sent, as on the web.
 *
 * **The press that chooses it is checked or not as it holds it**, and a
 * command's is neither, so a screen reader hears a choice's state and no
 * state on a command. The element is in its `checked` state while it is.
 */
export const mixedItem = (family: Family, use: MachineUse): Binder => {
  const checkedProp = boundTo(use, 'checked', 'prop')
  const checkable = boundTo(use, 'checkable', 'prop')
  const exclusive = boundTo(use, 'exclusive', 'prop')
  const before = boundTo(use, 'before', 'event')
  return (props, around) => {
    const written = checkedProp === undefined ? undefined : props[camel(checkedProp)]
    const [checked, setChecked] = useState(written === true)
    useLayoutEffect(() => {
      if (typeof written === 'boolean') {
        setChecked(written)
      }
    }, [written])
    const flags: MixedItem = {
      checkable: given(family, props, checkable) === true,
      checked,
      exclusive: given(family, props, exclusive) === true,
    }
    const latest = useRef({ flags, props })
    latest.current = { flags, props }
    const { joined } = around
    if (joined !== undefined) {
      joined.turned.current = checked
      joined.request.current = setChecked
      joined.tick.current = () => tick(family, before, joined, latest.current, setChecked)
    }
    const states = kindOf(flags) === 'command' ? {} : { checked }
    const parts: Record<string, PartBinding> = { host: { states } }
    if (joined?.chooser !== undefined) {
      parts[joined.chooser] = { states }
    }
    return { marks: checked ? ['checked'] : [], parts }
  }
}
