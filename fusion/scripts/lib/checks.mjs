/**
 * What `verify`'s checks are, the commands they come down to, and how a
 * command's success line is floored. A module, not a script: `run-checks.mjs`
 * runs the checks and floors what they print, and `check-floors.mjs` floors
 * what `check` reaches that no shard runs.
 *
 * **Both read one list, which is why it lives here.** The floor ran as a job of
 * its own that spawned every check a second time, serially, to read the line
 * the shards had already printed: 216 seconds, measured over ten runs to 10 Oct
 * 2026, and the last job to finish in a median run. The shards hold that output,
 * so they read it, and the floor's job keeps only what no shard runs.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { root } from './workspace.mjs'

const scripts = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts ?? {}

/**
 * Steps that have their own CI job, so a shard must not also run them.
 * Duplicating `cargo test` across six shards would cost more than the split
 * saves, and `biome ci` reads every file regardless of who owns it.
 */
export const DEDICATED = new Set([
  'biome ci .',
  /* Runs what no shard runs, and reads the structure of `check` itself, so
     it is a job beside them and never a step inside one. */
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
  'bun run fusion x spec check',
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
 * **The build is `build-for-checks.sh`, which is `bun run build` without
 * `next build`.** No check reads `.next`, and `warm` builds the same set, so a
 * shard restores every task of it. The script says how it finds the site's
 * other tasks.
 *
 * All three are cached tasks, so with a warm remote cache they cost a restore.
 * Without one every shard pays the build, which is why the remote cache is a
 * precondition for this split rather than a refinement of it.
 */
export const PREREQUISITES = [
  'bash .github/scripts/build-for-checks.sh',
  'bun run analyze',
  'turbo run catalog',
]

/** The `verify` script, split into steps, as the single source of the list. */
export const verify = () => scripts.verify.split('&&').map((step) => step.trim())

/** The steps the `checks` shards divide between them. */
export const sharded = () =>
  verify().filter((step) => !DEDICATED.has(step) && !PREREQUISITES.includes(step))

/**
 * Every command a script actually runs, found by walking it rather than by
 * recognizing script names.
 *
 * **The floor read name shapes until 29 Aug 2026, and lost most of its corpus
 * without saying so.** It took every script with two colons in it, on the
 * reasoning that a name that deep is a leaf and its parent is the group. When the
 * generator wrappers were replaced by `turbo run <task> -- --check` written
 * inline, seven leaves stopped being scripts and the floor stopped being able to
 * see them: ten checks became three, and it went on printing a success line,
 * because three checks that counted something is what it had been asked to
 * verify.
 *
 * A name is a fact about how somebody wrote a script; the command tree is what
 * runs. So a step is expanded through `&&` and through every `bun run` naming
 * another script, and what comes out the bottom is commands.
 */
export const expand = (command, seen = new Set()) => {
  const step = command.trim()
  const named = /^bun run ([\w:-]+)$/.exec(step)
  if (named && scripts[named[1]] && !seen.has(named[1])) {
    return scripts[named[1]].split('&&').flatMap((one) => expand(one, new Set([...seen, named[1]])))
  }
  return [step]
}

/**
 * What the floor does not read, and why each one is out.
 *
 * Matched against the command rather than against a script name, because a name
 * is what went missing once. `turbo run samples -- --check` is the same work
 * whether or not anybody wrapped it in a script.
 *
 * **The runner is stripped before comparing, and that is not tidiness.** These
 * were literal strings carrying `node `, so moving the repository to bun left
 * three of them matching nothing: the floor spawned *itself*, recursing until
 * the job hit its twenty-minute timeout, and the two browser checks ran in its
 * job as well as in the jobs built for them. A list that has to be edited
 * whenever a command is respelled is a list that will be wrong again.
 */
export const bare = (command) => command.replace(/^(?:node|bun) /, '')
export const EXEMPT = [
  /* The floor itself. */
  'fusion/scripts/check-floors.mjs',
  /* The four that `verify.yml` gives their own `browser` jobs. Running them
     from the floor too renders the entire browser matrix a second time,
     single file, while the six jobs built for it sit idle, and that job then
     sets the critical path for the whole workflow. Hydration is the costliest
     of them: its corpus hydrates every example, and run from there it took
     `verify` from a few minutes to half an hour.

     The floor they lose is real and is the cheaper half of the trade: each
     already fails loudly on an empty corpus, because rendering nothing and
     comparing nothing is what they are, whereas a static check that walks an
     empty directory reports a confident zero. */
  'fusion/scripts/check-diagnostics.mjs',
  'fusion/scripts/check-visual-run.mjs',
  'helix/cli/npm/bin.mjs visual test --config visual.dsd.config.ts',
  'helix/cli/npm/bin.mjs visual test',
  /* The site suite, which `verify.yml` gives a job of its own beside them. */
  'helix/cli/npm/bin.mjs visual test --config fusion/site/visual.config.ts',
  'helix/cli/npm/bin.mjs visual test --config visual.parity.config.ts',
  /* Reads the hexes a browser paints, so it runs in the diagnostics job, which
     `plan-browser.mjs` names it beside. A job with no browser cannot start it. */
  'fusion/scripts/check-token-hexes.mjs',
  /* The three that compare a committed file against a fresh derivation of the
     whole corpus. What guards a generator is that its output is committed and
     read; running these from the floor would measure every family a second
     time for fifteen seconds and learn nothing the first run did not. */
  'fusion/scripts/build-metrics.mjs --check',
]

/**
 * Floored in process by the CLI that runs them: a rule returns its count and
 * the `floors` rule beside it reads that count, so reading the same number out
 * of a sentence learns nothing.
 *
 * **`fusion x` is spelled out, because the move to it went unnoticed here.**
 * When this repository's checks moved under `fusion x`, the pattern stopped
 * matching three of them, and the floor spawned the whole prose, spec, and
 * workspace rule sets a second time.
 */
export const DELEGATED = /\b(?:fusion(?: x)?|helix) (?:workspace|component|prose|spec|theme)\b/

/**
 * **A prerequisite is not a check.** A script builds what it reads before
 * reading it, `turbo run frame && bun ...`, and the build's summary line counts
 * cache hits: a cold cache prints `0 cached`, which read as a check that
 * counted nothing. A `turbo run` step is a check when it passes `-- --check` or
 * runs a `-check` task, and a prerequisite otherwise.
 */
export const prerequisite = (one) =>
  one.startsWith('turbo run ') && !one.includes('-- --check') && !/^turbo run \S*-check\b/.test(one)

/** Whether the floor reads a command's success line. */
export const floored = (one) =>
  !EXEMPT.includes(bare(one)) && !DELEGATED.test(one) && !prerequisite(one)

/**
 * The line a command closed on, and the integers in it, or `undefined` when it
 * said nothing countable. A zero among them is a check that passed while
 * counting nothing.
 */
export const tally = (output) => {
  /* **The runner's own last word is not the check's.** A script that delegates
     with `--filter` has `@scope/name script: Exited with code 0` appended by
     bun after the output it ran, and reading the last line then reads bun's
     zero as the check's tally. Every one of the seven delegating checks
     reported passing while counting nothing, which is the floor's own failure
     mode landing on the floor. */
  const spoken = output
    .split('\n')
    .map((one) => one.trim())
    .filter(Boolean)
    .filter((one) => !/^\S+ \S+: Exited with code \d+$/.test(one))

  /* **A task runner's last word is not the check's, and turbo's is a
     stopwatch.** `turbo run routes -- --check` ends with `Time: 379ms`, so the
     last line carried one non-zero integer and every turbo-wrapped check passed
     on an elapsed millisecond count rather than on its own tally. Seven of the
     eleven were floored on nothing, which is the same fault the note above
     records about bun's exit line, one runner along.

     Turbo prefixes what a task printed with `@scope/package:task: `, so where
     any line carries that prefix the check's own words are the ones with it,
     and the summary block underneath is turbo talking about itself. */
  const prefixed = spoken.filter((one) => /^@[^\s:]+:[^\s:]+: /.test(one))
  const line = (prefixed.length > 0 ? prefixed : spoken).at(-1)?.replace(/^@[^\s:]+:[^\s:]+: /, '')
  if (!line) {
    return undefined
  }
  const numbers = [...line.matchAll(/\b(\d+)\b/g)].map((match) => Number(match[1]))
  return numbers.length === 0 ? undefined : { line, numbers }
}
