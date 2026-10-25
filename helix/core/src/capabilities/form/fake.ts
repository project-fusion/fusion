import type { Flag } from '../types.generated.js'
import type { Form } from './contract.generated.js'

/** One value given to the form. */
export interface GivenValue<N> {
  readonly node: N
  readonly value: string | null
}

/** One verdict given to the form. */
export interface GivenValidity<N> {
  readonly anchor: N | null
  readonly flags: readonly Flag[]
  readonly message: string
  readonly node: N
}

/** A form capability that keeps what it is given, for a spec to read. */
export interface FakeForm<N> extends Form<N> {
  /** Each node whose form was submitted, in order. */
  readonly submitted: readonly N[]
  /** Every verdict given, in order. */
  readonly validities: readonly GivenValidity<N>[]
  /** Every value given, in order. */
  readonly values: readonly GivenValue<N>[]
}

/** A fake that keeps each value, verdict, and submission it is given, and reaches no form. */
export const fakeForm = <N>(): FakeForm<N> => {
  const submitted: N[] = []
  const validities: GivenValidity<N>[] = []
  const values: GivenValue<N>[] = []
  return {
    submit: (node) => {
      submitted.push(node)
    },
    submitted,
    validities,
    validity: (node, flags, message, anchor) => {
      validities.push({ anchor, flags: [...flags], message, node })
    },
    value: (node, value) => {
      values.push({ node, value })
    },
    values,
  }
}
