import { rangeExtend } from '../../utils/range-extend/range-extend.js'
import {
  commaList,
  inRowOrder,
  pressedValue,
  type SelectionMode,
} from '../../utils/written-list/written-list.js'
import type { Request, Statechart, Way } from '../statechart.js'

/*
 * Multiple selection: a reader chooses as many items of a set as its
 * `selection-mode` allows. `single` chooses one item at a time and `multiple`
 * any number. `none` chooses nothing, so a press acts on the item. A change is
 * a request: `helix-before-change` asks first with the value it would leave,
 * and where no listener refuses it the value moves and `change` says so.
 *
 * The value names the chosen items by their values, separated by commas with
 * no spaces, in the order the items stand: `a,c`. It is read by splitting it
 * at its commas and trimming each part. A value a script wrote that names no
 * item keeps its place after the items.
 *
 * The host holds the context in its properties, so the machine is read from
 * the host before each event and writes its context back after it. Each event
 * is something a reader does to one item:
 *
 * - `PRESS` is a press on the item, outside the controls in it.
 * - `SPACE` is Space on the item.
 * - `ARRIVE` is a key moving focus onto the item: Up, Down, Home, End, Page
 *   Up, or Page Down.
 * - `ALL` is Control or Command with A, `CLEAR` is Escape, and `ENTER` is
 *   Enter, each on the item.
 *
 * With Alt held, Space, Enter, Escape, A, Page Up, and Page Down send nothing.
 * A set with no `selection-mode` is one a reader only reads, and sends nothing.
 *
 * The web list moves where a Shift range runs from, and where it reached,
 * before it asks for the change, so a press, Space, or an arrival moves them
 * whichever way the request ends, and where it changes nothing.
 *
 * **A Shift range takes the place of the last one**, as React Aria's
 * `extendSelection` does: the items from the anchor to where the last range
 * reached are let go, and those from the anchor to the item are taken in, so
 * moving back toward the anchor lets go of what the range passed, and what was
 * selected outside it stays. `rangeExtend` in core is the arithmetic.
 */

/** What a press does to the items already chosen: adds or takes out the item, or chooses it alone. */
export type ChoiceBehavior = 'replace' | 'toggle'

/** An item of the set, as the machine reads it. */
export interface ChoiceItem {
  /** Whether the item is disabled. A disabled item is never chosen. */
  disabled: boolean

  /** What names the item in the value. */
  value: string
}

/** What the machine holds between events. */
export interface ChoiceContext {
  /** The value of the item a Shift range runs from, where one was set. */
  anchor: string | undefined

  /**
   * The value of the item the last Shift range reached, which the next one
   * lets go of the items up to. The anchor where it was set since.
   */
  reached: string | undefined

  /** `selection-behavior`: `toggle` adds or takes out a pressed item, and `replace` chooses it alone. */
  behavior: ChoiceBehavior

  /**
   * `disabled-behavior`: under `all`, the default, a disabled item is out of
   * reach of the keys and of actions. Under `selection`, it is reached and
   * acted on as any item is.
   */
  disabledBehavior: 'all' | 'selection'

  /** `selection-mode`: how many items a reader can choose. */
  mode: SelectionMode

  /** The chosen items' values, separated by commas. */
  value: string
}

/** What an event carries. */
export interface ChoiceInput {
  /** Whether Shift was held, which takes in the items from the anchor. */
  extend: boolean

  /** The value of the item focus left, for `ARRIVE`, where focus was on one. */
  from: string | undefined

  /** The item pressed, arrived on, or keyed on. */
  item: ChoiceItem

  /** Every item of the set, in order. */
  items: readonly ChoiceItem[]

  /** Whether Control or Command was held. */
  toggle: boolean
}

/** Whether the item is out of reach of the keys and of actions. */
const blocked = (context: ChoiceContext, input: ChoiceInput): boolean =>
  input.item.disabled && context.disabledBehavior !== 'selection'

/** The values of the items a reader can choose, in order: every item that is not disabled. */
const choosable = (input: ChoiceInput): string[] =>
  input.items.filter((item) => !item.disabled).map((item) => item.value)

/**
 * The value a Shift range leaves, or `null` where it chooses the same items:
 * the items from the anchor to where the last range reached let go, and every
 * item a reader can choose from the anchor to this one taken in. With no
 * anchor among the items, the range is the item alone.
 */
const rangeOf = (context: ChoiceContext, input: ChoiceInput): string | null => {
  const range = rangeExtend(commaList(context.value), {
    anchor: context.anchor,
    choosable: choosable(input),
    items: input.items.map((item) => item.value),
    reached: context.reached,
    to: input.item.value,
  })
  return range ? range.join(',') : null
}

/** Whether Shift takes in a range: in a set that chooses many, on an item a reader can choose. */
export const extending = (context: ChoiceContext, input: ChoiceInput): boolean =>
  input.extend && context.mode === 'multiple' && !input.item.disabled

/**
 * The value a press leaves, or an arrival where `arrived`, or `null` where it
 * changes nothing. The web list's `choiceValue`, rule for rule:
 *
 * - A set that chooses nothing, and a disabled item, change nothing.
 * - With Shift, in a set that chooses many, the range from the anchor, in
 *   place of the last one.
 * - Under `replace`, the item alone, by a press or an arrival. With Control
 *   or Command, a press adds or takes out the item and an arrival only moves.
 * - Under `toggle`, a press adds or takes out the item, and an arrival only
 *   moves. A set that chooses one chooses the item, or none where it was
 *   chosen.
 */
const choiceOf = (context: ChoiceContext, input: ChoiceInput, arrived: boolean): string | null => {
  const { behavior, mode, value } = context
  const pressed = input.item.value
  if (mode === 'none' || input.item.disabled) {
    return null
  }
  if (input.extend && mode === 'multiple') {
    return rangeOf(context, input)
  }
  const now = commaList(value)
  if (behavior === 'replace' && !input.toggle) {
    return now.length === 1 && now[0] === pressed ? null : pressed
  }
  if (arrived) {
    return null
  }
  const next = commaList(pressedValue(mode, value, pressed)).join(',')
  return next === now.join(',') ? null : next
}

/** The value Control or Command with A asks for: every item a reader can choose. */
const everyOf = (input: ChoiceInput): string => choosable(input).join(',')

/**
 * The context with `next` as its value, written in the order of the items, or
 * the context as it was where `next` is `null`.
 */
const withValue = (
  context: ChoiceContext,
  input: ChoiceInput,
  next: string | null,
): ChoiceContext =>
  next === null
    ? context
    : {
        ...context,
        value: inRowOrder(
          commaList(next),
          input.items.map((item) => item.value),
        ).join(','),
      }

/** Whether the set chooses nothing, so a press acts on the item. */
export const choosesNothing = (context: ChoiceContext): boolean => context.mode === 'none'

/** Whether a press acts on the item: in a set that chooses nothing, or on a disabled item a reader can reach. */
export const acts = (context: ChoiceContext, input: ChoiceInput): boolean =>
  (context.mode === 'none' || input.item.disabled) && !blocked(context, input)

/** Whether Enter acts on the item: one a reader can reach, with neither Control nor Command held. */
export const enterActs = (context: ChoiceContext, input: ChoiceInput): boolean =>
  !blocked(context, input) && !input.toggle

/** Whether a press or Space changes the value. */
export const pressChanges = (context: ChoiceContext, input: ChoiceInput): boolean =>
  choiceOf(context, input, false) !== null

/**
 * Whether a press or Space moves where the next range runs from or reaches,
 * on an item a reader can choose: without Shift, or with Shift in a set that
 * chooses many.
 */
export const movesAnchor = (context: ChoiceContext, input: ChoiceInput): boolean =>
  (!input.extend || context.mode === 'multiple') && context.mode !== 'none' && !input.item.disabled

/**
 * Whether an arrival with Shift starts its range from the item focus left,
 * where nothing set an anchor yet.
 */
export const startsRange = (context: ChoiceContext, input: ChoiceInput): boolean =>
  input.extend &&
  context.anchor === undefined &&
  input.from !== undefined &&
  context.mode !== 'none' &&
  !input.item.disabled

/** Runs the next range from the item focus left. */
export const anchorFrom = (context: ChoiceContext, input: ChoiceInput): ChoiceContext => ({
  ...context,
  anchor: input.from,
})

/**
 * Where the next range runs from and reaches. Without Shift, from the item and
 * to it. With Shift, in a set that chooses many, the range reaches the item,
 * and runs from the item where no item has the anchor, as React Aria's
 * `extendSelection` keeps its anchor and moves its current key.
 */
export const anchorOn = (context: ChoiceContext, input: ChoiceInput): ChoiceContext => {
  const pressed = input.item.value
  if (!input.extend) {
    return { ...context, anchor: pressed, reached: pressed }
  }
  if (!extending(context, input)) {
    return context
  }
  const known =
    context.anchor !== undefined && input.items.some((item) => item.value === context.anchor)
  return { ...context, anchor: known ? context.anchor : pressed, reached: pressed }
}

/**
 * The context an arrival reads its range from: with Shift, where nothing set
 * an anchor yet, the range runs from the item focus left.
 */
const rangeStart = (context: ChoiceContext, input: ChoiceInput): ChoiceContext =>
  startsRange(context, input) ? anchorFrom(context, input) : context

/** Whether a key arriving on the item changes the value. */
export const arrivalChanges = (context: ChoiceContext, input: ChoiceInput): boolean =>
  choiceOf(rangeStart(context, input), input, true) !== null

/**
 * Runs the next range from where an arrival leaves it: the item, or with
 * Shift, the item focus left where nothing set an anchor yet, the range
 * reaching the item in a set that chooses many.
 */
export const anchorArrival = (context: ChoiceContext, input: ChoiceInput): ChoiceContext =>
  anchorOn(input.extend ? rangeStart(context, input) : context, input)

/**
 * Whether Control or Command with A changes the value: in a set that chooses
 * many, from an item a reader can reach, where the value is not already every
 * item a reader can choose, written as the set writes it.
 */
export const everyChanges = (context: ChoiceContext, input: ChoiceInput): boolean =>
  context.mode === 'multiple' && !blocked(context, input) && everyOf(input) !== context.value

/** Whether Escape has a value to let go of, in a set that chooses, from an item a reader can reach. */
export const clearable = (context: ChoiceContext, input: ChoiceInput): boolean =>
  context.mode !== 'none' && context.value !== '' && !blocked(context, input)

/** Writes the value a press or Space leaves, and runs the next range from the item. */
export const takePress = (context: ChoiceContext, input: ChoiceInput): ChoiceContext =>
  anchorOn(withValue(context, input, choiceOf(context, input, false)), input)

/** Writes the value an arrival leaves, and where the next range runs from. */
export const takeArrival = (context: ChoiceContext, input: ChoiceInput): ChoiceContext =>
  withValue(anchorArrival(context, input), input, choiceOf(rangeStart(context, input), input, true))

/** Writes every item a reader can choose as the value. */
export const takeEvery = (context: ChoiceContext, input: ChoiceInput): ChoiceContext =>
  withValue(context, input, everyOf(input))

/** Lets go of every chosen item. */
export const letGo = (context: ChoiceContext): ChoiceContext => ({ ...context, value: '' })

type State = 'choosing' | 'none'

type Event = 'ALL' | 'ARRIVE' | 'CLEAR' | 'ENTER' | 'PRESS' | 'SPACE'

/*
 * `act` follows the item's link where it has one, and otherwise sends
 * `helix-action` from the item. `announce` sends `change` once a change no
 * listener refused has moved the value.
 */
type Effect = 'act' | 'announce'

/** A press that acts on the item. */
const pressAct: Way<State, ChoiceContext, ChoiceInput, Effect> = { effects: ['act'], guard: acts }

/** Enter on an item a reader can reach acts on it. */
const enterAct: Way<State, ChoiceContext, ChoiceInput, Effect> = {
  effects: ['act'],
  guard: enterActs,
}

/**
 * A press or Space that changes the value asks first. Without Shift, the item
 * is where the next range runs from whichever way the request ends.
 */
const pressing: Request<State, ChoiceContext, ChoiceInput, Effect> = {
  accept: { effects: ['announce'], update: takePress },
  ask: 'change',
  guard: pressChanges,
  refuse: { update: anchorOn },
}

/** A press or Space that changes nothing still makes the item where the next range runs from. */
const anchoring: Way<State, ChoiceContext, ChoiceInput, Effect> = {
  guard: movesAnchor,
  update: anchorOn,
}

/** The machine, written once. `multiple-selection.generated.ts` is what runs. */
export const multipleSelection: Statechart<State, Event, ChoiceContext, ChoiceInput, Effect> = {
  effects: ['act', 'announce'],
  events: ['PRESS', 'SPACE', 'ARRIVE', 'ALL', 'CLEAR', 'ENTER'],
  initial: [{ guard: choosesNothing, target: 'none' }, { target: 'choosing' }],
  states: {
    /* A set whose `selection-mode` is `single` or `multiple`. The rules are
       arithmetic over the context and the input, and read the mode for
       themselves. */
    choosing: {
      on: {
        ALL: [
          {
            accept: { effects: ['announce'], update: takeEvery },
            ask: 'change',
            guard: everyChanges,
            refuse: {},
          },
          'ignore',
        ],
        ARRIVE: [
          {
            accept: { effects: ['announce'], update: takeArrival },
            ask: 'change',
            guard: arrivalChanges,
            refuse: { update: anchorArrival },
          },
          { guard: extending, update: anchorArrival },
          { guard: startsRange, update: anchorFrom },
          'ignore',
        ],
        CLEAR: [
          {
            accept: { effects: ['announce'], update: letGo },
            ask: 'change',
            guard: clearable,
            refuse: {},
          },
          'ignore',
        ],
        ENTER: [enterAct, 'ignore'],
        PRESS: [pressAct, pressing, anchoring, 'ignore'],
        SPACE: [pressing, anchoring, 'ignore'],
      },
    },
    /* A set whose `selection-mode` is `none`. A press and Enter act on the
       item. Space, an arrival, Control or Command with A, and Escape move
       nothing. */
    none: {
      on: {
        ALL: 'ignore',
        ARRIVE: 'ignore',
        CLEAR: 'ignore',
        ENTER: [enterAct, 'ignore'],
        PRESS: [pressAct, 'ignore'],
        SPACE: 'ignore',
      },
    },
  },
}
