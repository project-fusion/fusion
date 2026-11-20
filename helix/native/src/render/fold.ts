/**
 * The elements an element draws of those passed into it, where its form
 * folds them, as an avatar group draws the first `max` people and counts
 * the rest.
 *
 * **The rest are left out**, as the web hides them, so a screen reader
 * reaches only those drawn, and the count stands for the others. Text passed
 * in counts as one of them, as it is a child on the web.
 */
import { cloneElement, isValidElement, type ReactElement } from 'react'
import type { Family } from '../style/form'
import type { Props } from './behavior'
import { flat } from './counters'
import { camel } from './styles'

/**
 * Where folded props keep every child passed in, so what the element
 * computes from its default region, such as how many are folded away and
 * their names, counts them all.
 */
export const UNFOLDED: unique symbol = Symbol('unfolded')

/** `props`, with its children cut to the count its fold's prop holds. */
export const folded = (family: Family, props: Props): Props => {
  const fold = family.api?.fold
  if (fold === undefined) {
    return props
  }
  const max = Number(props[camel(fold.max)])
  if (!(Number.isFinite(max) && max > 0)) {
    return props
  }
  const children = flat(props.children)
  if (fold.middle !== undefined) {
    return foldedMiddle(props, children, Math.floor(max), fold.middle)
  }
  return children.length > max
    ? { ...props, children: children.slice(0, Math.floor(max)), [UNFOLDED]: children }
    : props
}

/** What a fold of the middle hands the first element, by its props' names. */
type Middle = NonNullable<NonNullable<NonNullable<Family['api']>['fold']>['middle']>

/**
 * **A fold of the middle keeps the first element and the last `max` less
 * one**, at least two, and hands the first what it folded, as a trail's
 * first crumb draws the menu of the crumbs folded after it.
 */
const foldedMiddle = (
  props: Props,
  children: readonly unknown[],
  max: number,
  middle: Middle,
): Props => {
  const [first, ...rest] = children
  const count = children.length - max
  if (max < 2 || count <= 0 || !isValidElement(first)) {
    return props
  }
  const handed = cloneElement(first as ReactElement<Record<string, unknown>>, {
    [camel(middle.count)]: count,
    [camel(middle.items)]: rest.slice(0, count),
    [camel(middle.label)]: props[camel(middle.words)],
  })
  return { ...props, children: [handed, ...rest.slice(count)], [UNFOLDED]: children }
}
