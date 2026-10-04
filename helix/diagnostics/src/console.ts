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
 * | A runtime event core left to diagnostics | `console.warn`, or `console.error` for a failure | The library was used wrong as it ran |
 * | Unreadable stylesheets | `console.warn` | The run could not see part of the page |
 * | Coverage, overrides, a clean run | `console.info` | What the run looked at |
 * | Usage | `console.debug` | For whoever studies usage, hidden at the default level |
 * | Performance, where asked for | `console.info` | What the components cost, by tag |
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
import { shownRuntime } from './runtime.js'

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

/** How serious each severity is, for the project's threshold. */
const RANK: Record<Severity, number> = { error: 3, info: 1, warn: 2 }

/**
 * Writes a report and hands it back, so a caller can chain a second sink.
 *
 * **Each category prints as the project's `console` setting says**: findings
 * at or above a severity, coverage and usage on or off. The heading counts
 * every finding whatever is printed under it, and the ones the rules turned
 * off, so a quiet console never reads as a clean page.
 */
export const report = (
  result: Report,
  to: ConsoleSink = console,
  {
    shown,
  }: {
    /**
     * The fingerprints already printed for this page. Given, a finding prints
     * only the first time its fingerprint is seen, and is added; the heading
     * still counts every finding. `initDiagnostics()` keeps one per page, so
     * a run after every change does not repeat itself.
     */
    shown?: Set<string> | undefined
  } = {},
): Report => {
  const { configuration, coverage, findings } = result
  const levels = configuration.console
  const bySeverity = (severity: Severity): number =>
    findings.filter((finding) => finding.severity === severity).length
  const errors = bySeverity('error')
  const warnings = bySeverity('warn')
  const off = configuration.silenced.reduce((total, one) => total + one.count, 0)
  const missed = coverage.sheets - coverage.read
  const runtime = shownRuntime(result.runtime)

  const counts = [
    counted(errors, 'error'),
    counted(warnings, 'warning'),
    `${bySeverity('info')} info`,
    ...(runtime.length > 0 ? [`${runtime.length} runtime`] : []),
    ...(off > 0 ? [`${off} turned off`] : []),
  ]
  const heading =
    findings.length === 0 && off === 0 && runtime.length === 0
      ? 'helix diagnostics: no findings'
      : `helix diagnostics: ${counts.join(', ')}`
  /* Open where there is something to act on, closed where there is not. */
  if (errors + warnings + runtime.length > 0 || missed > 0) {
    to.group(heading)
  } else {
    to.groupCollapsed(heading)
  }

  if (levels.coverage !== 'off') {
    to.info(
      `read ${coverage.read} of ${counted(coverage.sheets, 'stylesheet')} across ${counted(coverage.roots, 'shadow root')}` +
        (result.run.page ? ` on ${result.run.page}` : ''),
    )
  }
  /* Unread stylesheets print whatever the setting: they qualify every finding. */
  if (missed > 0) {
    to.warn(
      [
        `${counted(missed, 'stylesheet')} could not be read, so ${missed === 1 ? 'it was' : 'they were'} not checked:`,
        ...coverage.unreadable.map((sheet) => `${sheet.sheet} (${sheet.reason})`),
      ].join('\n'),
    )
  }

  if (off > 0 && levels.coverage !== 'off') {
    to.info(
      configuration.silenced
        .map((one) => `${counted(one.count, one.kind)} turned off by the ${one.layer}`)
        .join('\n'),
    )
  }

  /* A severity is named for the console method that carries it. */
  if (levels.findings !== 'off') {
    const floor = RANK[levels.findings]
    let before = 0
    for (const finding of findings) {
      if (RANK[finding.severity] < floor) {
        continue
      }
      if (shown?.has(finding.fingerprint)) {
        before += 1
        continue
      }
      shown?.add(finding.fingerprint)
      to[finding.severity](entry(finding))
    }
    if (before > 0) {
      to.info(`${counted(before, 'finding')} printed before, on this page, and not again`)
    }
  }

  /* **Only the runtime events core left here**, each once. Core printed the
     rest as they happened, with the stack they happened in, and the heading
     counts them all. */
  if (levels.runtime !== 'off') {
    for (const one of runtime) {
      if (one.printed || shown?.has(one.fingerprint)) {
        continue
      }
      shown?.add(one.fingerprint)
      to[one.level](`${one.kind}${one.tag ? ` <${one.tag}>` : ''}: ${one.message}`)
    }
  }

  /* **What the components cost, slowest first**, where the project asked,
     and only when the measures moved: a run after every change would print
     the same table again. */
  if (levels.performance !== 'off' && result.performance) {
    const { measured, tags } = result.performance
    const rows = Object.entries(tags)
      .sort(([, a], [, b]) => b.render.p95 - a.render.p95)
      .slice(0, 10)
    const lines = rows.map(
      ([tag, one]) =>
        `${tag}: ${one.render.p50} ms median, ${one.render.p95} ms p95, ${one.render.max} ms slowest, of ${counted(one.render.count, 'first update')}` +
        (measured.layoutShift && one.shift > 0 ? `; ${one.shift} layout shift` : '') +
        (measured.longTasks && one.longTasks > 0 ? `; ${counted(one.longTasks, 'long task')}` : ''),
    )
    const key = `performance ${result.run.page ?? ''} ${lines.join('|')}`
    if (rows.length > 0 && !shown?.has(key)) {
      shown?.add(key)
      to.info(
        [
          `performance: ${counted(Object.keys(tags).length, 'tag')} measured, slowest first` +
            (measured.layoutShift ? '' : '. Layout shift is not measured in this browser') +
            (measured.longTasks ? '' : '. Long tasks are not measured in this browser'),
          ...lines,
        ].join('\n'),
      )
    }
  }

  if (levels.usage !== 'off') {
    const { counted: how, hooks, parts, tags, unlisted } = result.usage
    const sum = (counts: Record<string, Record<string, number>>): number =>
      Object.values(counts).reduce((total, one) => total + Object.keys(one).length, 0)
    const elements = Object.values(tags).reduce((total, one) => total + one, 0)
    const others = Object.keys(unlisted).length
    const versions = result.versions.helix
    to.debug(
      `usage (${how}): ${counted(Object.keys(tags).length, 'tag')} in ${counted(elements, 'element')}, ${counted(sum(parts), 'part')} styled, ${counted(sum(hooks), 'hook')} set` +
        (others > 0 ? `, and ${counted(others, 'helix- tag')} no manifest lists` : '') +
        (versions.length > 0 ? `; Helix ${versions.join(' and ')}` : ''),
    )
  }

  to.groupEnd()
  return result
}
