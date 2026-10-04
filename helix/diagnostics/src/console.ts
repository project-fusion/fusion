/**
 * The default sink: the console, at the level each entry deserves.
 *
 * **Each kind of entry has its own console level**, so the browser's level
 * filter and a test runner's capture treat each as what it is:
 *
 * | Entry | Level | Why |
 * | --- | --- | --- |
 * | A finding at `error` | `console.error` | The CSS does nothing where it was written |
 * | A finding at `warn` | `console.warn` | Worth fixing, and the page works |
 * | A finding at `info` | `console.info` | Advice |
 * | Unreadable stylesheets | `console.warn` | The run could not see part of the page |
 * | Coverage, overrides, a clean run | `console.info` | What the run looked at |
 * | Usage | `console.debug` | For whoever studies usage, hidden at the default level |
 *
 * **All of it in one group**, headed by the counts, so a page with other logs
 * keeps a run together and a clean run collapses to one line.
 *
 * **Coverage is printed on a clean run too.** "No findings" from a collector
 * that read three sheets of nineteen is not a pass, and the only way to stop
 * that being read as one is to put the denominator next to the numerator every
 * single time.
 *
 * A sink and not a policy. It writes and returns; a CI sink writing JSON and an
 * OTLP exporter are the same `Report` consumed differently.
 */
import type { Finding, Report, Severity } from './report.js'

/** The console methods this sink calls. A test hands in its own. */
export type ConsoleSink = Pick<
  Console,
  'debug' | 'error' | 'group' | 'groupCollapsed' | 'groupEnd' | 'info' | 'warn'
>

/** One finding, as one entry: what is wrong, why, and the evidence. */
const entry = (finding: Finding): string => {
  /* Who set the severity, where it was not the shipped rule. */
  const by =
    finding.decidedBy === 'shipped' ? '' : ` (${finding.severity}, set by the ${finding.decidedBy})`
  const lines = [`${finding.kind}${by}: ${finding.subject}`, finding.message]
  if (finding.origin) {
    lines.push(`in ${finding.origin.sheet}, rule ${finding.origin.index}`, finding.origin.cssText)
  }
  return lines.join('\n')
}

/** A count and its noun, plural where it is not one. */
const counted = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`

/** Writes a report and hands it back, so a caller can chain a second sink. */
export const report = (result: Report, to: ConsoleSink = console): Report => {
  const { coverage, findings } = result
  const bySeverity = (severity: Severity): number =>
    findings.filter((finding) => finding.severity === severity).length
  const errors = bySeverity('error')
  const warnings = bySeverity('warn')
  const missed = coverage.sheets - coverage.read

  const heading =
    findings.length === 0
      ? 'helix diagnostics: no findings'
      : `helix diagnostics: ${counted(errors, 'error')}, ${counted(warnings, 'warning')}, ${bySeverity('info')} info`
  /* Open where there is something to act on, closed where there is not. */
  if (errors + warnings > 0 || missed > 0) {
    to.group(heading)
  } else {
    to.groupCollapsed(heading)
  }

  to.info(
    `read ${coverage.read} of ${counted(coverage.sheets, 'stylesheet')} across ${counted(coverage.roots, 'shadow root')}`,
  )
  if (missed > 0) {
    to.warn(
      [
        `${counted(missed, 'stylesheet')} could not be read, so ${missed === 1 ? 'it was' : 'they were'} not checked:`,
        ...coverage.unreadable.map((sheet) => `${sheet.sheet} (${sheet.reason})`),
      ].join('\n'),
    )
  }

  const { argument, file } = result.silenced
  if (argument + file > 0) {
    to.info(
      `${counted(argument + file, 'finding')} turned off: ${file} by the file, ${argument} by the argument`,
    )
  }

  /* A severity is named for the console method that carries it. */
  for (const finding of findings) {
    to[finding.severity](entry(finding))
  }

  const { counted: how, hooks, parts, tags, unlisted } = result.usage
  const sum = (counts: Record<string, Record<string, number>>): number =>
    Object.values(counts).reduce((total, one) => total + Object.keys(one).length, 0)
  const elements = Object.values(tags).reduce((total, one) => total + one, 0)
  const others = Object.keys(unlisted).length
  to.debug(
    `usage (${how}): ${counted(Object.keys(tags).length, 'tag')} in ${counted(elements, 'element')}, ${counted(sum(parts), 'part')} styled, ${counted(sum(hooks), 'hook')} set` +
      (others > 0 ? `, and ${counted(others, 'helix- tag')} no manifest lists` : ''),
  )

  to.groupEnd()
  return result
}
