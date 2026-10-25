/**
 * Surveys how much of Helix's component CSS the neutral style language can
 * express. Writes `dist/style-survey.json` and prints the summary.
 *
 * Run it with `bun run survey:style` from `helix/neutral`.
 */

import { join } from 'node:path'
import { formatSummary } from './format.js'
import { readSheets } from './read.js'
import { summarize } from './report.js'
import { surveySheet } from './survey.js'

const ROOT = 'helix/styled/src'

const repository = join(import.meta.dir, '../../../..')
const output = join(import.meta.dir, '../../dist/style-survey.json')

const sources = await readSheets(join(repository, ROOT))
const report = summarize(
  ROOT,
  sources.map((source) => surveySheet(source.path, source.text)),
)

await Bun.write(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(formatSummary(report))
console.log(`\nWrote helix/neutral/dist/style-survey.json`)
