/**
 * The default sink: the console, and coverage before anything else.
 *
 * **Coverage is printed on a clean run too.** "No findings" from a collector
 * that read three sheets of nineteen is not a pass, and the only way to stop
 * that being read as one is to put the denominator next to the numerator every
 * single time.
 *
 * A sink and not a policy. It writes and returns; a CI sink writing JSON and an
 * OTLP exporter are the same `Report` consumed differently, which is what keeps
 * all three agreeing by construction rather than by our diligence.
 */
import type { Finding, Report } from './report.js'

const line = (finding: Finding): string[] => {
  const out = [`  ${finding.kind}: ${finding.subject}`, `    ${finding.message}`]
  if (finding.origin) {
    out.push(`    in ${finding.origin.sheet}, rule ${finding.origin.index}`)
    out.push(`    ${finding.origin.cssText}`)
  }
  return out
}

/** Writes a report and hands it back, so a caller can chain a second sink. */
export const report = (result: Report, to: Console = console): Report => {
  const { coverage, findings } = result
  const missed = coverage.sheets - coverage.read
  to.log(
    `helix diagnostics: read ${coverage.read} of ${coverage.sheets} stylesheets across ${coverage.roots} shadow roots` +
      (missed > 0 ? `, ${missed} unreadable` : ''),
  )
  for (const sheet of coverage.unreadable) {
    to.log(`  unreadable (${sheet.reason}): ${sheet.sheet}`)
  }

  if (findings.length === 0) {
    to.log(
      missed > 0
        ? '  no findings in what could be read. The unreadable sheets above were not checked.'
        : '  no findings.',
    )
    return result
  }

  to.log(`  ${findings.length} finding${findings.length === 1 ? '' : 's'}:`)
  for (const finding of findings) {
    for (const text of line(finding)) {
      to.log(text)
    }
  }
  return result
}
