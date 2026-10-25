import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { type ToggleEffect, toggleHost } from '@fusion.dev/helix-core/machines/toggle/host'
import type { ToggleContext } from '@fusion.dev/helix-core/machines/toggle/machine'
import * as toggle from '@fusion.dev/helix-core/machines/toggle/toggle.generated'
import { useCallback, useLayoutEffect, useRef } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { useHeld } from './held'
import { boundTo, camel, eventsOf, given, type Sender, senderOf, tell, told } from './props'
import { useMachine } from './use-machine'

/** What a toggle gives the press that turns it, and the part it is drawn on. */
export interface Turned {
  /**
   * The states its part reads, `checked`, and `mixed` while it shows
   * neither, and the states every part reads under the names of the props
   * that hold them, as a stylesheet reads `:state(checked)` and
   * `:state(indeterminate)` on the web.
   */
  readonly behavior: Behavior
  /** The part a press turns it with, the pressable that `toggles`. */
  readonly part: string
  /** Asks to turn it the other way, as a press on its part does. */
  readonly turn: () => void
  /**
   * Stands it as `checked` says with nothing asked, and sends `changes`, as a
   * tour closes once its last stop is finished.
   */
  readonly stand?: (checked: boolean) => void
  /** Whether it is checked now, as the machine holds it. */
  readonly checked: boolean
}

/**
 * What the set an element turns in gives its toggle, as a checkbox group
 * gives each box: whether the set disables it, the gate a turn passes once
 * the element's own event stands, and what the set last wrote on it.
 */
export interface InSet {
  readonly disabled?: boolean
  readonly gate?: (checked: boolean) => boolean
  /** Whether the set keeps the element from turning to `checked`, before anything is asked. */
  readonly keeps?: (checked: boolean) => boolean
  /** Hears a turn the element made, once its own events are sent. */
  readonly turned?: (checked: boolean) => void
  readonly held?: { readonly at: number; readonly checked: boolean }
}

/**
 * Escape from a hardware keyboard on the press that turns a toggle that
 * `escapes`, which closes it as the press does while it stands open, as a
 * toast item's dismiss button closes its message. A key with a modifier is
 * left alone.
 */
const useEscape = (
  escapes: boolean,
  open: boolean,
  turn: () => void,
): { readonly view?: Readonly<Record<string, unknown>> } => {
  const latest = useRef({ open, turn })
  latest.current = { open, turn }
  const stop = useRef<(() => void) | undefined>(undefined)
  const ref = useCallback((node: unknown) => {
    stop.current?.()
    stop.current =
      node === null
        ? undefined
        : keys().listen(node, (press) => {
            const plain = !press.alt && !press.control && !press.meta && !press.shift
            if (press.key !== 'Escape' || !plain || !latest.current.open) {
              return false
            }
            latest.current.turn()
            return true
          })
  }, [])
  return escapes ? { view: { ref } } : {}
}

/**
 * The event a turn to `checked` asks with: **a toggle that opens asks with
 * the event of its direction**, as an accordion section asks `before-open`
 * or `before-close`, and any other with its `before`. **A toggle that only
 * closes asks as it closes**, as a callout's `dismiss`, and opens with
 * nothing asked.
 */
const askingOf = (
  events: {
    readonly before: string | undefined
    readonly closes: string | undefined
    readonly opens: string | undefined
  },
  checked: boolean,
): { readonly event: string; readonly opens: boolean } | undefined => {
  if (events.opens !== undefined || events.closes !== undefined) {
    const opening = checked ? events.opens : events.closes
    return opening === undefined ? undefined : { event: opening, opens: true }
  }
  return events.before === undefined ? undefined : { event: events.before, opens: false }
}

/**
 * Tells the events of a toggle that stands the other way: `changes`, with
 * `newState` and `oldState`, and once it stands closed, `closed`.
 */
const tellStood = (
  family: Family,
  props: Props,
  now: boolean,
  events: { readonly changes: string | undefined; readonly closed: string | undefined },
): void => {
  const sender = senderFor(family, props, now)
  if (events.changes !== undefined) {
    const states = { newState: now ? 'open' : 'closed', oldState: now ? 'closed' : 'open' }
    tell(family, props, events.changes, states, sender)
  }
  if (events.closed !== undefined && !now) {
    tell(family, props, events.closed, {}, sender)
  }
}

/** What a turn's events carry as `target`: whether the element is checked, and its value. */
const senderFor = (family: Family, props: Props, checked: boolean): Sender => ({
  ...senderOf(family, given(family, props, 'value')),
  checked,
})

/**
 * Hosts a toggle on an element, as the expansion binds it: the prop that
 * holds whether it is checked, its seed, the props that show it mixed and
 * keep it read-only, the prop behind its pressable's `disabled`, and the
 * events a turn sends.
 *
 * **A written `checked` is a seed the element still turns.** Written by the
 * consumer, it takes the machine there with nothing sent, as a script
 * writing the web element's property does; where nothing is written, the
 * seed prop says where it starts. A written `mixed` shows the dash until a
 * press resolves it, and writing it again shows it again.
 *
 * **A turn asks, then tells**: the `before` event first, which a handler can
 * refuse, with the state it would leave in `detail.checked`, and the `after`
 * event once it has turned. A toggle that opens asks with `opens` or
 * `closes` by the way it turns, with `detail.open`, as the web's
 * `before-open` and `before-close` carry it. Each carries the element's state as it stands in
 * `target.checked`, as a web handler reads it.
 *
 * **`changes` is sent once it stands the other way, however it came to**:
 * a turn, a written `checked`, or its set's write, with `newState` and
 * `oldState`, as the web's `toggle` follows a section's `open`. A turn sends
 * it as the turn stands, before the press that asked sends its own event,
 * as on the web. `closed` is sent after it, once it stands closed, as a
 * dialog sends `close`.
 *
 * **A state the runtime holds is written as a prop would be**, as Motion
 * Toggle's paused motion is: a change made elsewhere, by another Motion Toggle
 * or by the app, takes the machine there with nothing sent, and a turn writes
 * it before the `after` event is sent.
 *
 * **The form capability is given no control**, since on a phone the app owns
 * its forms and reads the state from the element's events.
 *
 * **In a set whose items turn on their own**, a turn asks the set once the
 * element's own event stands, a write from the set takes the machine there
 * with nothing sent, as a written `checked` does, and the set's `disabled`
 * disables the element.
 */
export const useToggle = (
  family: Family,
  props: Props,
  use: MachineUse,
  turned?: (checked: boolean) => void,
  set: InSet = {},
): Turned => {
  const part = boundTo(use, 'part', 'part') ?? ''
  const before = boundTo(use, 'before', 'event')
  const opens = boundTo(use, 'opens', 'event')
  const closes = boundTo(use, 'closes', 'event')
  const after = eventsOf(use, 'after')
  const changes = boundTo(use, 'changes', 'event')
  const closed = boundTo(use, 'closed', 'event')
  const checkedProp = boundTo(use, 'checked', 'prop')
  const mixedProp = boundTo(use, 'mixed', 'prop')
  const held = useHeld(boundTo(use, 'held', 'held'))
  const written =
    held?.checked ?? (checkedProp === undefined ? undefined : props[camel(checkedProp)])
  /* Where nothing seeds it, the checked prop's default does, as a callout
     stands open until it is dismissed. */
  const seeded = given(family, props, boundTo(use, 'seed', 'prop') ?? checkedProp)
  const mixed = given(family, props, boundTo(use, 'mixed', 'prop')) === true
  const disabled =
    set.disabled === true || given(family, props, boundTo(use, 'disabled', 'prop')) === true
  const readOnly = given(family, props, boundTo(use, 'readonly', 'prop')) === true
  const checked = typeof written === 'boolean' ? written : seeded === true
  /* The props the effects read, which the latest render wrote. */
  const latest = useRef(props)
  latest.current = props
  const writes = useRef(held?.set)
  writes.current = held?.set
  const gate = useRef(set)
  gate.current = set
  /* The state `changes` last said the element stands in, from the first render. */
  const stood = useRef(checked)
  const announce = (now: boolean): void => {
    if ((changes === undefined && closed === undefined) || now === stood.current) {
      return
    }
    stood.current = now
    tellStood(family, latest.current, now, { changes, closed })
  }
  const announcing = useRef(announce)
  announcing.current = announce
  const machine = useMachine<ToggleContext, undefined, ToggleEffect>(
    toggle,
    { checked, disabled, mixed, readOnly },
    toggleHost<null>({
      change: (now) => {
        writes.current?.(now)
        const sender = senderFor(family, latest.current, now)
        for (const event of after) {
          tell(family, latest.current, event, { checked: now }, sender)
        }
        announcing.current(now)
        turned?.(now)
        gate.current.turned?.(now)
      },
      control: () => null,
      value: () => String(given(family, latest.current, 'value') ?? 'on'),
    }),
    (_events, proposed, current) => {
      if (gate.current.keeps?.(proposed.checked) === true) {
        return false
      }
      const asking = askingOf({ before, closes, opens }, proposed.checked)
      const asked =
        asking === undefined
          ? undefined
          : told(
              family,
              latest.current,
              asking.event,
              asking.opens
                ? { open: proposed.checked }
                : { checked: proposed.checked, value: given(family, latest.current, 'value') },
              senderFor(family, latest.current, current.checked),
            )
      if (asked?.defaultPrevented === true) {
        return false
      }
      /* The set's refusal refuses the element's own request too, as a
         checkbox group refuses a box's `before-toggle` on the web. */
      if (gate.current.gate?.(proposed.checked) === false) {
        asked?.preventDefault()
        return false
      }
      /* **It stands the other way once the turn stands**, so `changes` is
         sent now, before anything the press that turned it sends after,
         as the web sends `toggle` as it turns, ahead of the press's own
         event. The move's effect finds it told and says nothing again. */
      announcing.current(proposed.checked)
      return true
    },
    ['checked', 'mixed'],
  )
  const { context, reseat, revise, send } = machine
  /* The context the component last drew, read by the effects below, which
     run only when a prop they follow changes. Its `disabled` and `readOnly`
     may be older than the runner's, so a reseat takes them from the props. */
  const now = useRef(context)
  now.current = context
  const flags = useRef({ disabled, readOnly })
  flags.current = { disabled, readOnly }
  useLayoutEffect(() => {
    revise((held) => ({ ...held, disabled, readOnly }))
  }, [disabled, readOnly, revise])
  useLayoutEffect(() => {
    if (typeof written === 'boolean' && written !== now.current.checked) {
      now.current = { ...now.current, ...flags.current, checked: written }
      reseat(now.current)
      announcing.current(written)
    }
  }, [written, reseat])
  /* What the set wrote, each time it writes: a write that repeats the
     state takes it again, so its count is what the effect follows. */
  const pushed = useRef(set.held)
  pushed.current = set.held
  const count = set.held?.at
  useLayoutEffect(() => {
    const wrote = pushed.current
    if (count !== undefined && wrote !== undefined && wrote.checked !== now.current.checked) {
      now.current = { ...now.current, ...flags.current, checked: wrote.checked }
      reseat(now.current)
      announcing.current(wrote.checked)
    }
  }, [count, reseat])
  const shown = useRef(mixed)
  useLayoutEffect(() => {
    if (mixed !== shown.current) {
      shown.current = mixed
      now.current = { ...now.current, ...flags.current, mixed }
      reseat(now.current)
    }
  }, [mixed, reseat])
  const turn = useCallback(() => send(toggle.EVENT_PRESS, undefined), [send])
  const stand = useCallback(
    (to: boolean) => {
      if (to !== now.current.checked) {
        now.current = { ...now.current, ...flags.current, checked: to }
        reseat(now.current)
        announcing.current(to)
      }
    },
    [reseat],
  )
  const escapes = useEscape(boundTo(use, 'escapes', 'key') === 'Escape', checked, turn)
  /* Every part reads the toggle under the names of its props, or a state
     the runtime holds under the state it shows, as `paused`, as a
     stylesheet reads the element's state. */
  const shows: Record<string, boolean> = {}
  if (checkedProp !== undefined) {
    shows[checkedProp] = context.checked
  }
  if (mixedProp !== undefined) {
    shows[mixedProp] = context.mixed
  }
  if (held !== undefined) {
    shows[held.state] = context.checked
  }
  return {
    behavior: {
      marks: [],
      parts: {
        host: { states: shows },
        [part]: { states: { checked: context.checked, mixed: context.mixed }, ...escapes },
      },
    },
    checked: context.checked,
    part,
    stand,
    turn,
  }
}
