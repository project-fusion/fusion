#!/usr/bin/env bun
/**
 * Compares the records the two halves of Helix's conformance suite wrote:
 * what the web elements did in each browser, from the browser specs, and what
 * React Native did, from the native Jest specs.
 *
 *   bun fusion/scripts/compare-conformance.mjs [--from <dir>] [--expect <platforms>]
 *
 * Reads every `.json` under `--from`, which is `.local/conformance` where it
 * is left out. In CI each job that records uploads its file, and the
 * `conformance` job downloads them all into one folder, a folder per job.
 * `--expect` names the platforms that must have written a record, separated
 * by commas, and is `chromium,webkit,react-native` where it is left out.
 *
 * WebKit is held to Chromium exactly, and React Native to the web after
 * keeping the events and the detail fields each element's neutral form
 * declares: `compareWritten` in `@fusion.dev/helix-testing/conformance` has
 * the rules, and `helix/testing/README.md` the suite.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { compareWritten, PLATFORM_NAMES, SCENARIOS } from '@fusion.dev/helix-testing/conformance'
import { argument } from '@fusion.dev/scripts/argv'
import { leave } from '@fusion.dev/scripts/leave'
import { root } from '@fusion.dev/scripts/workspace'

const from = argument('from') ?? join(root, '.local/conformance')
const expected = (argument('expect') ?? 'chromium,webkit,react-native')
  .split(',')
  .filter((one) => one !== '')
const strange = expected.filter((one) => !(one in PLATFORM_NAMES))
if (strange.length > 0) {
  console.error(
    `conformance: --expect takes ${Object.keys(PLATFORM_NAMES).join(', ')}, and was given ${strange.join(', ')}`,
  )
  await leave(1)
}

/** Every file under `from` that holds a record, as a `Written`. */
const files = await readdir(from, { recursive: true }).catch(() => [])
const written = []
for (const file of files.filter((one) => one.endsWith('.json')).sort()) {
  const one = JSON.parse(await readFile(join(from, file), 'utf8'))
  if (typeof one?.platform === 'string' && one.platform in PLATFORM_NAMES && one.record) {
    written.push(one)
  }
}

const scenarios = Object.values(SCENARIOS).flat()
const { failures, notes } = compareWritten(scenarios, written, expected)
if (notes.length > 0) {
  console.log(`${notes.join('\n')}\n`)
}
const where = from.startsWith(root) ? relative(root, from) : from
if (failures.length > 0) {
  console.error(
    `conformance: ${failures.length} ${failures.length === 1 ? 'failure' : 'failures'} in the records in ${where}\n\n${failures.join('\n\n')}`,
  )
  await leave(1)
}
const names = Object.entries(PLATFORM_NAMES)
  .filter(([platform]) => written.some((one) => one.platform === platform))
  .map(([, name]) => name)
const intents = scenarios.reduce((sum, one) => sum + one.intents.length, 0)
console.log(
  `conformance: ${scenarios.length} scenarios and ${intents} intents compared across ${
    names.length > 2 ? `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}` : names.join(' and ')
  }, from ${where}`,
)
