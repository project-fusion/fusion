import { segmentName } from '@fusion.dev/helix-core'

/** A part of the time a Time Picker wheel sets. */
export type WheelField = 'dayPeriod' | 'hour' | 'minute' | 'second'

/** The English names, for a runtime without `Intl.DisplayNames`. */
const ENGLISH: Record<WheelField, string> = {
  dayPeriod: 'AM/PM',
  hour: 'Hour',
  minute: 'Minute',
  second: 'Second',
}

/**
 * What a locale calls a wheel, core's `segmentName`, with its first letter in
 * capitals as a name standing on its own: "Hour" in English, "Stunde" in
 * German, "時" in Japanese, and "AM/PM" for the half of the day, React Aria's
 * name for it.
 */
export const wheelName = (field: WheelField, locale: string): string => {
  const name = segmentName(field, locale)
  /* The field's own key back is `Intl` having no name for it. */
  if (name === field || name === '') {
    return ENGLISH[field]
  }
  const lead = String.fromCodePoint(name.codePointAt(0) as number)
  return `${lead.toLocaleUpperCase(locale || undefined)}${name.slice(lead.length)}`
}
