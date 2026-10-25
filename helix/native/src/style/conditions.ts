/**
 * Which rules hold under a context, in the order a browser applies them:
 * specificity, then source order.
 */
import type * as Form from '../ir.generated.js'
import { length } from './apply.js'
import type { Context } from './context.js'
import type { Condition, Family, Rule } from './form.js'
import type { Placed } from './resolved.js'

const INTERACTIONS: Readonly<Record<string, string>> = {
  active: 'active',
  'focus-visible': 'focusVisible',
  'focus-within': 'focusWithin',
  hover: 'hover',
}

/**
 * Whether a node at `at` stands at `place`. Nowhere where its place is not
 * known, and neither even nor odd where its count from one is not.
 */
const standsAt = (place: Form.Place, at: Placed | undefined): boolean => {
  if (at === undefined) {
    return false
  }
  /* The `at`th from the start or the end, or any after it. */
  if (typeof place === 'object') {
    const { at: wanted, fromEnd, onward } = place.nth
    const counted = fromEnd ? at.fromEnd : at.index
    return counted !== undefined && (onward ? counted >= wanted : counted === wanted)
  }
  switch (place) {
    case 'even':
    case 'odd':
      return at.index !== undefined && at.index % 2 === (place === 'even' ? 0 : 1)
    case 'first':
      return at.first
    case 'last':
      return at.last
    case 'only':
      return at.first && at.last
  }
}

/**
 * Whether `condition` holds for `rule` under `context`, where the target is
 * drawn inside the parts `around`.
 *
 * **What a native view cannot know does not hold.** A slotted child's own
 * interaction, which the element around never hears, matches nothing, and its
 * negation matches everything, which is each one at rest. A part's place
 * among the parts beside it is where the tree draws it.
 */
const matches = (
  condition: Condition,
  context: Context,
  rule: Rule,
  around: readonly string[],
): boolean => {
  const held = context.conditions
  switch (condition.kind) {
    case 'absent': {
      return held[condition.name] === undefined || held[condition.name] === false
    }
    case 'child': {
      return context.child === (condition.first ? 'first' : 'later')
    }
    case 'attribute': {
      return condition.value === null
        ? Boolean(held[condition.name])
        : held[condition.name] === condition.value
    }
    /* A native element is drawn upgraded. */
    case 'defined': {
      return true
    }
    /* The host's own width, once it is laid out. */
    case 'container': {
      const below = length(condition.below, context.rem ?? 16, context.rem ?? 16)
      return context.width !== undefined && typeof below === 'number' && context.width < below
    }
    /* The window a layer is placed in, at the reader's text size, as a
       media query's rem is the reader's font size on the web. */
    case 'window': {
      const below = length(condition.below, context.rem ?? 16, context.rem ?? 16)
      return (
        context.viewport !== undefined &&
        typeof below === 'number' &&
        context.viewport.width < below
      )
    }
    /* The first render of the element, which its transitions move away from. */
    case 'entering': {
      return context.entering === true
    }
    /* Whether the region holds something, as the web element's `has-` state says. */
    case 'filled': {
      return context.filled?.includes(condition.region) === true
    }
    case 'dir': {
      return (context.dir ?? 'ltr') === condition.value
    }
    case 'disabled': {
      return Boolean(held.disabled) === condition.value
    }
    case 'host-place': {
      return standsAt(condition.place, context.place)
    }
    /* Among the elements of its own kind passed in with it, nowhere where
       that is not known. */
    case 'host-of-type': {
      return context.ofType === condition.at
    }
    case 'media': {
      return MEDIA[condition.query]?.(context) === true
    }
    case 'not': {
      return !matches(condition.condition, context, rule, around)
    }
    case 'one-of': {
      const value = held[condition.name]
      return typeof value === 'string' && condition.values.includes(value)
    }
    case 'part': {
      return condition.is === undefined
        ? Boolean(context.part?.[condition.name]) === condition.value
        : context.part?.[condition.name] === condition.is
    }
    /* A slotted child's place among what is passed in, or a part's among
       the parts the tree draws beside it. */
    case 'place': {
      return (
        (rule.slotted !== undefined || rule.target !== 'host') &&
        context.child !== undefined &&
        standsAt(condition.place, {
          first: context.child === 'first',
          ...(context.fromEnd === undefined ? {} : { fromEnd: context.fromEnd }),
          ...(context.index === undefined ? {} : { index: context.index }),
          last: context.last === true,
        })
      )
    }
    case 'pseudo': {
      return (
        (rule.slotted === undefined || rule.target !== 'host') &&
        condition.names.some((name) => held[INTERACTIONS[name] ?? name] === true)
      )
    }
    case 'state': {
      return held[condition.name] === true
    }
    /* What holds of the part around is read as the element's own: a phone
       presses and focuses the element's press, whichever part a stylesheet
       names. Every part is drawn inside the host. */
    case 'within': {
      return (
        (condition.part === 'host' || around.includes(condition.part)) &&
        (condition.on ?? []).every((held) => matches(held, context, rule, around))
      )
    }
    /* With no interaction, whether the tree draws the part at all. */
    case 'holds': {
      return condition.names.length === 0
        ? context.drawn?.includes(condition.part) === true
        : condition.names.some((name) => held[INTERACTIONS[name] ?? name] === true)
    }
    case 'also': {
      return (context.also ?? []).includes(condition.name) === condition.value
    }
  }
}

/**
 * Each media query a native view reads, by the query the web writes. A rule
 * under print or forced colors is the web's alone, and never reaches here.
 */
const MEDIA: Readonly<Record<string, (context: Context) => boolean>> = {
  '(forced-colors: none)': () => true,
  /* A finger is a coarse pointer that cannot hover. */
  '(hover: none)': () => true,
  '(pointer: coarse)': () => true,
  '(prefers-reduced-motion: no-preference)': (context) => context.reducedMotion !== true,
  '(prefers-reduced-motion: reduce)': (context) => context.reducedMotion === true,
}

/**
 * The rules a native view can use, in the order a browser would apply them,
 * for a target drawn inside the parts `around`.
 */
export const cascade = (family: Family, context: Context, around: readonly string[] = []): Rule[] =>
  family.rules
    .filter((item): item is Rule => item.kind === 'rule')
    .filter((rule) => !rule.webOnly && rule.selector === undefined && rule.supports === undefined)
    .filter((rule) => rule.when.every((condition) => matches(condition, context, rule, around)))
    .sort(
      (left, right) =>
        left.specificity[0] - right.specificity[0] ||
        left.specificity[1] - right.specificity[1] ||
        left.specificity[2] - right.specificity[2] ||
        left.order - right.order,
    )
