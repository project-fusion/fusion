#!/usr/bin/env node
/**
 * Runs the checks no CLI floors, and refuses a success line that counts nothing.
 *
 * **A check that silently stops checking reads exactly like a check that
 * passes.** `fusion x prose`'s `art` held the number words in the gallery prose against
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
 * `fusion x prose`'s `art` would have survived this. The only real defense there is that
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
 * against a fresh derivation. Those are scripts rather than rules, and they
 * report a tally in prose.
 *
 * **And the `checks` shards read most of those.** They run `verify`'s checks
 * and hold what each one printed, so they floor it there, and this runs only
 * what `check` reaches and no shard runs. Spawning the rest again here, one
 * after another, was the longest job in `verify`. The rule, its exemptions,
 * and its reasons are in `lib/checks.mjs`, which both read.
 *
 * Run with `bun run check:spec:floors` (also part of `bun run verify`).
 */
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { bare, EXEMPT, expand, floored, sharded, tally } from '@fusion.dev/scripts/checks'

const reached = [...new Set(expand('bun run check'))]
const checks = reached.filter(floored)

/* **What the shards already floor is left to them**, matched on the command so
   a check wrapped differently in `check` and in `verify` is still one check. */
const inShards = new Set(sharded().flatMap((step) => expand(step)))
const here = checks.filter((one) => !inShards.has(one))

/* **A floor with nothing under it is what this file exists to refuse**, so it
   refuses its own. Reached by renaming `check`, by collapsing it, or by any
   edit that leaves the walk with nowhere to go. No number is asserted: the
   failure worth catching is the fall to nothing, which is the same rule applied
   to every check below. */
/* **An exemption that matches nothing is the failure this file just had**, so
   it refuses one. A stale entry is silent in the direction that costs most: the
   command it meant to exclude runs anyway, and here that meant this file
   spawning itself until the job timed out. */
const walked = new Set(reached.map(bare))
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

let counted = 0
for (const name of here) {
  let output = ''
  try {
    const [command, ...rest] = name.split(/\s+/)
    output = execFileSync(command, rest, {
      encoding: 'utf8',
      env: { ...process.env, PATH },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    /* **A check that failed is a finding, and this is its only report.** What
       a shard runs it reports itself; what is left here runs nowhere else in
       CI, so a failure read as somebody else's report is a failure nobody
       sees. A command that could not be started is named as that, which is
       the cause the log would otherwise hide: `turbo` not on the path once
       made this test nothing while counting it as tested.

       `status` is null exactly when no process ran. */
    problems.push(
      error.status === null || error.code === 'ENOENT'
        ? `${name}: could not be run at all (${error.code ?? 'no exit status'}).`
        : `${name}: failed.\n${error.stderr || error.stdout || ''}`.trimEnd(),
    )
    continue
  }
  const said = tally(output)
  if (!said) {
    continue
  }
  counted += 1
  if (said.numbers.includes(0)) {
    problems.push(`${name}: passed while counting nothing. It said "${said.line}".`)
  }
}

if (problems.length > 0) {
  console.error(
    `Checks that failed or passed on an empty scan (${problems.length}):\n\n  ${problems.join('\n  ')}\n`,
  )
  process.exit(1)
}

/* **The number reported is the number floored, not the number listed**, which
   is the rule this file exists to impose, applied to its own success line. They
   were the same figure until a command failed to spawn and was counted anyway. */
const shards = checks.length - here.length
console.log(
  here.length === 0
    ? `floors: the shards floor all ${shards} commands \`check\` reaches that a floor reads`
    : `floors: ${counted} checks run, every one of them counted something, and the shards floor ${shards}`,
)
