import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import type { KeyPress, Stop, Transition } from '@fusion.dev/helix-core/capabilities/types'
import type {
  ReorderContext,
  ReorderInput,
  ReorderSpan,
} from '@fusion.dev/helix-core/machines/reorder/machine'
import * as reorder from '@fusion.dev/helix-core/machines/reorder/reorder.generated'
import { dropMark, type ReorderAxis, reorderKey } from '@fusion.dev/helix-core/reorder'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import { split, transformed } from '../render/styles'
import type { Family } from '../style/form'
import type { Theme } from '../theme/theme'
import type { Member } from './collection'
import { useResolve } from './indicator'
import { boundTo, given, senderOf, tell } from './props'
import {
  AXIS,
  inputOf,
  keyOf,
  type Latest,
  movable,
  movesOf,
  type ReorderViews,
  rest,
  type Send,
  setOf,
  spanOf,
  wordsOf,
} from './reorder-moves'
import { useMachine } from './use-machine'

/** Where an item stands in a move, as it draws itself. */
export interface Standing {
  /** The name of the item's grip, which draws the grip, while the set lets the item move. */
  readonly grip: string | undefined
  /** Whether a pointer lifted the item, until it is at rest: drawn raised, over the others. */
  readonly lifted: boolean
  /**
   * The state the item's styles read while the keys hold a move: the item
   * held, or the one the drop goes beside.
   */
  readonly move: 'dragging' | 'drop-after' | 'drop-before' | undefined
  /** How far the item stands aside along the axis to make room for the one lifted. */
  readonly room: number
  /** Whether the item takes its room at once, since the layout has moved it there. */
  readonly settles: boolean
}

/** What a set that moves its items offers each one, through the set's offer. */
export interface ReorderOffer {
  readonly axis: ReorderAxis
  /** Holds the views the item with `key` draws, until stopped. */
  readonly hold: (key: string, views: ReorderViews) => Stop
  /** Hands the set a key pressed on the grip of the item with `key`, and answers whether it took it. */
  readonly key: (key: string, press: KeyPress) => boolean
  /** Tells the set an item was laid out again, so the set hears the items again. */
  readonly moved: () => void
  /** Moves the item with `key` one place toward the end, or toward the start, as a screen reader adjusts its grip. */
  readonly nudge: (key: string, forward: boolean) => void
  /** How a lifted item looks: the set's preview part, where it has one. */
  readonly raised: Readonly<Record<string, unknown>> | undefined
  /** Where the item with `key` stands in the move, as the set last drew it. */
  readonly standing: (key: string) => Standing
  /** How an item glides aside to make room, and back. */
  readonly transition: Transition
}

/** Where a move stands, as the items draw it. */
type Phase = 'held' | 'idle' | 'landing' | 'lifted' | 'returning'

const PHASES: Readonly<Record<number, Phase>> = {
  [reorder.STATE_DRAGGING]: 'lifted',
  [reorder.STATE_HELD]: 'held',
  [reorder.STATE_LANDING]: 'landing',
  [reorder.STATE_RETURNING]: 'returning',
}

/** How far the items after the lifted one stand aside, and the items before it. */
interface Pitch {
  readonly ahead: number
  readonly behind: number
}

const STILL: Pitch = { ahead: 0, behind: 0 }

/** What every item's standing is read from, as the set drew it. */
interface Drawn {
  readonly context: ReorderContext
  readonly latest: Latest
  /** The words a grip is named by, where `{name}` is the item's. */
  readonly move: string
  readonly phase: Phase
  readonly pitch: Pitch
}

/** The fields of the context the set and its items draw from. */
const DRAWN: readonly (keyof ReorderContext)[] = ['from', 'key', 'order', 'to']

/** Nothing held, on a host that draws glides. */
const SEED: ReorderContext = {
  from: 0,
  glides: true,
  key: '',
  order: [],
  pointer: 0,
  speed: 0,
  to: 0,
  token: 0,
  x: 0,
  y: 0,
}

/** How long a glide runs: the theme's normal duration, and none without a theme. */
const durationOf = (tokens: Theme['tokens']): number => {
  const duration = tokens['duration-normal']
  return typeof duration === 'number' ? duration : Number.parseFloat(String(duration ?? 0)) || 0
}

const same = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((key, at) => key === right[at])

/**
 * How far the items between the lifted one's place and where it would go
 * stand aside: an item after it as far as from its start to the start of the
 * item after it, and an item before it as far as from the end of the item
 * before it to its end. The space between items comes with each.
 */
const pitchOf = (spans: readonly (ReorderSpan | undefined)[], from: number): Pitch => {
  const held = spans[from]
  const after = spans[from + 1]
  const before = spans[from - 1]
  return {
    ahead: held && after ? after.start - held.start : 0,
    behind: held && before ? held.end - before.end : 0,
  }
}

/** How far the item at `at` stands aside while the lifted one would go from `from` to `to`. */
const roomOf = (at: number, { from, to }: ReorderContext, pitch: Pitch): number => {
  if (from < to && at > from && at <= to) {
    return -pitch.ahead
  }
  if (to < from && at >= to && at < from) {
    return pitch.behind
  }
  return 0
}

/** The state an item's styles read while the keys hold the item with `context.key`. */
const markOf = ({ context, latest }: Drawn, key: string): Standing['move'] => {
  if (key === context.key) {
    return 'dragging'
  }
  const mark = dropMark(context.from, context.to)
  return mark !== undefined && latest.keys[mark.index] === key ? `drop-${mark.edge}` : undefined
}

/** The name of the grip of the item at `at`, while the set lets it move. */
const gripOf = ({ latest, move }: Drawn, at: number, key: string): string | undefined => {
  const member = latest.members[at]
  if (!latest.enabled || member === undefined || member.disabled) {
    return undefined
  }
  const name = member.words || key
  return move === '' ? name : formatMessage(move, { name }, locale().read())
}

/**
 * Where the item with `key` stands. **The others make room while a pointer
 * lifts an item**, and keep it while it lands until the page draws the new
 * order, where they stand at once. A move the keys hold moves nothing, and
 * marks the item held and the one the drop goes beside, as on the web.
 */
const standingOf = (drawn: Drawn, key: string): Standing => {
  const { context, latest, phase } = drawn
  const at = latest.keys.indexOf(key)
  const own = key === context.key
  const landed = phase === 'landing' && same(latest.keys, context.order)
  const room = phase === 'lifted' || (phase === 'landing' && !landed)
  return {
    grip: gripOf(drawn, at, key),
    lifted: own && (phase === 'lifted' || phase === 'landing' || phase === 'returning'),
    move: phase === 'held' ? markOf(drawn, key) : undefined,
    room: room && !own ? roomOf(at, context, drawn.pitch) : 0,
    settles: landed || phase === 'idle',
  }
}

/**
 * Hands the set a key pressed on the grip of the item with `key`, and
 * answers whether the set took it, as the web list hears keys on a grip:
 * Enter or Space picks the item up and drops it, the arrows, Home, and End
 * move it while it is held, and Escape puts it back. `now` is the machine's
 * state and context as the set last drew them.
 */
const keyed = (
  latest: Latest,
  send: Send,
  now: { readonly context: ReorderContext; readonly state: number },
  key: string,
  press: KeyPress,
): boolean => {
  if (press.claimed || press.alt || press.control || press.meta) {
    return false
  }
  const input = inputOf(latest, key, { keyName: press.key })
  const holding = now.state === reorder.STATE_HELD && now.context.key === key
  if (press.key === 'Enter' || press.key === ' ') {
    send(reorder.EVENT_PICK, input)
    return holding || (now.state === reorder.STATE_IDLE && movable(latest, key))
  }
  if (press.key === 'Escape') {
    send(reorder.EVENT_CANCEL, input)
    return holding
  }
  const { axis, rtl } = setOf(latest)
  const to = reorderKey(press.key, { axis, count: latest.keys.length, rtl, to: now.context.to })
  if (!holding || press.shift || to === null) {
    return false
  }
  send(reorder.EVENT_STEP, input)
  return true
}

/**
 * Moves the item with `key` one place toward the end, or toward the start,
 * as a screen reader adjusts its grip: the key that moves it a place, along
 * the axis and the reading direction.
 */
const nudged = (latest: Latest, send: Send, key: string, forward: boolean): void => {
  const { axis, rtl } = setOf(latest)
  const ahead = axis === 'block' ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight'
  const back = axis === 'block' ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft'
  send(reorder.EVENT_NUDGE, inputOf(latest, key, { keyName: forward ? ahead : back }))
}

/**
 * Asks the page to take a move, with the events the use binds: each in
 * order, with every key in the order the move asks for. The request may be
 * refused, which stops the move, and the notification after it says the
 * move stood, which nobody refuses, as on the web. Each event's `target`
 * carries the set's value.
 */
const asking =
  (family: Family, use: MachineUse, latest: { readonly current: Latest }) =>
  (events: readonly string[], proposed: ReorderContext): boolean => {
    const before = boundTo(use, 'before', 'event')
    const after = boundTo(use, 'after', 'event')
    const { props, value } = latest.current
    const keys = [...proposed.order]
    return events.every((event) => {
      const asks = event === 'before-reorder'
      const sent = asks ? before : after
      const stands =
        sent === undefined || tell(family, props, sent, { keys }, senderOf(family, value))
      return stands || !asks
    })
  }

/**
 * Hosts reorder on a set, as the expansion binds it: the prop that lets
 * items move, and the events a move asks with. `members` are the set's
 * items, and each item's binder draws itself from what this offers it.
 * `value` is the set's choice, as its selection holds it.
 *
 * **The set holds the machine and the core host**, on a host that draws
 * glides: a dropped item glides to its place, and the others make room
 * while a pointer lifts one. Each item holds its views through the offer and
 * reads where it stands, so the set draws no item itself.
 *
 * **A set whose items may not move offers them nothing**, and answers
 * `undefined`, so each item draws as a plain view. The machine and the
 * moves run at every render all the same, as hooks do.
 *
 * **A frame of a drag costs no render.** The set draws the state and the
 * fields in `DRAWN`, and a frame of an edge scroll changes only the token
 * and the speed, so `useMachine` runs the frame's scroll and asks for the
 * next at once. The set is drawn again as the lifted item passes another,
 * and the offer changes only with what the items draw.
 *
 * **The page draws the new order when it likes.** Where it draws it while
 * the item lands, the set puts the item at rest in its new place. Where the
 * page drew it as it took the move, the glide ends there on its own.
 */
export const useReorder = (
  family: Family,
  props: Props,
  use: MachineUse,
  members: readonly Member[],
  value: string,
): ReorderOffer | undefined => {
  const enabled = given(family, props, boundTo(use, 'enabled', 'prop')) === true
  const { resolve, tokens } = useResolve(family, props)
  const duration = durationOf(tokens)
  const now: Latest = {
    enabled,
    keys: members.map(keyOf),
    members,
    props,
    transition: { duration, easing: 'standard' },
    value,
    words: wordsOf(family, props),
  }
  const latest = useRef(now)
  latest.current = now
  const sending = useRef<(event: number, input: ReorderInput) => void>(() => undefined)
  const [moves] = useState(() => movesOf(latest, sending))
  const [ask] = useState(() => asking(family, use, latest))
  const machine = useMachine(reorder, SEED, moves.host, ask, DRAWN)
  const { context, send, state } = machine
  sending.current = send
  const shown = useRef({ context, state })
  shown.current = { context, state }

  /* The order drawn, and each item with its name and whether it may move:
     the changes the effects and the offer below wait for. */
  const order = now.keys.join('\u0000')
  const shape = members
    .map((member) => `${keyOf(member)}\u0000${member.words}\u0000${member.disabled}`)
    .join('\u0001')
  const landing = useRef(state)
  // biome-ignore lint/correctness/useExhaustiveDependencies: the order drawn is the change the effect waits for, and the machine is read as this render has it.
  useLayoutEffect(() => {
    const { context: at, state: current } = shown.current
    const still = landing.current === reorder.STATE_LANDING && current === reorder.STATE_LANDING
    if (still && same(latest.current.keys, at.order)) {
      send(reorder.EVENT_LANDED, inputOf(latest.current, at.key))
      rest(moves, at.key)
    }
  }, [order])
  useLayoutEffect(() => {
    landing.current = state
  })
  // biome-ignore lint/correctness/useExhaustiveDependencies: each is a change to where the items stand or which may move, which the set hears them again for.
  useLayoutEffect(() => {
    moves.hearAll()
  }, [enabled, moves, shape])
  useLayoutEffect(() => () => moves.dispose(), [moves])

  const phase = PHASES[state] ?? 'idle'
  const moving = phase === 'lifted' || phase === 'landing'
  // biome-ignore lint/correctness/useExhaustiveDependencies: measured once a move, from where the items stand as it lifts, and again for a new order.
  const pitch = useMemo(
    () =>
      moving
        ? pitchOf(
            latest.current.keys.map((key) => spanOf(moves.views(key)?.slot())),
            context.from,
          )
        : STILL,
    [context.from, context.key, moving, order],
  )
  const preview = family.api?.collection?.reorder?.preview
  // biome-ignore lint/correctness/useExhaustiveDependencies: the look reads the theme, and resolving it at each frame of a drag would cost every render.
  const raised = useMemo(
    () => (preview === undefined ? undefined : transformed(split(resolve(preview).style)[0])),
    [preview, tokens],
  )
  const words = given(family, props, family.api?.collection?.reorder?.move)
  const move = typeof words === 'string' ? words : ''
  // biome-ignore lint/correctness/useExhaustiveDependencies: what the items draw, which `latest` holds as this render has it.
  const offer = useMemo<ReorderOffer>(() => {
    const drawn: Drawn = { context, latest: latest.current, move, phase, pitch }
    return {
      axis: AXIS,
      hold: moves.hold,
      key: (key, press) => keyed(latest.current, send, shown.current, key, press),
      moved: moves.moved,
      nudge: (key, forward) => nudged(latest.current, send, key, forward),
      raised,
      standing: (key) => standingOf(drawn, key),
      transition: { duration, easing: 'standard' },
    }
  }, [
    context.from,
    context.key,
    context.order,
    context.to,
    duration,
    enabled,
    move,
    moves,
    phase,
    pitch,
    raised,
    send,
    shape,
  ])
  return enabled ? offer : undefined
}
