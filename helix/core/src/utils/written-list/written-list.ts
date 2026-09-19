/**
 * A list a consumer wrote into an attribute, split the way they write one.
 *
 * **Whitespace or commas, because a reader listing words puts commas between
 * them.** A split on whitespace alone turns `extra-controls="speed, pip"` into
 * `speed,` and `pip`, and `speed,` is not a control name: the control is
 * dropped, nothing is logged, and the docblock on the property says
 * unrecognized values are skipped, so the behavior looks like the documented
 * one. That is the undebuggable case `gridlines` names in its own docblock,
 * arrived at from the other direction, and it is why the widest spelling is the
 * one every consumer-written list takes.
 *
 * **Not for a value.** A payload is comma separated and nothing else, because a
 * value may hold a space: splitting `value="New York,Paris"` on whitespace
 * would submit a city that does not exist. Select, Listbox, Combobox and
 * Checkbox Group each split their own value on a comma and trim, which is the
 * other rule and not a lesser version of this one.
 *
 * **Nor for an IDREF list**, which is the platform's own format: `aria-*` and
 * `for` take whitespace and only whitespace, and accepting a comma there would
 * resolve an id nobody can write.
 */
export const writtenList = (source: string | undefined): string[] =>
  (source ?? '').split(/[\s,]+/).filter((one) => one !== '')

/**
 * The same list read as numbers, with everything that is not one dropped.
 *
 * **A stray entry leaves rather than becoming `NaN`.** A comparison against
 * `NaN` is false in both directions and a `NaN` drawn is nothing at all, so one
 * mistyped bound in `thresholds="0, 1, x, 6"` would color cells by a rule no
 * reader can see. Dropped, the rest of the list still means what it says.
 *
 * **Which numbers count is the caller's question.** Finiteness is all this can
 * answer, because a number that makes sense here is a bound, a reading and a
 * playback rate, and only the caller knows that a rate of zero is not a rate.
 */
export const writtenNumbers = (source: string | undefined): number[] =>
  writtenList(source)
    .map(Number)
    .filter((one) => Number.isFinite(one))
