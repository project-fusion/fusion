import { createElement, Fragment, type ReactNode } from 'react'
import type { Family } from '../style/form'
import type { Entry } from './entry'
import type { Layered } from './layered'

/** A component's props as React hands them, by React's camel-case names. */
export type Props = Readonly<Record<string, unknown>>

/**
 * What the machines give one part of the tree.
 *
 * **The renderer draws, and the machines say what a part does.** A part's
 * view takes `view` over what the tree gives it, so a binder adds handlers,
 * a ref, and accessibility it knows, and its style reads `states` as
 * conditions, as a stylesheet reads a part's state on the web.
 */
export interface PartBinding {
  /**
   * Whether a driver moves the part through an animated style, which draws a
   * box or the host as Reanimated's `Animated.View`. An animated style moves
   * only a view Reanimated made. Other kinds of part draw as they do without it.
   */
  readonly animated?: boolean
  /**
   * Words a press is described by beside its own description, as a tooltip
   * describes the control in its anchor: a phone's hint, left out where the
   * press is already named by them.
   */
  readonly hint?: string
  /**
   * What a layer's machine gives the layer it is bound to: where it stands,
   * where it is placed, and what dismisses it.
   */
  readonly layer?: Layered
  /**
   * Conditions the part's styles read, such as `pressed`, and values the
   * part's attributes bind in place of a prop, as a set gives the name of
   * an item's grip.
   */
  readonly states?: Readonly<Record<string, boolean | string>>
  /**
   * Lists the part's attributes bind in place of a prop, as a repeat's
   * `each` reads the sections an outline draws its links from.
   */
  readonly lists?: Readonly<Record<string, readonly object[]>>
  /** Props laid over the part's own view: handlers, a ref callback, accessibility. */
  readonly view?: Readonly<Record<string, unknown>>
  /**
   * How many times the part's motion has started again, as a drilldown's
   * page slides in anew with each move, as the web writes its state anew.
   */
  readonly runs?: number
  /**
   * Props laid over the view of one copy of the part, where a repeat draws
   * it, made from the copy's entry. **A binding's `view` is shared by every
   * copy**, so a ref there holds whichever copy React attached last, and a
   * machine that needs each copy's view, as an outline keeps its marked
   * link in view, gives a ref for each copy here.
   */
  readonly copy?: (item: Entry) => Readonly<Record<string, unknown>>
  /**
   * Draws something around the part's view, as Gesture Handler's
   * `GestureDetector` goes around the view whose touches it hears.
   */
  readonly wrap?: (view: ReactNode) => ReactNode
}

/** What every machine an element runs gives its drawing, at one render. */
export interface Behavior {
  /** Each part's binding, by the part's name in the tree. */
  readonly parts: Readonly<Record<string, PartBinding>>
  /** The custom states the element is in, which `:state()` reads on the web and its styles read here. */
  readonly marks: readonly string[]
  /**
   * Wraps what the element draws, as a set gives its items the context they
   * join it through.
   */
  readonly provide?: (drawn: ReactNode) => ReactNode
}

/**
 * What the binding of `part`, or the host's, gives under `name`: a list
 * first, then a state.
 */
export const boundBy = (behavior: Behavior, part: string, name: string): unknown =>
  behavior.parts[part]?.lists?.[name] ??
  behavior.parts.host?.lists?.[name] ??
  behavior.parts[part]?.states?.[name] ??
  behavior.parts.host?.states?.[name]

/** Nothing bound: what an element with no machines draws with. */
export const STILL: Behavior = { marks: [], parts: {} }

/** A hook that hosts an element's machines and says what they give its parts. */
export type UseBehavior = (family: Family, props: Props) => Behavior

/** Two wraps as one, the first outermost. */
const around = (outer: PartBinding['wrap'], inner: PartBinding['wrap']): PartBinding['wrap'] =>
  outer === undefined || inner === undefined
    ? (outer ?? inner)
    : (view: ReactNode) => outer(inner(view))

/** A ref callback, as a binding hands one to its part's view. */
type RefCallback = (node: unknown) => void

/* Two refs as one, made once for each pair, so the view keeps one ref across
   renders and React does not detach and attach it each time. */
const joinedRefs = new WeakMap<RefCallback, WeakMap<RefCallback, RefCallback>>()

/** Two ref callbacks as one that calls both, the first first, the same function for the same pair. */
export const bothRefs = (first: RefCallback, second: RefCallback): RefCallback => {
  const seconds = joinedRefs.get(first) ?? new WeakMap<RefCallback, RefCallback>()
  joinedRefs.set(first, seconds)
  let both = seconds.get(second)
  if (both === undefined) {
    both = (node: unknown) => {
      first(node)
      second(node)
    }
    seconds.set(second, both)
  }
  return both
}

/** Two views of one copy as one, the later on top, with both refs. */
const bothCopies = (
  earlier: PartBinding['copy'],
  later: PartBinding['copy'],
): PartBinding['copy'] =>
  earlier === undefined || later === undefined
    ? (earlier ?? later)
    : (item) => {
        const first = earlier(item)
        const second = later(item)
        return typeof first.ref === 'function' && typeof second.ref === 'function'
          ? {
              ...first,
              ...second,
              ref: bothRefs(first.ref as RefCallback, second.ref as RefCallback),
            }
          : { ...first, ...second }
      }

/** The handlers two bindings may both give a part, each of which hears the event. */
const HEARD = [
  'onBlur',
  'onFocus',
  'onLayout',
  'onPress',
  'onTouchCancel',
  'onTouchEnd',
  'onTouchStart',
] as const

/** Each handler both views give, joined so both hear the event. */
const bothHeard = (
  earlier: Readonly<Record<string, unknown>> | undefined,
  later: Readonly<Record<string, unknown>> | undefined,
): Record<string, unknown> => {
  const joined: Record<string, unknown> = {}
  for (const name of HEARD) {
    const first = earlier?.[name]
    const second = later?.[name]
    if (typeof first === 'function' && typeof second === 'function') {
      joined[name] = (event: unknown) => {
        first(event)
        second(event)
      }
    }
  }
  return joined
}

/**
 * `binding` laid over `before`, for the same part. **Two bindings that each
 * hand the part a ref callback both get its view**, as an item's join and
 * its press each listen on the view a key is pressed on, and **both hear a
 * focus, a blur, or a touch**, as a press and a countdown's hold do.
 */
const over = (before: PartBinding | undefined, binding: PartBinding): PartBinding => {
  const wrap = around(before?.wrap, binding.wrap)
  const copy = bothCopies(before?.copy, binding.copy)
  const earlier = before?.view?.ref
  const later = binding.view?.ref
  const layer = binding.layer ?? before?.layer
  const hint = binding.hint ?? before?.hint
  const ref =
    typeof earlier === 'function' && typeof later === 'function'
      ? { ref: bothRefs(earlier as RefCallback, later as RefCallback) }
      : {}
  return {
    ...(before?.animated === true || binding.animated === true ? { animated: true } : {}),
    ...(layer === undefined ? {} : { layer }),
    ...(hint === undefined ? {} : { hint }),
    states: { ...before?.states, ...binding.states },
    ...(before?.lists === undefined && binding.lists === undefined
      ? {}
      : { lists: { ...before?.lists, ...binding.lists } }),
    view: { ...before?.view, ...binding.view, ...ref, ...bothHeard(before?.view, binding.view) },
    ...(wrap === undefined ? {} : { wrap }),
    ...(copy === undefined ? {} : { copy }),
  }
}

/**
 * The view a binding lays over its part, with the view of the copy `item`
 * over it where a repeat draws the part, and both refs.
 */
export const viewFor = (
  binding: PartBinding | undefined,
  item?: Entry,
): Readonly<Record<string, unknown>> | undefined => {
  const each = item === undefined ? undefined : binding?.copy?.(item)
  if (each === undefined) {
    return binding?.view
  }
  const shared = binding?.view?.ref
  return typeof shared === 'function' && typeof each.ref === 'function'
    ? { ...binding?.view, ...each, ref: bothRefs(shared as RefCallback, each.ref as RefCallback) }
    : { ...binding?.view, ...each }
}

/**
 * Lays bindings for the same part over each other, the later on top, merging
 * their states. A part is animated where any binding asks for it. Each wrap
 * is kept, the earlier outermost, for a part as for the element.
 */
export const merged = (...behaviors: readonly Behavior[]): Behavior => {
  const parts: Record<string, PartBinding> = {}
  for (const behavior of behaviors) {
    for (const [name, binding] of Object.entries(behavior.parts)) {
      parts[name] = over(parts[name], binding)
    }
  }
  const wraps = behaviors.flatMap((behavior) => (behavior.provide ? [behavior.provide] : []))
  const marks = behaviors.flatMap((behavior) => behavior.marks)
  return wraps.length === 0
    ? { marks, parts }
    : { marks, parts, provide: (drawn) => wraps.reduceRight((inner, wrap) => wrap(inner), drawn) }
}

/**
 * A part's view with what its binding draws around it. A wrapped view is
 * keyed by `key`, as the view itself is among the views beside it.
 */
export const wrapped = (
  behavior: Behavior,
  part: string,
  view: ReactNode,
  key?: string,
): ReactNode => {
  const wrap = behavior.parts[part]?.wrap
  return wrap === undefined ? view : createElement(Fragment, { key }, wrap(view))
}
