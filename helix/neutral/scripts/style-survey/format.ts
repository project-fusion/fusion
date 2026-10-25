/**
 * Writes the report's summary as text: the totals, the constructs, and the
 * reasons with their examples.
 */

import type { Report, Tally } from './report.js'
import { compare } from './verdict.js'

/** How many reasons the summary prints. The JSON holds every one. */
const SHOWN_REASONS = 20

const WIDTH = 96

const clip = (text: string, width: number): string =>
  text.length > width ? `${text.slice(0, width - 3)}...` : text

const row = (label: string, tally: Tally): string =>
  [
    label.padEnd(14),
    String(tally.total).padStart(7),
    String(tally.expressible).padStart(13),
    String(tally['web-only']).padStart(10),
    String(tally['not-expressible']).padStart(17),
  ].join('')

const totals = (report: Report): string[] => [
  `Style survey of ${report.stylesheets} stylesheets under ${report.root}`,
  '',
  `${''.padEnd(14)}${'total'.padStart(7)}${'expressible'.padStart(13)}${'web-only'.padStart(10)}${'not expressible'.padStart(17)}`,
  row('rules', report.rules),
  row('selectors', report.selectors),
  row('declarations', report.declarations),
  row('at-rules', report.atRules),
  '',
  `The rules include ${report.frames} keyframes, and the selectors their offsets.`,
  `Parse errors: ${report.parseErrors.length}.`,
]

const constructs = (report: Report): string[] => {
  const entries = Object.entries(report.constructs).sort(
    ([firstName, first], [secondName, second]) => second - first || compare(firstName, secondName),
  )
  return [
    '',
    'Constructs, by the selectors, declarations, and at-rules that use each',
    ...entries.map(([name, count]) => `  ${name.padEnd(32)}${String(count).padStart(6)}`),
  ]
}

const reasons = (report: Report): string[] => {
  const shown = report.reasons.slice(0, SHOWN_REASONS)
  const rest = report.reasons.length - shown.length
  return [
    '',
    'Not expressible, by the rules each reason applies to',
    ...shown.flatMap((reason, index) => [
      `${String(index + 1).padStart(4)}. ${reason.code.padEnd(36)}${reason.rules} rules, ${reason.only} by it alone, ${reason.items} items`,
      ...reason.examples.map((example) =>
        clip(`        ${example.at}  ${example.text}  in  ${example.item}`, WIDTH),
      ),
    ]),
    ...(rest > 0 ? ['', `${rest} more reasons are in the report.`] : []),
  ]
}

/** The summary the survey prints, one line per string joined with newlines. */
export const formatSummary = (report: Report): string =>
  [...totals(report), ...constructs(report), ...reasons(report)].join('\n')
