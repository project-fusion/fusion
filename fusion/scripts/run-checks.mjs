#!/usr/bin/env node
/**
 * Runs `verify`'s checks in shards, and reports all of a shard's failures.
 *
 * **The list is derived from `verify` rather than restated beside it.** A
 * workflow that names its own checks is a second source of truth. So this reads
 * the `verify` script, splits it, and refuses any step it does not recognize.
 * Adding a check to `verify` puts it in CI with no second edit, and a step that
 * is neither a check nor one of the dedicated jobs stops the run rather than
 * being skipped quietly.
 *
 * **Failures accumulate instead of short-circuiting**, which is the other half
 * and the reason this exists at all. `verify` is `a && b && c`, so it reports
 * one failure and stops, and finding four stale artifacts costs four CI runs.
 * A shard runs every check it owns.
 *
 * **Each check is run command by command, and floored.** A step is expanded
 * into the commands it comes down to, which run in order and stop at the first
 * failure, as `&&` does. A command the floor reads has its success line read
 * for a zero, which is a check that passed while counting nothing. The rule and
 * its reasons are in `lib/checks.mjs`.
 *
 * **Prerequisites run in every shard, because `verify`'s order is partly
 * semantic.** `analyze` sits at step 7 and `catalog` at 17, both generators,
 * and the checks after them read what they wrote. A shard taking an arbitrary
 * slice would fail on a manifest nobody had regenerated. Both are Turborepo
 * tasks whose outputs are cached, so with a warm cache they cost a restore
 * rather than a run.
 *
 *   node fusion/scripts/run-checks.mjs --list
 *   node fusion/scripts/run-checks.mjs --shard 0 --of 6
 */
import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { argument } from '@fusion.dev/scripts/argv'
import { expand, floored, PREREQUISITES, sharded, tally } from '@fusion.dev/scripts/checks'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const checks = sharded()

/* **A generated-file check is a `turbo run` invocation, and it is still a
   check.** A test that does not recognize one refuses the whole listing, `plan`
   emits nothing, the `checks` matrix expands to zero jobs, and the aggregator
   fails a run in which every job that existed passed.

   Two spellings because the corpus has two: most pass `-- --check` to a task
   that also writes, and `wasm-check` is its own task and says so in the name.
   Both are matched on the intent rather than on `turbo run` alone, which would
   accept a generator and run it six times, silently, which is the failure this
   refusal exists to prevent.

   `bun run fusion <area> check` is the third, and it is recognized here and
   then claimed by DEDICATED: it is a check, and it is the Rust job's rather
   than a shard's. */
const CHECK =
  /^turbo run [a-z-]+ -- --check$|^turbo run [a-z-]+-check$|^bun run fusion [a-z]+ check$/

for (const step of checks) {
  if (!step.startsWith('bun run check:') && !CHECK.test(step)) {
    /* **Refused rather than run, and rather than ignored.** An unrecognized
       step is either a new generator that belongs in PREREQUISITES or a new
       kind of work that belongs in its own job. Guessing which would either
       skip it in CI or run it six times. */
    console.error(
      `run-checks: \`verify\` step ${JSON.stringify(step)} is neither a check\n` +
        'nor one of the steps with a dedicated job.\n\n' +
        'Add it to DEDICATED in fusion/scripts/lib/checks.mjs if it gets its\n' +
        'own job, or to PREREQUISITES there if the checks after it read what\n' +
        'it writes.',
    )
    process.exit(1)
  }
}

/**
 * How many shards the checks divide into, and why it lives here.
 *
 * **The count is a fact about the list, so it belongs with the list.** Declared
 * in the workflow as well, the two disagree and `--list` run by hand describes a
 * different shard than CI runs. `--count` is what the workflow reads, so the
 * number leaves this file rather than being written twice.
 *
 * **Three, because these are off the critical path.** Measured on CI 15 Sep
 * 2026, a shard of ten was 13 to 67 seconds of checks behind ten of setup, and
 * all ten finished minutes before the browser jobs beside them: each was a
 * billed minute buying no speed. Three still finish inside that shadow. The
 * number to raise again is the day a shard becomes the longest job in a run.
 */
const SHARDS = 3

if (process.argv.includes('--count')) {
  console.log(SHARDS)
  process.exit(0)
}

if (process.argv.includes('--list')) {
  const total = Number(argument('of') ?? SHARDS)
  console.log(JSON.stringify([...Array(total).keys()]))
  process.exit(0)
}

const shard = Number(argument('shard'))
const of = Number(argument('of'))
if (!Number.isInteger(shard) || !Number.isInteger(of) || of < 1) {
  console.error('run-checks: needs --shard <n> --of <total>, or --list')
  process.exit(1)
}

/* Striped rather than blocked, so a run of expensive neighbors cannot land in
   one shard. One check renders every example in a browser and another reads
   one file, and nothing here knows which is which. */
const mine = checks.filter((_, index) => index % of === shard)

/* **`turbo` is a workspace binary and is not on a plain `PATH`.** `spawnSync`
   without a shell gets the environment it is given, so a bare `turbo run` is
   ENOENT and the prerequisite loop reports the whole shard dead before a single
   check runs. The pre-push hook prepends the same directory for the same
   reason. */
const PATH = `${join(ROOT, 'node_modules', '.bin')}:${process.env.PATH ?? ''}`

/**
 * Runs one command, printing what it prints, and resolves with whether it
 * passed and what it wrote to stdout.
 *
 * **Echoed as it arrives rather than after.** A check that hangs has to show
 * how far it got in the log the timeout leaves behind.
 */
const run = (command) =>
  new Promise((done) => {
    const [program, ...rest] = command.split(/\s+/)
    const child = spawn(program, rest, {
      cwd: ROOT,
      env: { ...process.env, PATH },
      stdio: ['ignore', 'pipe', 'inherit'],
    })
    let output = ''
    child.stdout.on('data', (chunk) => {
      output += chunk
      process.stdout.write(chunk)
    })
    child.on('error', (error) => done({ error, output, passed: false }))
    child.on('close', (status) => done({ output, passed: status === 0 }))
  })

for (const step of PREREQUISITES) {
  if (!(await run(step)).passed) {
    console.error(`\nrun-checks: prerequisite \`${step}\` failed, so nothing ran.`)
    process.exit(1)
  }
}

const failed = []
const empty = []
let counted = 0
for (const step of mine) {
  console.log(`\n=== ${step}`)
  for (const command of expand(step)) {
    const { error, output, passed } = await run(command)
    if (!passed) {
      /* **A command that could not be started is reported as that.** It reads
         as a failure either way, and the cause named here saves reading the
         log for an error that never printed. */
      failed.push(error ? `${step} (\`${command}\` could not be run: ${error.code})` : step)
      break
    }
    if (!floored(command)) {
      continue
    }
    const said = tally(output)
    if (!said) {
      continue
    }
    counted += 1
    if (said.numbers.includes(0)) {
      empty.push(`${command}: passed while counting nothing. It said "${said.line}".`)
    }
  }
}

/* The number reported is the number floored, not the number listed, which is
   the floor's own rule applied to this line. */
console.log(
  `\nrun-checks: shard ${shard} of ${of}, ${mine.length} checks, ${failed.length} failed, ` +
    `${counted} success lines floored, ${empty.length} counted nothing`,
)
if (failed.length > 0) {
  console.error(failed.map((step) => `  ${step}`).join('\n'))
}
if (empty.length > 0) {
  console.error(`Checks that passed on an empty scan:\n  ${empty.join('\n  ')}`)
}
if (failed.length > 0 || empty.length > 0) {
  process.exit(1)
}
