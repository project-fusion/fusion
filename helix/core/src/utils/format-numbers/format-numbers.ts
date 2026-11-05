/**
 * A number formatter for a locale, built once and kept.
 *
 * `Intl.NumberFormat` is expensive to construct and cheap to call, and a
 * pagination renders its count on every update, so building one per render is
 * the whole cost of the component.
 *
 * Keyed on the locale, so a component that never changes locale builds one
 * formatter for its life and one that does builds a second and drops the first.
 * Shared across components rather than per instance: a table of a hundred rows
 * asking for the same locale gets the same object, which is what a cache is
 * for and what a private field per element cannot do.
 *
 * An empty string means the runtime's own, which is what every caller was
 * already passing `|| undefined` to say.
 */
const held = new Map<string, Intl.NumberFormat>()

export const formatNumbers = (locale: string): ((value: number) => string) => {
  let format = held.get(locale)
  if (!format) {
    format = new Intl.NumberFormat(locale || undefined)
    held.set(locale, format)
  }
  const found = format
  /* **A negative number takes the minus sign, U+2212, where the locale writes
     a hyphen**, which is the typesetter's rule for figures: the hyphen is
     shorter and sits lower, so "-8,000" on a chart's axis read as a dash
     beside a number (November 4, 2026). A locale that writes its own minus
     keeps it. */
  return (value) =>
    value < 0 || Object.is(value, -0)
      ? found
          .formatToParts(value)
          .map((part) => (part.type === 'minusSign' && part.value === '-' ? '\u2212' : part.value))
          .join('')
      : found.format(value)
}
