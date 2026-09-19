import { valueAsMinutes } from '../value-as/value-as.js'

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
 * being typed shows the letters rather than blanking under the reader.
 */
export const writeTime = (value: string, locale?: string): string => {
  const minutes = valueAsMinutes(value)
  if (minutes === null) {
    return value
  }
  const at = new Date(Date.UTC(2000, 0, 1, Math.floor(minutes / 60), minutes % 60))
  /* `timeStyle` rather than `hour` and `minute` assembled by hand. Measured in
     Chrome: `hour: 'numeric'` gives `9:00` for `en-GB`, unpadded, which is not
     how a twenty-four hour clock is written, while `hour: '2-digit'` gives
     `09:00 AM` for `en-US`, which is not how a twelve hour one is. `short` is
     each locale's own answer: `09:00` and `9:00 AM`. */
  return new Intl.DateTimeFormat(locale || undefined, {
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(at)
}
