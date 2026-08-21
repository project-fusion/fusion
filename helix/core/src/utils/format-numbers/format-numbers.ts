/**
 * A number formatter for a locale, built once and kept.
 *
 * `Intl.NumberFormat` is expensive to construct and cheap to call, and a
 * pagination renders its count on every update, so building one per render is
 * the whole cost of the component. Three files in one family had worked that
 * out separately and each kept its own two-line cache, which is three places to
 * find the day the caching rule changes and three chances for one of them to be
 * subtly different.
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
  return (value) => found.format(value)
}
