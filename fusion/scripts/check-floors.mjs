#!/usr/bin/env node
/**
 * Runs the checks no CLI floors, and refuses a success line that counts nothing.
 *
 * **A check that silently stops checking reads exactly like a check that
 * passes.** `check:prose:art` held the number words in the gallery prose against
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
 * `check:prose:art` would have survived this. The only real defense there is that
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

const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts ?? {}
const checks = Object.keys(scripts)
  /* Leaf checks only. `check:css` and its five siblings run every member of
     their group, so counting them here would run the whole suite once more per
     group, six times over, inside the one script whose job is to run it once. */
  .filter((name) => name.split(':').length === 3)
  /* Itself; the two that compare generated files rather than counting a corpus;

     `check:gen:metrics` is the third of the generated-file comparisons and is
     exempt with them, even though its line does carry a real tally. What
     guards a generator is that its output is committed and read, the same
     defense `check:gen:reference` and `check:gen:tokens-reference` have; running it
     here would measure every family a second time for fifteen seconds and
     learn nothing the first run did not. */

  /* The four that `verify.yml` gives their own `browser` jobs. Running them
     here too makes one shard render the entire browser matrix a second time,
     single file, while the six jobs built for it sit idle, and that shard then
     sets the critical path for the whole workflow.

     The floor they lose is real and it is the cheaper half of the trade: each
     of the four already fails loudly on an empty corpus, because rendering
     nothing and comparing nothing is what they are, whereas a static check
     that walks an empty directory reports a confident zero. */
  /* Floored in process by the CLI that runs them. A rule returns its count and
     the `floors` rule beside it reads that count, so spawning the command here
     to read the same number out of a sentence is the whole suite again for
     nothing. */
  .filter((name) => !/\b(?:fusion|helix) (?:workspace|component|prose|spec|theme)\b/.test(scripts[name]))
  .filter(
    (name) =>
      ![
        'check:css:contrast',
        'check:spec:diagnostics',
        'check:spec:floors',
        'check:gen:metrics',
        'check:gen:reference',
        'check:gen:tokens-reference',
        'check:spec:visual',
        'check:spec:visual-parity',
      ].includes(name),
  )

const problems = []
for (const name of checks) {
  let output = ''
  try {
    output = execFileSync('bun', ['run', name], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (_error) {
    // The check itself failed, which is its own report to make and not this one's.
    continue
  }
  /* **The runner's own last word is not the check's.** A script that delegates
     with `--filter` has `@scope/name script: Exited with code 0` appended by
     bun after the output it ran, and reading the last line then reads bun's
     zero as the check's tally. Every one of the seven delegating checks
     reported passing while counting nothing, which is this file's own failure
     mode landing on this file. */
  const line = output
    .split('\n')
    .map((one) => one.trim())
    .filter(Boolean)
    .filter((one) => !/^\S+ \S+: Exited with code \d+$/.test(one))
    .at(-1)
  if (!line) {
    continue
  }
  const numbers = [...line.matchAll(/\b(\d+)\b/g)].map((match) => Number(match[1]))
  if (numbers.length === 0) {
    continue
  }
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

console.log(`floors: ${checks.length} checks run, every one of them counted something`)
