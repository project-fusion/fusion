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
 * What a locale calls a wheel, from `Intl.DisplayNames`, with its first letter
 * in capitals as a name standing on its own: "Hour" in English, "Stunde" in
 * German, "時" in Japanese, and "AM/PM" for the half of the day, React Aria's
 * name for it.
 */
export const wheelName = (field: WheelField, locale: string): string => {
  try {
    const name = new Intl.DisplayNames(locale || undefined, { type: 'dateTimeField' }).of(field)
    if (!name) {
      return ENGLISH[field]
    }
    const first = name.codePointAt(0) as number
    const lead = String.fromCodePoint(first)
    return `${lead.toLocaleUpperCase(locale || undefined)}${name.slice(lead.length)}`
  } catch {
    return ENGLISH[field]
  }
}
