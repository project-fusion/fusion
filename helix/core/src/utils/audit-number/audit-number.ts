import { reportRuntime } from '../report-runtime/report-runtime.js'

/** The sentences already printed, so one mistake is reported once a page. */
const reported = new Set<string>()

/** Reports one sentence, unless it has been reported already. */
const report = (message: string): void => {
  if (reported.has(message)) {
    return
  }
  reported.add(message)
  reportRuntime({ kind: 'not-a-number', message })
}

/** What the property was left at, said after the value that was refused. */
const kept = (attribute: string, fallback: number | undefined): string =>
  fallback === undefined
    ? `\`${attribute}\` stays unset`
    : `\`${attribute}\` keeps its default of ${fallback}`

/**
 * Reports a numeric attribute that holds something other than a number, such
 * as `page-size="1O"`, which `numberConverter` reads as the property's
 * default.
 *
 * **Once for each attribute, value and default**, since a converter is not
 * handed the element: twenty tables written with `page-size="1O"` are one
 * mistake, and the sentence names what to search the markup for.
 *
 * **In a development build only**, as `missing-name` is: every numeric
 * attribute would pay for a sentence meant for the person writing the page.
 * Core imports it as `#audit-number`, which `package.json` resolves here under
 * the `development` condition and to `audit-number-off.ts`, which does
 * nothing, everywhere else.
 */
export const auditNumber = (
  attribute: string,
  value: string,
  fallback: number | undefined,
  unit?: string,
): void => {
  const takes = unit === undefined ? 'a number' : `a number of ${unit}, with no unit after it`
  report(
    `${attribute}="${value}" is not a number, so ${kept(attribute, fallback)}. ` +
      `Write \`${attribute}\` as ${takes}.`,
  )
}

/**
 * Reports an attribute in milliseconds that holds something other than a
 * time, such as `duration="soon"` or `delay="-1s"`, which `timeConverter`
 * reads as the property's default. Once for each, in a development build
 * only, as `auditNumber` is.
 */
export const auditTime = (attribute: string, value: string, fallback: number | undefined): void => {
  report(
    `${attribute}="${value}" is not a time of zero or more, so ${kept(attribute, fallback)}. ` +
      `Write \`${attribute}\` in milliseconds, such as 300, or as a CSS time, such as 300ms or 0.3s.`,
  )
}
