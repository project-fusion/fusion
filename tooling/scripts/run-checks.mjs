#!/usr/bin/env node
/**
 * Runs `verify`'s checks in shards, and reports all of a shard's failures.
 *
 * **The list is derived from `verify` rather than restated beside it.** A
 * workflow that names its own checks is a second source of truth, and this
 * repository has already paid for one of those: `.claude/rules/helix.md`
 * records a rule and its enforcement living in different files with nothing
 * holding them together. So this reads the `verify` script, splits it, and
 * refuses any step it does not recognize. Adding a check to `verify` puts it in
 * CI with no second edit, and adding a step that is neither a check nor one of
 * the dedicated jobs stops the run rather than being skipped quietly.
 *
 * **Failures accumulate instead of short-circuiting**, which is the other half
 * and the reason this exists at all. `verify` is `a && b && c`, so it reports
 * one failure and stops: four separate CI runs went to finding four stale
 * artifacts on 25 Aug 2026, one per run, each about three minutes, because
 * every fix revealed the next one. A shard runs every check it owns.
 *
 * **Prerequisites run in every shard, because `verify`'s order is partly
 * semantic.** `analyze` sits at step 7 and `catalog` at 17, both generators,
 * and the checks after them read what they wrote. A shard taking an arbitrary
 * slice would fail on a manifest nobody had regenerated. Both are Turborepo
 * tasks whose outputs are cached, so with a warm cache they cost a restore
 * rather than a run.
 *
 *   node tooling/scripts/run-checks.mjs --list
 *   node tooling/scripts/run-checks.mjs --shard 0 --of 6
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * Steps that have their own CI job, so a shard must not also run them.
 * Duplicating `cargo test` across six shards would cost more than the split
 * saves, and `biome ci` reads every file regardless of who owns it.
 */
const DEDICATED = new Set([
  'biome ci .',
  'bun run rs:check',
  'bun run rs:test',
  'bun run test',
  'bun run typecheck',
])

/**
 * Generators whose output the later checks read. Every shard runs these before
 * its own work, in `verify`'s order.
 */
const PREREQUISITES = ['bun run analyze', 'bun run catalog']

const steps = readVerify()
const checks = steps.filter((step) => !DEDICATED.has(step) && !PREREQUISITES.includes(step))

for (const step of checks) {
  if (!step.startsWith('bun run check:')) {
    /* **Refused rather than run, and rather than ignored.** An unrecognized
       step is either a new generator that belongs in PREREQUISITES or a new
       kind of work that belongs in its own job. Guessing which would either
       skip it in CI or run it six times. */
    console.error(
      `run-checks: \`verify\` step ${JSON.stringify(step)} is neither a check\n` +
        'nor one of the steps with a dedicated job.\n\n' +
        'Add it to DEDICATED if it gets its own job, or to PREREQUISITES if\n' +
        'the checks after it read what it writes.',
    )
    process.exit(1)
  }
}

const argument = (name) => {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

if (process.argv.includes('--list')) {
  const total = Number(argument('of') ?? 6)
  console.log(JSON.stringify([...Array(total).keys()]))
  process.exit(0)
}

const shard = Number(argument('shard'))
const of = Number(argument('of'))
if (!Number.isInteger(shard) || !Number.isInteger(of) || of < 1) {
  console.error('run-checks: needs --shard <n> --of <total>, or --list')
  process.exit(1)
}

/* Striped rather than blocked, so a run of expensive neighbours cannot land in
   one shard. `check:contrast` renders every example in a browser and
   `check:node` reads one file, and nothing here knows which is which. */
const mine = checks.filter((_, index) => index % of === shard)

const run = (step) => {
  const [command, ...rest] = step.split(' ')
  return spawnSync(command, rest, { cwd: ROOT, stdio: 'inherit' }).status === 0
}

for (const step of PREREQUISITES) {
  if (!run(step)) {
    console.error(`\nrun-checks: prerequisite \`${step}\` failed, so nothing ran.`)
    process.exit(1)
  }
}

const failed = []
for (const step of mine) {
  console.log(`\n=== ${step}`)
  if (!run(step)) {
    failed.push(step)
  }
}

console.log(
  `\nrun-checks: shard ${shard} of ${of}, ${mine.length} checks, ` + `${failed.length} failed`,
)
if (failed.length > 0) {
  console.error(failed.map((step) => `  ${step}`).join('\n'))
  process.exit(1)
}

/** The `verify` script, split into steps, as the single source of the list. */
function readVerify() {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  return manifest.scripts.verify.split('&&').map((step) => step.trim())
}
