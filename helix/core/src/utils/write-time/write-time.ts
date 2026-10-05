import { valueAsMinutes, valueAsSeconds } from '../value-as/value-as.js'

/**
 * A time written the way the reader's locale writes one.
 *
 * `Intl` decides between a twelve and a twenty-four hour clock, because that is
 * a property of the locale rather than of any component: `en-US` gets `2:30 PM`
 * and `en-GB` gets `14:30` without either being configured. There is no flag to
 * force one, deliberately. A product that needs to override its reader's own
 * convention has a locale problem rather than a component one, and the value is
 * 24 hour regardless.
 *
 * A value this cannot read is handed back unchanged, so a field showing what is
 * being typed shows the letters rather than blanking under the reader. Minute
 * precision, as `valueAsMinutes` reads: `writeClock` is the same writing to the
 * second.
 */
export const writeTime = (value: string, locale?: string): string =>
  valueAsMinutes(value) === null ? value : writeClock(value, locale ?? '')

/**
 * A time written the way the locale writes one, with its seconds where asked.
 *
 * Reads both `HH:mm` and `HH:mm:ss`, as `valueAsSeconds` does, which is what
 * Time Picker and Time Input hold; a locale with its clock set by `clockLocale`
 * writes on that clock. A value that is not a time is handed back unchanged.
 */
export const writeClock = (value: string, locale: string, seconds = false): string => {
  const at = valueAsSeconds(value)
  if (at === null) {
    return value
  }
  /* `timeStyle` rather than `hour` and `minute` assembled by hand. Measured in
     Chrome: `hour: 'numeric'` gives `9:00` for `en-GB`, unpadded, which is not
     how a twenty-four hour clock is written, while `hour: '2-digit'` gives
     `09:00 AM` for `en-US`, which is not how a twelve hour one is. `short` and
     `medium` are each locale's own answer: `09:00` and `9:00 AM`. */
  return new Intl.DateTimeFormat(locale || undefined, {
    timeStyle: seconds ? 'medium' : 'short',
    timeZone: 'UTC',
  }).format(new Date(at * 1000))
}
