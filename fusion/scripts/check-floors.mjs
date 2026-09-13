#!/usr/bin/env node
/**
 * Runs the checks no CLI floors, and refuses a success line that counts nothing.
 *
 * **A check that silently stops checking reads exactly like a check that
 * passes.** `fusion prose`'s `art` held the number words in the gallery prose against
 * the real family count with a pattern running `forty` through `seventy`, and
 * once the catalog passed seventy-nine it matched nothing while still printing
 * `art: 85 families, every one drawn, and the prose agrees`, because eighty-five
 * families were still being *looked at*.
 *
 * So the number a check reports has to be the number of things it *tested*, not
 * the number it walked past. A corpus size is reassuring and proves nothing.
 *
 * So this runs each check and reads the integers out of its success line. A
 * zero anywhere in that line is a failure, on the grounds that a check with
 * nothing to say should not be saying it passed. It is a floor rather than a
 * baseline: comparing against committed numbers would fail every time a
 * component is deleted, and the failure worth catching is the fall to nothing,
 * not the fall by one.
 *
 * **What it cannot catch, said plainly.** A check whose corpus is intact and
 * whose predicate has gone stale still reports its corpus and still passes.
 * `fusion prose`'s `art` would have survived this. The only real defense there is that
 * each check counts its assertions, which is a property of how each one is
 * written and not something another script can impose.
 *
 * **What it no longer runs is most of what it used to.** Every check that
 * delegates to `fusion` or `helix` is floored in process by that CLI's own
 * `floors` rule, which reads each rule's count rather than parsing an integer
 * out of a sentence. Running those here as well would spawn the whole rule set
 * a second time to learn what the first run already knew, which is the argument
 * this file already makes about not running the group checks.
 *
 * So what is left is the generators: a `--check` that compares a committed file
 * against a fresh derivation. Those are scripts rather than rules, they report
 * a tally in prose, and this is the only thing reading it.
 *
 * Run with `bun run check:spec:floors` (also part of `bun run verify`).
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts ?? {}

/**
 * Every command `check` actually runs, found by walking it rather than by
 * recognizing script names.
 *
 * **This read name shapes until 29 Aug 2026, and lost most of its corpus
 * without saying so.** It took every script with two colons in it, on the
 * reasoning that a name that deep is a leaf and its parent is the group. When the
 * generator wrappers were replaced by `turbo run <task> -- --check` written
 * inline, seven leaves stopped being scripts and this stopped being able to see
 * them: ten checks became three, and it went on printing a success line,
 * because three checks that counted something is what it had been asked to
 * verify.
 *
 * That is this file's own failure landing on this file, for the second time.
 * The docblock above records the first, where a runner's exit line was read as
 * a check's tally.
 *
 * A name is a fact about how somebody wrote a script; the command tree is what
 * runs. So `check` is expanded through `&&` and through every `bun run` naming
 * another script, and what comes out the bottom is commands.
 */
const expand = (command, seen = new Set()) => {
  const step = command.trim()
  const named = /^bun run ([\w:-]+)$/.exec(step)
  if (named && scripts[named[1]] && !seen.has(named[1])) {
    return scripts[named[1]].split('&&').flatMap((one) => expand(one, new Set([...seen, named[1]])))
  }
  return [step]
}

/**
 * What this does not run, and why each one is out.
 *
 * Matched against the command rather than against a script name, because a name
 * is what just went missing. `turbo run samples -- --check` is the same work
 * whether or not anybody wrapped it in a script.
 *
 * **The runner is stripped before comparing, and that is not tidiness.** These
 * were literal strings carrying `node `, so moving the repository to bun left
 * three of them matching nothing: this file spawned *itself*, recursing until
 * the job hit its twenty-minute timeout, and the two browser checks ran in this
 * shard as well as in the jobs built for them. A list that has to be edited
 * whenever a command is respelled is a list that will be wrong again.
 */
const bare = (command) => command.replace(/^(?:node|bun) /, '')
const EXEMPT = [
  /* Itself. */
  'fusion/scripts/check-floors.mjs',
  /* The five that `verify.yml` gives their own `browser` jobs. Running them
     here too makes one shard render the entire browser matrix a second time,
     single file, while the six jobs built for it sit idle, and that shard then
     sets the critical path for the whole workflow. `check-dsd` is the costliest
     of them: its corpus hydrates every example, and run from here it took
     `verify` from a few minutes to half an hour.

     The floor they lose is real and is the cheaper half of the trade: each
     already fails loudly on an empty corpus, because rendering nothing and
     comparing nothing is what they are, whereas a static check that walks an
     empty directory reports a confident zero. */
  'fusion/scripts/check-contrast.mjs',
  'fusion/scripts/check-diagnostics.mjs',
  'fusion/scripts/check-dsd.mjs',
  'fusion/scripts/check-visual.mjs',
  'fusion/scripts/check-visual-parity.mjs',
  /* The three that compare a committed file against a fresh derivation of the
     whole corpus. What guards a generator is that its output is committed and
     read; running these here would measure every family a second time for
     fifteen seconds and learn nothing the first run did not. */
  'fusion/scripts/build-metrics.mjs --check',
]

/** Floored in process by the CLI that runs them: a rule returns its count and
    the `floors` rule beside it reads that count, so spawning the command here
    to read the same number out of a sentence is the whole suite again for
    nothing. */
const DELEGATED = /\b(?:fusion|helix) (?:workspace|component|prose|spec|theme)\b/

const checks = [...new Set(expand('bun run check'))].filter(
  (one) => !EXEMPT.includes(bare(one)) && !DELEGATED.test(one),
)

/* **A floor with nothing under it is what this file exists to refuse**, so it
   refuses its own. Reached by renaming `check`, by collapsing it, or by any
   edit that leaves the walk with nowhere to go. No number is asserted: the
   failure worth catching is the fall to nothing, which is the same rule applied
   to every check below. */
/* **An exemption that matches nothing is the failure this file just had**, so
   it refuses one. A stale entry is silent in the direction that costs most: the
   command it meant to exclude runs anyway, and here that meant this file
   spawning itself until the job timed out. */
const walked = new Set([...new Set(expand('bun run check'))].map(bare))
const dead = EXEMPT.filter((one) => !walked.has(one))
if (dead.length > 0) {
  console.error(
    `floors: ${dead.length} exemption${dead.length === 1 ? '' : 's'} match no command that \`check\` reaches.\n` +
      'Either the command was respelled, or it is gone and the exemption should be too.\n' +
      dead.map((one) => `  ${one}`).join('\n'),
  )
  process.exit(1)
}

if (checks.length === 0) {
  console.error(
    'floors: walking `check` found no command to floor, so this would have\n' +
      'passed while testing nothing. Either `check` no longer names its groups,\n' +
      'or every command it reaches is now exempt.',
  )
  process.exit(1)
}

const problems = []
/* **`node_modules/.bin` on the path, because a script gets it and a spawn does
   not.** These commands were written to be run by the package manager, which
   puts the workspace's binaries in front; spawned bare, `turbo` is not a program
   and seven of the eleven threw `ENOENT` straight into the catch below. */
const PATH = `${join(process.cwd(), 'node_modules/.bin')}:${process.env.PATH ?? ''}`

let floored = 0
for (const name of checks) {
  let output = ''
  try {
    const [command, ...rest] = name.split(/\s+/)
    output = execFileSync(command, rest, {
      encoding: 'utf8',
      env: { ...process.env, PATH },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    /* **A check that failed is its own report; a check that could not be
       started is this one's.** Both arrive here as an exception and they are
       not the same event: the first is a real finding somebody will see, and
       the second is this file quietly testing nothing while counting it as
       tested. That is what happened when `turbo` was not on the path.

       `status` is null exactly when no process ran. */
    if (error.status === null || error.code === 'ENOENT') {
      problems.push(`${name}: could not be run at all (${error.code ?? 'no exit status'}).`)
    }
    continue
  }
  /* **The runner's own last word is not the check's.** A script that delegates
     with `--filter` has `@scope/name script: Exited with code 0` appended by
     bun after the output it ran, and reading the last line then reads bun's
     zero as the check's tally. Every one of the seven delegating checks
     reported passing while counting nothing, which is this file's own failure
     mode landing on this file. */
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
    continue
  }
  const numbers = [...line.matchAll(/\b(\d+)\b/g)].map((match) => Number(match[1]))
  if (numbers.length === 0) {
    continue
  }
  floored += 1
  if (numbers.some((value) => value === 0)) {
    problems.push(`${name}: passed while counting nothing. It said "${line}".`)
  }
}

if (problems.length > 0) {
  console.error(
    `Checks that passed on an empty scan (${problems.length}):\n\n  ${problems.join('\n  ')}\n`,
  )
  process.exit(1)
}

/* **The number reported is the number floored, not the number listed**, which
   is the rule this file exists to impose, applied to its own success line. They
   were the same figure until a command failed to spawn and was counted anyway. */
console.log(`floors: ${floored} checks run, every one of them counted something`)
