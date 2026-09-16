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
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { argument } from '@fusion.dev/scripts/argv'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * Steps that have their own CI job, so a shard must not also run them.
 * Duplicating `cargo test` across six shards would cost more than the split
 * saves, and `biome ci` reads every file regardless of who owns it.
 */
const DEDICATED = new Set([
  'biome ci .',
  /* Runs every other check itself, so a shard drawing it runs the whole suite
     serially and becomes the critical path for a workflow that split six ways
     to avoid exactly that. */
  'bun run check:spec:floors',
  /* Needs a Rust toolchain, which a shard does not have and five of the six
     would never use. It runs in `cli`, where the cargo cache is warm and the
     binary it calls has just been built, and which waits for the workspace
     build these read on top of. */
  'bun run check:cli',
  /* **The CLI's own subcommands, for the reason above.** `bin.mjs` resolves a
     built binary or builds one, so a shard without the cargo cache compiles it,
     and several shards compiling Rust at once exhaust the runner's memory:
     `Killed` at exit 137, a SIGTERM, and the neighbors canceled behind them. */
  'bun run check:css:seeds',
  'bun run check:prose',
  'bun run fusion spec check',
  'bun run rs:check',
  'bun run rs:test',
  'bun run test',
  'bun run typecheck',
])

/**
 * What the checks read, built before any of them run, in `verify`'s order.
 *
 * **`build` is here because `catalog` does not reach everything.** `catalog` is
 * a `fusion/site` task and turbo builds what that package depends on, which is not
 * the whole workspace: `@fusion.dev/helix-headless` is not one of its dependencies, and
 * `check:gen:metrics` measures `helix/headless/dist`. A shard without a full
 * build measures a dist nobody produced, which passes on a machine where an
 * earlier build left one and fails on a runner.
 *
 * All three are cached tasks, so with a warm remote cache they cost a restore.
 * Without one every shard pays the build, which is why the remote cache is a
 * precondition for this split rather than a refinement of it.
 */
const PREREQUISITES = ['bun run build', 'bun run analyze', 'turbo run catalog']

const steps = readVerify()
const checks = steps.filter((step) => !DEDICATED.has(step) && !PREREQUISITES.includes(step))

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
        'Add it to DEDICATED if it gets its own job, or to PREREQUISITES if\n' +
        'the checks after it read what it writes.',
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
   one shard. `check:css:contrast` renders every example in a browser and
   the node rule reads one file, and nothing here knows which is which. */
const mine = checks.filter((_, index) => index % of === shard)

/* **`turbo` is a workspace binary and is not on a plain `PATH`.** `spawnSync`
   without a shell gets the environment it is given, so a bare `turbo run` is
   ENOENT and the prerequisite loop reports the whole shard dead before a single
   check runs. The pre-push hook prepends the same directory for the same
   reason. */
const PATH = `${join(ROOT, 'node_modules', '.bin')}:${process.env.PATH ?? ''}`

const run = (step) => {
  const [command, ...rest] = step.split(' ')
  return (
    spawnSync(command, rest, {
      cwd: ROOT,
      env: { ...process.env, PATH },
      stdio: 'inherit',
    }).status === 0
  )
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
