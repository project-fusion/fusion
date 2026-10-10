import type { ComplexAttributeConverter } from 'lit'
import { auditNumber, auditTime } from '#audit-number'

/** What both converters hand Lit: a number, or `undefined` for a property with no default. */
type Converter = ComplexAttributeConverter<number | undefined>

/**
 * Reads a numeric attribute the way a native element reads one: a finite
 * number is taken, and anything else leaves the property at its default. A
 * property declares it as its `converter`, with the attribute's name and the
 * default the field is initialized to.
 *
 * **Lit's `Number` converter takes whatever `Number()` returns**, so a typo
 * became `NaN` and an empty attribute became 0, silently: `page-size="1O"`
 * showed every row of a data table, and `max="1OO"` sent `NaN` with a form.
 * `<progress max="ten">` keeps a `max` of 1.
 *
 * **A number with a unit after it is not a number here**, although HTML's own
 * parsing reads `8px` as 8. A unit says the writer counted in a scale the
 * property may not use. An attribute in milliseconds takes `timeConverter`,
 * which reads the units it can.
 *
 * **The default is written twice on purpose.** A converter is handed the
 * attribute's text and nothing else, so it cannot read the field's
 * initializer. Lit's `useDefault` could, and it also drops the initial value
 * from the first update's changed properties, which every `willUpdate` that
 * reads `changed.has(...)` on the first render would lose.
 *
 * An empty attribute and `Infinity` are not numbers here, and a removed
 * attribute returns the property to its default. `unit` names what the number
 * counts, such as `pixels`, for the development warning, which reports each
 * value that is not a number once. A property with an accessor passes
 * `undefined`, which hands its setter the value that means "not set", so its
 * `default-` seed shows through.
 */
export const numberConverter = (
  attribute: string,
  fallback: number | undefined,
  unit?: string,
): Converter => ({
  fromAttribute: (value: string | null): number | undefined => {
    if (value === null) {
      return fallback
    }
    const read = value.trim() === '' ? Number.NaN : Number(value)
    if (Number.isFinite(read)) {
      return read
    }
    auditNumber(attribute, value, fallback, unit)
    return fallback
  },
})

/** A CSS time: a number and `s` or `ms`, with nothing between them. */
const CSS_TIME = /^(\d+\.?\d*|\.\d+)(ms|s)$/i

/**
 * Reads an attribute in milliseconds, as `numberConverter` reads a number,
 * and also takes a CSS time: `3s` is 3000, `0.5s` is 500 and `300ms` is 300.
 * The property is always milliseconds.
 *
 * **A time is zero or more**, as a CSS duration is, so `-1s` and `-1` keep
 * the default. A space between the number and its unit is not a CSS time
 * either, and neither is a unit CSS has no time for, such as `3m`.
 */
export const timeConverter = (attribute: string, fallback: number | undefined): Converter => ({
  fromAttribute: (value: string | null): number | undefined => {
    if (value === null) {
      return fallback
    }
    const written = value.trim()
    const time = CSS_TIME.exec(written)
    /* `1.1e3` and not `1.1 * 1000`, which is 1100.0000000000002: the decimal
       point moves, and the digits stay as they were written. */
    const read = time
      ? Number(time[2]?.toLowerCase() === 's' ? `${time[1]}e3` : time[1])
      : written === ''
        ? Number.NaN
        : Number(written)
    if (Number.isFinite(read) && read >= 0) {
      return read
    }
    auditTime(attribute, value, fallback)
    return fallback
  },
})
