/**
 * What a picker field finds wrong: a message, reported as `badInput`, or the
 * validity flag to set and its message. Empty means nothing is wrong.
 */
export type PickerVerdict = string | readonly [flag: keyof ValidityStateFlags, message: string]

/**
 * A verdict as the flags and the message `setValidity` takes, or `null` where
 * there is nothing wrong.
 *
 * Shared by `MixinPickerField` and `MixinSegmentedField`, the two shapes a
 * date, time or color field takes, which report the same verdicts.
 */
export const verdictFlags = (
  verdict: PickerVerdict,
): [flags: ValidityStateFlags, message: string] | null => {
  if (typeof verdict === 'string') {
    return verdict === '' ? null : [{ badInput: true }, verdict]
  }
  return [{ [verdict[0]]: true }, verdict[1]]
}
