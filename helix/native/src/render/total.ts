/**
 * A prop an element reads as a sum, as a meter measures the sum of the
 * segments passed into it.
 *
 * **The sum stands in for the prop while the element holds any of them**, as
 * the web element reads it, so the two cannot disagree. A child is one of
 * them by its tag, and its value adds only where it is a number above zero.
 */
import type { Family } from '../style/form'
import type { Props } from './behavior'
import { flat } from './counters'
import { camel } from './styles'

/** A child's tag and its props, where it is an element drawn from a family. */
interface Drawn {
  readonly props?: Readonly<Record<string, unknown>>
  readonly type?: { readonly tag?: unknown }
}

/** The children of `props` that `family` sums, by their tag. */
export const summedIn = (family: Family, props: Props): readonly unknown[] => {
  const total = family.api?.total
  if (total === undefined) {
    return []
  }
  const tag = `helix-${total.of}`
  return flat(props.children).filter((child) => (child as Drawn).type?.tag === tag)
}

/**
 * Whether `name` is the value a total holds while the element holds any of
 * what it sums, and if so whether it does: a meter is `segmented` only while
 * it holds a `HelixMeterSegment`, as the web counts its segment children, and
 * words or another view passed in beside them do not count.
 */
export const totalHolds = (family: Family, props: Props, name: string): boolean | undefined =>
  family.api?.total?.holds === name ? summedIn(family, props).length > 0 : undefined

/** `props`, with the prop `family` reads as a sum given the sum, where it holds what it sums. */
export const totaled = (family: Family, props: Props): Props => {
  const total = family.api?.total
  if (total === undefined) {
    return props
  }
  const summed = summedIn(family, props)
  if (summed.length === 0) {
    return props
  }
  const sum = summed.reduce<number>((sum, child) => {
    const share = Number((child as Drawn).props?.[camel(total.prop)])
    return Number.isFinite(share) && share > 0 ? sum + share : sum
  }, 0)
  return { ...props, [camel(total.into)]: sum }
}
