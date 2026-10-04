/**
 * The CI sink: every run of a CI job in one JSON file, and an exit code.
 *
 * **Node only**, which is why it is an entry of its own: it writes a file,
 * and the page's entry never touches the file system.
 *
 * **One fault, one line, however many pages show it.** A dead hook in a
 * shared stylesheet is on every page that loads the sheet; the summary groups
 * findings by fingerprint and names the pages, so a reviewer reads each fault
 * once.
 *
 * The file is the run format every sink shares, so the dashboard reads a CI
 * job's file exactly as it reads a page's run.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Finding, Report, Severity } from './report.js'

/** What the CI sink writes, and what fails the job. */
export interface CiOptions {
  /** Where the runs are written, as JSON. */
  file: string
  /** The lowest severity that fails the job, or `never`. `error` by default. */
  failOn?: Severity | 'never'
}

/** How serious each severity is. */
const RANK: Record<Severity, number> = { error: 3, info: 1, warn: 2 }

/** A count and its noun, plural where it is not one. */
const counted = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`

/**
 * Writes the runs, and says what failed.
 *
 * Returns the exit code the job should end with and the summary to print;
 * the caller prints and exits, so a script can add its own lines first.
 */
export const ciSink = (
  runs: Report[],
  { file, failOn = 'error' }: CiOptions,
): { code: 0 | 1; summary: string } => {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify({ runs, schema: 1 }, null, 2)}\n`)

  /* Each distinct fault, by fingerprint, with every page it was found on. */
  const faults = new Map<string, { finding: Finding; pages: Set<string> }>()
  for (const run of runs) {
    for (const finding of run.findings) {
      const fault = faults.get(finding.fingerprint) ?? { finding, pages: new Set<string>() }
      fault.pages.add(run.run.page ?? '(no page)')
      faults.set(finding.fingerprint, fault)
    }
  }
  const all = [...faults.values()]
  const of = (severity: Severity): number =>
    all.filter(({ finding }) => finding.severity === severity).length
  const failing =
    failOn === 'never' ? [] : all.filter(({ finding }) => RANK[finding.severity] >= RANK[failOn])
  const unread = runs.reduce((total, run) => total + run.coverage.unreadable.length, 0)

  const lines = [
    `helix diagnostics: ${counted(runs.length, 'run')}, ${counted(of('error'), 'error')}, ${counted(of('warn'), 'warning')}, ${of('info')} info` +
      (unread > 0 ? `, ${counted(unread, 'unreadable stylesheet')}` : '') +
      `. Written to ${file}.`,
  ]
  for (const { finding, pages } of failing) {
    const where = [...pages].sort()
    lines.push(
      `  ${finding.severity} ${finding.kind}: ${finding.subject}`,
      `    ${finding.message}`,
      `    on ${where.slice(0, 5).join(', ')}${where.length > 5 ? `, and ${where.length - 5} more` : ''}`,
    )
  }
  return { code: failing.length > 0 ? 1 : 0, summary: lines.join('\n') }
}
