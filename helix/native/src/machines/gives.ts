/**
 * The fields an event's detail takes from what the element computes, as its
 * form's `gives` names them: a callout's `dismiss` carries its heading's
 * words, or its content's, as its `label`.
 */
import type { Props } from '../render/behavior'
import { derivedFor } from '../render/computed'
import type { Family } from '../style/form'
import { given } from './props'

/**
 * `detail` with each field the event `gives` that it lacks: the value the
 * element computes under that name, or the prop of that name. A field the
 * machine that sends the event already wrote stays as it wrote it.
 */
export const givesInto = (
  family: Family,
  props: Props,
  event: string,
  detail: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> => {
  const gives = family.api?.events.find((one) => one.name === event)?.gives
  if (gives === undefined) {
    return detail
  }
  const out: Record<string, unknown> = { ...detail }
  for (const [field, from] of Object.entries(gives)) {
    if (!(field in out)) {
      out[field] = valued(family, props, from)
    }
  }
  return out
}

/**
 * What the element's prop or computed value `name` says: the value its form's
 * `derived` computes under that name, or the prop of that name, as a
 * layer's `closedby` binds the way a dialog is dismissed, which `persistent`
 * and `closedby` decide together.
 */
export const valued = (family: Family, props: Props, name: string | undefined): unknown => {
  if (name === undefined) {
    return undefined
  }
  const computed = family.api?.derived?.[name] as { readonly derive?: string } | undefined
  return computed?.derive === undefined
    ? given(family, props, name)
    : derivedFor({ family }, computed.derive, (one) =>
        /* The default region is what is passed in as children. */
        one === 'default' ? props.children : given(family, props, one),
      )
}
