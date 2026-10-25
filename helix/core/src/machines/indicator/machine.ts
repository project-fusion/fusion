import type { Answer, Outcome, Statechart } from '../statechart.js'

/*
 * Indicator: the mark that shows which item of a set is chosen, such as the
 * line or the pill under the selected tab. It is hidden until its first
 * placement, which puts it against the chosen item with no travel. After
 * that, a measurement that finds the chosen item somewhere else moves the
 * mark there, and the move travels where reduced motion is off.
 *
 * Measuring is an effect. The host measures the chosen item and the surface
 * the mark is placed against, and sends what it read as `MEASURED`, with the
 * token the measurement was given. The host sends `CHANGE` for anything that
 * may have moved the chosen item: a new choice, an update of the set, a
 * change of size in the set or in an item, an item added or removed. A
 * travel ends with `LANDED`, with the token the move was given, and a guard
 * ignores a token that is no longer current. A deadline a second long ends a
 * travel whose end never arrives.
 *
 * The states are the three modes the web has: never placed, placed, and on
 * the way somewhere. Whether the mark is shown and whether a measurement is
 * asked for are held in the context. On the web a move and its fallback go
 * on while the mark is hidden and while it is measured again. A deadline
 * lasts as long as its state, so `moving` holds a hidden mark and a
 * measurement asked for. The deadline ends in one state, so `placed` holds
 * both too.
 *
 * The host holds the context. Every move enters the state the context reads
 * back as, so a host may keep the state a move returns or read it again.
 *
 * The web runs `IndicatorController` in core, written by hand, for
 * `Navigation`, `Tabs`, `Toggle.Group`, and `Outline`.
 */

/** A box as the host measures it. The item and the surface share one origin. */
export interface Rect {
  height: number
  left: number
  top: number
  width: number
}

/** The box the mark is placed against, its containing block, as a border box. */
export interface Surface extends Rect {
  /** The width of its left border: `clientLeft` on the web. */
  borderLeft: number

  /** The width of its top border: `clientTop` on the web. */
  borderTop: number

  /** The direction its text runs. */
  direction: 'ltr' | 'rtl'
}

/** Where the mark goes, in pixels: the four custom properties the web writes. */
export interface Placement {
  /** `--indicator-block-size`: the height of the chosen item. */
  block: number

  /** `--indicator-inline-size`: the width of the chosen item. */
  inline: number

  /** `--indicator-x`: the distance from the inline start, negative right to left. */
  x: number

  /** `--indicator-y`: the distance from the top. */
  y: number
}

/** What a measurement reads. */
export interface Measurement {
  /** The chosen item's box, or `null` where nothing is chosen. */
  item: Rect | null

  /** The surface, or `null` where there is no surface or no mark to draw. */
  surface: Surface | null
}

/** What the machine holds between events. */
export interface IndicatorContext {
  /** The token of the measurement asked for and still unanswered, or 0 where none is. */
  asked: number

  /** Where the mark was last put, or `null` before its first placement. */
  at: Placement | null

  /** Whether reduced motion is on, which puts a moved mark in its new place with no travel. */
  reduced: boolean

  /** Whether the mark is shown, which `data-placed` says on the web. */
  shown: boolean

  /** The last token handed out, to a measurement or to a move. */
  token: number

  /** The token of the move under way, which `data-moving` says on the web, or 0. */
  travel: number
}

/** What an event carries. */
export interface IndicatorInput {
  /** What the measurement read, for `MEASURED`. */
  measurement?: Measurement

  /** The token of the measurement or the travel the event reports on. */
  token?: number
}

/**
 * Where the mark goes for a chosen item: its place inside the surface's
 * padding box, which is the containing block the mark is placed against.
 *
 * The measured boxes are border boxes, so the surface's own border comes off
 * both axes. Right to left, the mark travels from the right edge, so the
 * distance is measured from that edge and applied as a negative translation.
 * The web takes `clientLeft` off that distance too, and so does `placement`.
 *
 * Orientation does not enter: the web measures both axes for every
 * orientation, and the stylesheet draws a bar under the item or beside it.
 */
export const placement = (item: Rect, surface: Surface): Placement => {
  const rtl = surface.direction === 'rtl'
  const inline = rtl
    ? surface.left + surface.width - (item.left + item.width) - surface.borderLeft
    : item.left - surface.left - surface.borderLeft
  return {
    block: item.height,
    inline: item.width,
    x: rtl ? -inline : inline,
    y: item.top - surface.top - surface.borderTop,
  }
}

/**
 * Where a measurement puts the mark, or `undefined` where it read nothing to
 * place: no surface, nothing chosen, or a chosen item with no box yet. A box
 * of zero by zero is an item that has not upgraded or been laid out, and
 * placing the mark there would park it at the origin.
 */
const placementOf = (input: IndicatorInput): Placement | undefined => {
  const item = input.measurement?.item
  const surface = input.measurement?.surface
  if (!item || !surface || (item.width === 0 && item.height === 0)) {
    return undefined
  }
  return placement(item, surface)
}

/** Whether the mark has never been placed. */
export const neverPlaced = (context: IndicatorContext): boolean => context.at === null

/** Whether a move is under way. */
export const traveling = (context: IndicatorContext): boolean => context.travel !== 0

/** Whether the measurement answered is the one asked for. */
export const fresh = (context: IndicatorContext, input: IndicatorInput): boolean =>
  context.asked !== 0 && input.token === context.asked

/**
 * Whether the measurement asked for read nothing to draw against, or a
 * chosen item with no box yet. Nothing is written for either.
 */
export const blank = (context: IndicatorContext, input: IndicatorInput): boolean => {
  const read = input.measurement
  return (
    fresh(context, input) &&
    (read === undefined ||
      read.surface === null ||
      (read.item !== null && placementOf(input) === undefined))
  )
}

/** Whether the measurement asked for found nothing chosen. */
export const gone = (context: IndicatorContext, input: IndicatorInput): boolean =>
  fresh(context, input) && input.measurement?.item === null

/**
 * Whether the measurement asked for finds the chosen item away from where the
 * mark was last put, with reduced motion off. A change of size alone is no
 * move. A mark hidden while nothing was chosen moves too, because the web
 * keeps where it was last put.
 */
export const moves = (context: IndicatorContext, input: IndicatorInput): boolean => {
  const next = placementOf(input)
  const last = context.at
  return (
    fresh(context, input) &&
    !context.reduced &&
    last !== null &&
    next !== undefined &&
    (next.x !== last.x || next.y !== last.y)
  )
}

/** Whether the travel that ended is the one under way. */
export const arrived = (context: IndicatorContext, input: IndicatorInput): boolean =>
  context.travel !== 0 && input.token === context.travel

/** Hands a new token to a measurement. */
export const ask = (context: IndicatorContext): IndicatorContext => ({
  ...context,
  asked: context.token + 1,
  token: context.token + 1,
})

/** Takes the answer, and writes nothing. */
export const skip = (context: IndicatorContext): IndicatorContext => ({ ...context, asked: 0 })

/** Takes the answer, and hides the mark. Where it was last put is kept, and a move under way goes on. */
export const withdraw = (context: IndicatorContext): IndicatorContext => ({
  ...context,
  asked: 0,
  shown: false,
})

/** Takes the answer, and shows the mark where it read. A move under way goes on. */
export const take = (context: IndicatorContext, input: IndicatorInput): IndicatorContext => ({
  ...context,
  asked: 0,
  at: placementOf(input) ?? context.at,
  shown: true,
})

/** Takes the answer, shows the mark where it read, and hands the move a new token. */
export const depart = (context: IndicatorContext, input: IndicatorInput): IndicatorContext => ({
  ...context,
  asked: 0,
  at: placementOf(input) ?? context.at,
  shown: true,
  token: context.token + 1,
  travel: context.token + 1,
})

/** Ends the move under way. */
export const arrive = (context: IndicatorContext): IndicatorContext => ({ ...context, travel: 0 })

type State = 'moving' | 'placed' | 'unplaced'

type Event = 'CHANGE' | 'LANDED' | 'MEASURED'

/*
 * What the host does for each effect, reading the context after the move:
 *
 * - `measure`: measures the chosen item and the surface, and sends `MEASURED`
 *   with `asked` as its token.
 * - `put`: writes `at` and shows the mark, which `data-placed` says on the
 *   web. The mark goes there with no travel.
 * - `glide`: writes `at`, shows the mark, and says it is on its way, which
 *   `data-moving` says on the web. The mark travels there, and the host sends
 *   `LANDED` with `travel` as its token when the travel along `translate`
 *   ends. The host listens for the end of one travel at a time.
 * - `land`: takes `data-moving` off, and stops listening for the end of the
 *   travel.
 * - `hide`: takes `data-placed` off.
 *
 * The compiler adds `deadline` as `moving` is entered and `deadline-end` as
 * it is left. The host's timers start and stop the fallback a second long
 * with them, where the web calls `setTimeout` and `clearTimeout`.
 */
type Effect = 'glide' | 'hide' | 'land' | 'measure' | 'put'

/*
 * Shared answers are named and never read through a property: a bundler
 * keeps a property read, which might run a getter, and the data would then
 * reach every bundle that imports a function from this module.
 */

/** Asks for a measurement. The mark stays as it is meanwhile, and a move under way goes on. */
const asking: Answer<State, IndicatorContext, IndicatorInput, Effect> = {
  effects: ['measure'],
  update: ask,
}

/** The end of the move under way, by the end of its travel or by its deadline. */
const landing: Outcome<State, IndicatorContext, IndicatorInput, Effect> = {
  effects: ['land'],
  target: 'placed',
  update: arrive,
}

/**
 * What a measurement of a mark placed before does, in the order the web
 * checks. A move under way goes on where the mark is hidden or written where
 * it is going, and a placement that moves the mark again starts the move over.
 */
const reading: Answer<State, IndicatorContext, IndicatorInput, Effect> = [
  { guard: blank, update: skip },
  { effects: ['hide'], guard: gone, update: withdraw },
  { effects: ['glide'], guard: moves, target: 'moving', update: depart },
  { effects: ['put'], guard: fresh, update: take },
  'ignore',
]

/** The machine, written once. `indicator.generated.ts` is what runs. */
export const indicator: Statechart<State, Event, IndicatorContext, IndicatorInput, Effect> = {
  effects: ['measure', 'put', 'glide', 'land', 'hide'],
  events: ['CHANGE', 'MEASURED', 'LANDED'],
  initial: [
    { guard: neverPlaced, target: 'unplaced' },
    { guard: traveling, target: 'moving' },
    { target: 'placed' },
  ],
  states: {
    /* On its way to where it was last put, from the placement that moved it
       until its travel ends or its deadline does. The mark may be hidden
       since, and a measurement may be asked for. */
    moving: {
      after: { ...landing, ms: 1000 },
      on: {
        CHANGE: asking,
        LANDED: [{ ...landing, guard: arrived }, 'ignore'],
        MEASURED: reading,
      },
    },
    /* Placed before, with no move under way: shown where it was last put, or
       hidden while nothing is chosen. A measurement may be asked for. */
    placed: { on: { CHANGE: asking, LANDED: 'ignore', MEASURED: reading } },
    /* Never placed: before the first measurement that finds a chosen item
       with a box, and always on a server. Nothing chosen, or a chosen item
       with no box yet, leaves the mark unplaced, and the first placement
       never travels. */
    unplaced: {
      on: {
        CHANGE: asking,
        LANDED: 'ignore',
        MEASURED: [
          { guard: blank, update: skip },
          { guard: gone, update: skip },
          { effects: ['put'], guard: fresh, target: 'placed', update: take },
          'ignore',
        ],
      },
    },
  },
}
