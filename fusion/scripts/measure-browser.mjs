#!/usr/bin/env bun
/**
 * What each family costs each browser check, written where `plan-browser.mjs`
 * and the checks themselves read it.
 *
 *   bun run measure:browser --from <dir> [--run <id>]
 *   bun run measure:browser [--runs <n>] [--workers <n>] [--only <task>]
 *
 * **The planner used to derive a family's cost from how many examples it holds,
 * and a shard is only as balanced as that model is true.** Contrast does not
 * cost by example: on run 35041878434 its four shards held 142, 142, 142 and
 * 141 examples and took 118, 43, 40 and 43 seconds. So the model is measured,
 * into `lib/browser-cost.json`, and there are two ways to take the reading.
 *
 * **Read a run, which is the machine the shards are for.** Every browser job
 * records what each of its families cost and uploads it, so a run's artifacts
 * are the whole corpus a shard at a time:
 *
 *   gh run download <id> --pattern 'browser-cost-*' --dir .local/from-ci
 *   bun run measure:browser --from .local/from-ci --run <id>
 *
 * **Or run the checks here, which needs no CI and is a shape rather than a
 * scale.** A desk is several times a two-core runner and not uniformly: aura is
 * a sixth of contrast on an M2 and a third of it on `ubuntu-latest`, a software
 * rasterizer against a GPU, and shards packed from the M2's reading ran 127 and
 * 84 seconds against 106 planned. So a local reading is scaled onto the `runner`
 * figures below and is the fallback, not the first choice.
 *
 * **One worker locally, because a runner gets one.** Four finish four times
 * sooner and compress the shape further: a family that waits on a decode is
 * delayed no further by the three beside it, while a family that paints is.
 *
 * **A check that refuses to run is left unmeasured rather than guessed at.**
 * `check:spec:visual` compares against Linux baselines and exits on anything
 * else, saying so, so on a Mac it records nothing and keeps its per-picture
 * estimate. What this must not do is write a zero, which would weigh every
 * family the same and pack the shards by accident.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { join } from 'node:path'
import { argument } from '@fusion.dev/scripts/argv'
import { root } from '@fusion.dev/scripts/workspace'

/**
 * Each check, what runs it, and what its family work took on a runner. Read off
 * the browser jobs of run 35052371545, which recorded it family by family, and
 * only the local path uses these: readings taken on a runner are their own
 * scale.
 */
const CHECKS = [
  { runner: 215, script: 'check:css:contrast', task: 'contrast' },
  { runner: 539, script: 'check:spec:dsd', task: 'dsd' },
  { runner: 566, script: 'check:spec:visual-parity', task: 'parity' },
  { runner: 91, script: 'smoke:examples', task: 'smoke' },
  { runner: 56, script: 'specs:browser', task: 'specs' },
  { runner: 189, script: 'check:spec:visual', task: 'visual' },
]

const OUT = join(root, 'fusion/scripts/lib/browser-cost.json')
const SCRATCH = join(root, '.local/browser-cost')

const from = argument('from')
const run = argument('run')
const runs = from === undefined ? Number(argument('runs') ?? 3) : 1
const workers = Number(argument('workers') ?? 1)
const only = argument('only')
if (!Number.isInteger(runs) || runs < 1 || !Number.isInteger(workers) || workers < 1) {
  throw new Error('--runs and --workers each take a whole number of at least 1')
}

const wanted = CHECKS.filter((check) => only === undefined || check.task === only)
if (wanted.length === 0) {
  throw new Error(`--only names one of ${CHECKS.map((check) => check.task).join(', ')}`)
}
if (from !== undefined && !existsSync(from)) {
  throw new Error(`--from names a directory of downloaded artifacts, and \`${from}\` is not there`)
}

/** The middle reading, which for an even count is the lower of the two. */
const median = (numbers) => [...numbers].sort((a, b) => a - b)[Math.floor((numbers.length - 1) / 2)]

/** Every `<task>.json` under a directory, however deep the download nested it. */
const recorded = (where, task) => {
  const found = []
  for (const entry of readdirSync(where, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      found.push(...recorded(join(where, entry.name), task))
    } else if (entry.name === `${task}.json`) {
      found.push(JSON.parse(readFileSync(join(where, entry.name), 'utf8')))
    }
  }
  return found
}

/**
 * A run's shards of one check, added together.
 *
 * **Added rather than averaged**, because the shards of a check are its corpus
 * divided: every family is in exactly one of them, so a family appears in one
 * file and the sum over the files is the corpus once.
 */
const merged = (task) => {
  const shards = recorded(from, task)
  const families = {}
  for (const shard of shards) {
    for (const [family, seconds] of Object.entries(shard)) {
      families[family] = Number(((families[family] ?? 0) + seconds).toFixed(3))
    }
  }
  return shards.length === 0 ? undefined : families
}

if (from === undefined) {
  rmSync(SCRATCH, { force: true, recursive: true })
  mkdirSync(SCRATCH, { recursive: true })
}

const checks = {}
const unmeasured = []
for (const check of wanted) {
  if (from !== undefined) {
    const families = merged(check.task)
    if (families === undefined) {
      unmeasured.push(check.task)
      continue
    }
    /* The readings are the runner's already, so `runner` is their sum and
       `@fusion.dev/scripts/cost` scales by one. */
    const total = Object.values(families).reduce((sum, one) => sum + one, 0)
    checks[check.task] = {
      families: Object.fromEntries(Object.entries(families).sort(([a], [b]) => (a < b ? -1 : 1))),
      runner: Math.round(total),
    }
    console.log(
      `  ${check.task}: ${Object.keys(families).length} families, ${total.toFixed(0)}s on a runner`,
    )
    continue
  }
  const readings = []
  for (let at = 0; at < runs; at += 1) {
    const file = join(SCRATCH, `${check.task}-${at}.json`)
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
      `  ${check.task} run ${at + 1}: ${Object.keys(taken).length} families, ` +
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
        from === undefined
          ? 'Each check run end to end on the machine below, the median of what `pool` timed for ' +
            'each family. `runner` is what that check took on a runner and the readings are this ' +
            "machine's, so `@fusion.dev/scripts/cost` scales the families onto it: the shape is " +
            'measured here and the scale is not. Refresh with `bun run measure:browser`.'
          : 'What `pool` timed for each family in the browser jobs of the run below, its shards ' +
            'added back into the corpus they divide. `runner` is their sum, these being a ' +
            "runner's own seconds. Refresh with `measure:browser --from`, which the header of " +
            'the script spells out.',
      machine:
        from === undefined
          ? `${cpus()[0]?.model ?? 'unknown'}, ${cpus().length} cores, ${workers} worker`
          : `ubuntu-latest, the browser jobs${run === undefined ? '' : ` of run ${run}`}`,
      measured,
      runs,
    },
    null,
    2,
  )}\n`,
)
console.log(
  `measure: ${wanted.length - unmeasured.length} of ${wanted.length} checks ` +
    `${from === undefined ? `over ${runs} runs` : 'read off a run'}, written to ${OUT}`,
)
