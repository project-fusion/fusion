import { expect, test } from 'bun:test'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ciSink } from './ci.js'
import type { Finding, Report } from './report.js'

/** One finding, at a severity, with a fingerprint. */
const finding = (severity: Finding['severity'], fingerprint: string): Finding => ({
  category: 'styling',
  decidedBy: 'shipped',
  fingerprint,
  kind: 'dead-hook',
  message: 'm',
  owner: 'consumer',
  severity,
  subject: `.x { --${fingerprint} }`,
  tag: 'helix-button',
})

/** A run on one page holding some findings. */
const run = (page: string, findings: Finding[]): Report =>
  ({
    coverage: { read: 1, roots: 0, sheets: 1, unreadable: [] },
    findings,
    run: { at: '', duration: 0, id: page, page, source: 'page' },
  }) as unknown as Report

test('the runs are written in the shared shape, and an error fails the job once per fault', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'ci-')), 'out/diagnostics.json')
  const shared = finding('error', 'a')
  const { code, summary } = ciSink(
    [run('/one', [shared, finding('warn', 'b')]), run('/two', [shared])],
    { file },
  )
  expect(code).toBe(1)
  expect(summary).toContain('2 runs, 1 error, 1 warning, 0 info')
  expect(summary).toContain('on /one, /two')
  expect(summary.match(/error dead-hook/g)).toHaveLength(1)
  expect(JSON.parse(readFileSync(file, 'utf8')).runs).toHaveLength(2)
})

test('warnings pass by default, and fail when the job says so', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'ci-')), 'diagnostics.json')
  const runs = [run('/one', [finding('warn', 'b')])]
  expect(ciSink(runs, { file }).code).toBe(0)
  expect(ciSink(runs, { failOn: 'warn', file }).code).toBe(1)
  expect(ciSink([run('/one', [finding('error', 'a')])], { failOn: 'never', file }).code).toBe(0)
})
