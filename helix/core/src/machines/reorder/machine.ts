import { edgeSpeed, placeKey } from '../../utils/reorder/reorder.js'
import type { Answer, Statechart } from '../statechart.js'
import {
  aimOf,
  keyed,
  nudgeOf,
  placeOf,
  type ReorderContext,
  type ReorderEffect,
  type ReorderEvent,
  type ReorderInput,
  type ReorderState,
  SLOP,
} from './context.js'

export type { ReorderContext, ReorderInput, ReorderSpan } from './context.js'

/*
 * Reorder: one item of a set moves to a new place. A key or a click on its
 * grip holds it for the arrows, a pointer drags it by its grip, and Alt with
 * an arrow moves it at once. A move is a request: the host sends
 * `helix-before-reorder` and then `helix-reorder` with the new order, and
 * stops at the first a listener refuses. A refused move goes back. The words
 * a screen reader hears ride the moves as effects: `picked-up`, `moved`,
 * `dropped`, and `canceled`, which a native host also gives as a tap.
 *
 * The web runs `reorderStep` and `ReorderController`, written by hand, and the
 * native pilot ran its drag on flags. Here each mode of a move is a state. A
 * frame of edge scroll and a glide each end in an event carrying the token
 * their effect was given, which `fresh` holds to the latest. A pointer's drop
 * on a host that draws glides lands once the page draws the new order, and
 * goes back where the page has not drawn it a second after the drop.
 *
 * **The family hears a pointer on every item for as long as items may
 * move**, through the host's `hear`, since a drag hears only a pointer it
 * heard go down. No state starts that hearing, so no effect names it, and
 * `PRESS` is the first the machine hears of a press. The host numbers each
 * press from 1, and every event about it carries the number as `pointer`. The
 * keys and a click send 0. The context keeps the number of the press that
 * holds the item, and 0 where the keys hold it, so `same` tells the events of
 * the move from those of another press or another item, and no host filters
 * them.
 *
 * **Escape ends a pointer's drag wherever focus is.** While the item is
 * lifted, `listen` asks the host to hear the keys anywhere in the window, and
 * the host sends Escape on as `CANCEL` for the press. `unlisten` stops it.
 *
 * No property of a host says where a move stands, so the host keeps the state
 * between events, as the controller keeps its own.
 */

type C = ReorderContext

type I = ReorderInput

/** Whether items may move now, and the item is one of them. */
export const movable = (_context: C, input: I): boolean =>
  input.enabled && input.keys.includes(input.key)

/**
 * Whether an event is about the move: its item, and the press that holds it,
 * or no press where the keys hold it.
 */
export const same = (context: C, input: I): boolean =>
  input.key === context.key && input.pointer === context.pointer

/** Whether the press that went down has traveled far enough to lift the item. */
export const lifts = (context: C, input: I): boolean =>
  same(context, input) && Math.hypot(input.x - context.x, input.y - context.y) >= SLOP

/** Whether the press that drags the item has brought it over another place. */
export const passes = (context: C, input: I): boolean =>
  same(context, input) && placeOf(input) !== context.to

/** Whether the key pressed moves the held item to another place. */
export const steps = (context: C, input: I): boolean => {
  const to = keyed(input, context.to)
  return same(context, input) && to !== null && to !== context.to
}

/** Whether the key pressed is one that moves the held item, at an end or away from one. */
export const stepping = (context: C, input: I): boolean =>
  same(context, input) && keyed(input, context.to) !== null

/** Whether a nudge moves its item to another place. */
export const nudges = (_context: C, input: I): boolean => {
  const to = nudgeOf(input)
  return to !== null && to !== input.keys.indexOf(input.key)
}

/** Whether the key pressed is one that nudges an item, at an end or away from one. */
export const nudging = (_context: C, input: I): boolean => nudgeOf(input) !== null

/** Whether the held item is where it started. */
export const still = (context: C): boolean => context.to === context.from

/** Whether an event is about the move, and the item is where it started. */
export const sameStill = (context: C, input: I): boolean => same(context, input) && still(context)

/** Whether an event is about the move, on a host that draws glides. */
export const sameGlides = (context: C, input: I): boolean => same(context, input) && context.glides

/** Whether an event is about the move, the item is where it started, and the host draws glides. */
export const sameStillGlides = (context: C, input: I): boolean =>
  sameStill(context, input) && context.glides

/** Whether a pick is on the held item's own grip, while items may move. */
export const own = (context: C, input: I): boolean => input.enabled && input.key === context.key

/** Whether a pick is on the held item's own grip, and the item is where it started. */
export const ownStill = (context: C, input: I): boolean => own(context, input) && still(context)

/** Whether a click is on another item the held one moves among, while items may move. */
export const elsewhere = (context: C, input: I): boolean =>
  input.enabled && input.key !== context.key && input.keys.includes(input.key)

/** Whether a click on another item drops the held one where it started. */
export const elsewhereStill = (context: C, input: I): boolean =>
  elsewhere(context, input) && aimOf(input) === context.from

/** Whether a frame or a glide that ended carries the token of the latest. */
export const fresh = (context: C, input: I): boolean => input.token === context.token

/** Whether the page draws the order the drop asked for. */
export const drawn = (context: C, input: I): boolean =>
  input.all.length === context.order.length &&
  input.all.every((key, at) => key === context.order[at])

/** Takes hold of the item where it stands, with no press. */
export const take = (context: C, input: I): C => {
  const from = input.keys.indexOf(input.key)
  return { ...context, from, key: input.key, pointer: 0, to: from }
}

/** Takes hold of the item a pointer pressed, and notes the press and where it went down. */
export const grab = (context: C, input: I): C => {
  const { pointer, x, y } = input
  return { ...take(context, input), pointer, x, y }
}

/** Lifts the item to the place under the pointer, and gives its frames a new token. */
export const lift = (context: C, input: I): C => ({
  ...context,
  to: placeOf(input),
  token: context.token + 1,
})

/** Moves the dragged item to the place under the pointer. */
export const follow = (context: C, input: I): C => ({ ...context, to: placeOf(input) })

/** Reads how far the frame scrolls the page, and gives the next frame a new token. */
export const tick = (context: C, input: I): C => ({
  ...context,
  speed: edgeSpeed(input.at, input.start, input.end),
  token: context.token + 1,
})

/** Moves the held item where the key pressed takes it. */
export const advance = (context: C, input: I): C => ({
  ...context,
  to: keyed(input, context.to) ?? context.to,
})

/** Moves the held item to where a click on another item lands. */
export const aim = (context: C, input: I): C => ({ ...context, to: aimOf(input) })

/** Writes the order the drop asks for: every key, with the held one at its new place. */
export const propose = (context: C, input: I): C => ({
  ...context,
  order: placeKey(input.all, input.keys, context.key, context.to),
})

/** Moves the held item to where a click lands, and writes the order the drop asks for. */
export const proposeAt = (context: C, input: I): C => propose(aim(context, input), input)

/** Writes the order the drop asks for, and gives the glide to the new place a new token. */
export const land = (context: C, input: I): C => ({
  ...propose(context, input),
  token: context.token + 1,
})

/** Gives the glide back a new token. */
export const renew = (context: C): C => ({ ...context, token: context.token + 1 })

/**
 * Takes the item a nudge moves, where it goes, and the order it asks for. A
 * refused nudge takes them too, so its words name the item it was for.
 */
export const nudge = (context: C, input: I): C => {
  const taken = take(context, input)
  return propose({ ...taken, to: nudgeOf(input) ?? taken.from }, input)
}

type One = Answer<ReorderState, C, I, ReorderEffect>

type Answers = { [K in ReorderEvent]?: One }

/** The answers of a state that moves nothing, which another state's answers start from. */
const quiet = {
  CANCEL: 'ignore',
  DRAG: 'ignore',
  DROP: 'ignore',
  GLIDED: 'ignore',
  LANDED: 'ignore',
  NUDGE: 'ignore',
  PICK: 'ignore',
  PRESS: 'ignore',
  RELEASE: 'ignore',
  STEP: 'ignore',
  TARGET: 'ignore',
  TICK: 'ignore',
} as const

/** The events a move asks with, in order. */
const asking = ['before-reorder', 'reorder'] as const

/** A drop that ends at rest, its words said. */
const dropped = { effects: ['dropped'], target: 'idle' } as const

/** A move that ends at rest with the item back where it started. */
const canceled = { effects: ['canceled'], target: 'idle' } as const

/** A drop from the keys that the page took: focus goes back to the item. */
const placed = { effects: ['dropped', 'refocus'], target: 'idle' } as const

/**
 * The answers of an item the keys hold. A step, a drop, or a cancel moves it
 * only where it is about the item and comes from no press, so a press the
 * machine did not take, which the system then takes, leaves it held.
 */
const holding: Answers = {
  ...quiet,
  CANCEL: [{ ...canceled, guard: same }, 'ignore'],
  DROP: [
    { ...dropped, guard: sameStill },
    { accept: { ...placed, update: propose }, ask: asking, guard: same, refuse: canceled },
    'ignore',
  ],
  PICK: [
    { ...dropped, guard: ownStill },
    { accept: { ...placed, update: propose }, ask: asking, guard: own, refuse: canceled },
    'ignore',
  ],
  STEP: [{ effects: ['moved'], guard: steps, update: advance }, { guard: stepping }, 'ignore'],
  TARGET: [
    { ...dropped, guard: elsewhereStill, update: aim },
    { accept: { ...placed, update: proposeAt }, ask: asking, guard: elsewhere, refuse: canceled },
    'ignore',
  ],
}

/**
 * Lets a dragged item go, as the press that drags it lets go. Where it
 * started, it stays, gliding back on a host that draws glides. Elsewhere it
 * asks, and lands at its new place, or goes back where the page refuses.
 */
const letGo: One = [
  { effects: ['dropped'], guard: sameStillGlides, target: 'returning', update: renew },
  { ...dropped, guard: sameStill },
  {
    accept: { effects: ['dropped'], target: 'landing', update: land },
    ask: asking,
    guard: sameGlides,
    refuse: { effects: ['canceled'], target: 'returning', update: renew },
  },
  { accept: { ...dropped, update: propose }, ask: asking, guard: same, refuse: canceled },
  'ignore',
]

/**
 * The answers of an item a pointer drags. Each moment moves it only where it
 * is about the item and the press that drags it. A drop is the keys', and the
 * keys end a pointer's drag only with Escape, which the host sends as
 * `CANCEL` for the press.
 */
const dragging: Answers = {
  CANCEL: [
    { effects: ['canceled'], guard: sameGlides, target: 'returning', update: renew },
    { ...canceled, guard: same },
    'ignore',
  ],
  DRAG: [{ effects: ['pass'], guard: passes, update: follow }, 'ignore'],
  RELEASE: letGo,
  TICK: [{ effects: ['scroll', 'frame'], guard: fresh, update: tick }, 'ignore'],
}

/** The machine, written once. `reorder.generated.ts` is what runs. */
export const reorder: Statechart<
  ReorderState,
  ReorderEvent,
  ReorderContext,
  ReorderInput,
  ReorderEffect
> = {
  /* Unmounting stops hearing the keys, lets go of the press, and leaves the
     move, with no words. */
  cancel: { target: 'idle' },
  effects: [
    'lift',
    'frame',
    'pass',
    'scroll',
    'listen',
    'unlisten',
    'untrack',
    'picked-up',
    'moved',
    'dropped',
    'canceled',
    'refocus',
    'land',
    'back',
  ],
  events: [
    'PICK',
    'STEP',
    'TARGET',
    'DROP',
    'CANCEL',
    'NUDGE',
    'PRESS',
    'DRAG',
    'RELEASE',
    'TICK',
    'LANDED',
    'GLIDED',
  ],
  initial: [{ target: 'idle' }],
  states: {
    held: { on: holding },
    idle: {
      on: {
        ...quiet,
        NUDGE: [
          {
            accept: { effects: ['moved', 'refocus'], update: nudge },
            ask: asking,
            guard: nudges,
            refuse: { effects: ['canceled'], update: nudge },
          },
          { guard: nudging },
          'ignore',
        ],
        PICK: [{ effects: ['picked-up'], guard: movable, target: 'held', update: take }, 'ignore'],
        PRESS: [{ guard: movable, target: 'pointing', update: grab }, 'ignore'],
      },
    },
    /* A pointer's drop the page took, on a host that draws glides: the item
       glides to its new place until the page draws the new order. A page
       that has not drawn it a second after the drop sends the item back. */
    landing: {
      after: { ms: 1000, target: 'returning', update: renew },
      entry: ['land'],
      on: { ...quiet, LANDED: [{ guard: drawn, target: 'idle' }, 'ignore'] },
    },
    /* A press on a grip holds the item, from the `PRESS` the host sent as it
       heard the pointer go down. The host forwards that press's moments until
       `untrack` lets go of it, as the move ends. */
    pointing: {
      exit: ['untrack'],
      initial: 'pressed',
      on: quiet,
      states: {
        /* The press traveled far enough: the item lifts, and frames begin. A
           frame scrolls the page by `speed`, which is 0 away from the edges,
           and asks for the next. The keys are heard anywhere until the item
           is let go. */
        dragging: { entry: ['lift', 'frame', 'listen'], exit: ['unlisten'], on: dragging },
        pressed: {
          on: {
            CANCEL: [{ guard: same, target: 'idle' }, 'ignore'],
            DRAG: [{ guard: lifts, target: 'dragging', update: lift }, 'ignore'],
            RELEASE: [{ guard: same, target: 'idle' }, 'ignore'],
          },
        },
      },
    },
    /* The item glides back to its place, and nothing else moves until it is
       there. */
    returning: {
      entry: ['back'],
      on: { ...quiet, GLIDED: [{ guard: fresh, target: 'idle' }, 'ignore'] },
    },
  },
}
