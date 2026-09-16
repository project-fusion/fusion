#!/usr/bin/env bun
/**
 * What each family costs each browser check, written where `plan-browser.mjs`
 * and the checks themselves read it.
 *
 *   bun run measure:browser [--runs <n>] [--workers <n>] [--only <task>]
 *
 * **The planner used to derive a family's cost from how many examples it holds,
 * and a shard is only as balanced as that model is true.** Contrast does not
 * cost by example: on run 35041878434 its four shards held 142, 142, 142 and
 * 141 examples and took 118, 43, 40 and 43 seconds. So the model is measured.
 * Each check is run end to end, `pool` times every family's work, and the
 * median over the runs is what lands in `lib/browser-cost.json`.
 *
 * **One worker by default, because a runner gets one.** Four here finish four
 * times sooner and compress the shape: a family that waits on a decode or a
 * font is delayed no further by the three beside it, while a family that paints
 * is, so the expensive families measure cheaper than they are. That is the one
 * distortion this exists to avoid.
 *
 * **The readings are this machine's and the plan is in runner seconds**, so
 * what is trusted here is the shape and not the scale: `@fusion.dev/scripts/cost`
 * scales each check's families onto `RUNNER` below. Refresh this file when the
 * corpus grows enough that a shard's spread is worth re-checking, and refresh
 * `RUNNER` from the run that shows it.
 *
 * **A check that refuses to run here is left unmeasured rather than guessed at.**
 * `check:spec:visual` compares against Linux baselines and exits on anything
 * else, saying so, so on a Mac it records nothing and keeps the per-picture
 * estimate. Its shards were even without a measurement: 98 and 96 seconds on run
 * 35047479608. What this must not do is write a zero, which would weigh every
 * family the same and pack the shards by accident.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { join } from 'node:path'
import { argument } from '@fusion.dev/scripts/argv'
import { root } from '@fusion.dev/scripts/workspace'

/**
 * Each check, what runs it, and what its family work took on a runner.
 *
 * Measured on the CI run of #22 on 15 Sep 2026: parity 587 seconds, hydration
 * 611, contrast 235, visual 192, smoke 97 and the specs 68. Hydration's figure
 * holds the fixtures, which are one page and not a family's work, so the 15
 * seconds `ESTIMATE` carries as its fixed part come off it here.
 */
const CHECKS = [
  { runner: 235, script: 'check:css:contrast', task: 'contrast' },
  { runner: 596, script: 'check:spec:dsd', task: 'dsd' },
  { runner: 587, script: 'check:spec:visual-parity', task: 'parity' },
  { runner: 97, script: 'smoke:examples', task: 'smoke' },
  { runner: 68, script: 'specs:browser', task: 'specs' },
  { runner: 192, script: 'check:spec:visual', task: 'visual' },
]

const OUT = join(root, 'fusion/scripts/lib/browser-cost.json')
const SCRATCH = join(root, '.local/browser-cost')

const runs = Number(argument('runs') ?? 3)
const workers = Number(argument('workers') ?? 1)
const only = argument('only')
if (!Number.isInteger(runs) || runs < 1 || !Number.isInteger(workers) || workers < 1) {
  throw new Error('--runs and --workers each take a whole number of at least 1')
}

const wanted = CHECKS.filter((check) => only === undefined || check.task === only)
if (wanted.length === 0) {
  throw new Error(`--only names one of ${CHECKS.map((check) => check.task).join(', ')}`)
}

/** The middle reading, which for an even count is the lower of the two. */
const median = (numbers) => [...numbers].sort((a, b) => a - b)[Math.floor((numbers.length - 1) / 2)]

rmSync(SCRATCH, { force: true, recursive: true })
mkdirSync(SCRATCH, { recursive: true })

const checks = {}
const unmeasured = []
for (const check of wanted) {
  const readings = []
  for (let run = 0; run < runs; run += 1) {
    const file = join(SCRATCH, `${check.task}-${run}.json`)
    const started = Date.now()
    /* The exit code is not read: a check that finds something real still
       measured everything it rendered, and a finding on a desk is usually this
       machine rather than the tree. */
    spawnSync('bun', ['run', check.script, '--workers', String(workers)], {
      cwd: root,
      env: { ...process.env, BROWSER_COST: file },
      stdio: 'ignore',
    })
    if (!existsSync(file)) {
      break
    }
    const taken = JSON.parse(readFileSync(file, 'utf8'))
    readings.push(taken)
    const total = Object.values(taken).reduce((sum, one) => sum + one, 0)
    console.log(
      `  ${check.task} run ${run + 1}: ${Object.keys(taken).length} families, ` +
        `${total.toFixed(1)}s of family work in ${((Date.now() - started) / 1000).toFixed(0)}s`,
    )
  }
  if (readings.length < runs) {
    unmeasured.push(check.task)
    continue
  }
  const families = {}
  for (const family of [...new Set(readings.flatMap((one) => Object.keys(one)))].sort()) {
    families[family] = Number(median(readings.map((one) => one[family] ?? 0)).toFixed(3))
  }
  checks[check.task] = { families, runner: check.runner }
}
for (const task of unmeasured) {
  console.log(`  ${task}: recorded nothing here, so it keeps the estimate it had`)
}

/* Only what was measured is replaced, so `--only` refreshes one check rather
   than emptying the other five. */
const before = JSON.parse(readFileSync(OUT, 'utf8'))
const measured = execFileSync('git', ['log', '-1', '--format=%cs'], { cwd: root }).toString().trim()
writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      checks: Object.fromEntries(
        Object.entries({ ...before.checks, ...checks }).sort(([a], [b]) => (a < b ? -1 : 1)),
      ),
      how:
        'Each check run end to end on the machine below, the median of what `pool` timed for ' +
        'each family. `runner` is what that check took on a runner, and ' +
        '`@fusion.dev/scripts/cost` scales the families onto it: the shape is measured here and ' +
        'the scale is not. Refresh with `bun run measure:browser`.',
      machine: `${cpus()[0]?.model ?? 'unknown'}, ${cpus().length} cores, ${workers} worker`,
      measured,
      runs,
    },
    null,
    2,
  )}\n`,
)
console.log(
  `measure: ${wanted.length - unmeasured.length} of ${wanted.length} checks over ${runs} runs, ` +
    `written to ${OUT}`,
)
