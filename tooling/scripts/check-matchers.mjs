#!/usr/bin/env node
/**
 * Every matcher a spec reaches for exists in the browser harness.
 *
 * **This is the third time and the first check.** `bun test` runs the DOM specs
 * under happy-dom with `bun:test`'s `expect`, which has every matcher there is.
 * `bun run specs:browser` runs the same files through the hand-written harness
 * in `tooling/testing/src/browser.ts`, which has the dozen somebody needed. A
 * spec written against the first type-checks, passes locally, and dies in the
 * second on a name that object never had.
 *
 * `browser.ts` says so in its own comment: three of six failures in its first
 * run were exactly this. Then `toBeCloseTo` arrived with the charts and nine
 * geometry assertions started throwing instead of asserting. A rule stated in a
 * comment beside the thing it governs is the version of this that has already
 * been tried.
 *
 * **A missing matcher is worse than a failing assertion, because it looks like
 * one.** `TypeError: B(...).toBeCloseTo is not a function` is reported as a
 * failed test, so the suite is red and the count is right and the reason is
 * wrong: the arc length was never compared to anything. Nine facts about arcs
 * and slot centres were unchecked in the only engine that computes them, and
 * the report said they had been checked and failed.
 *
 * **And the pressure is to write the spec around it, which is the real cost.**
 * `dialog-root.dom.spec.ts` carried a comment saying it could not use
 * `not.toThrow` because the harness lacked it, so the assertion that the press
 * survived was left unwritten and the one after it carried the meaning alone. A
 * spec shaped by its harness's gaps stops saying what it meant, quietly, and
 * nothing about it looks wrong afterwards.
 *
 * **What it reads.** Every `.dom.spec.ts` under `helix/`, for names in the
 * matcher position: after `expect(...)` or `.not.`. That is what makes it
 * different from grepping for `to[A-Z]`, which finds `toLowerCase` and
 * `toString` on ordinary values and would need an ignore list that grows.
 *
 * **What it cannot see**, said plainly. A matcher called through a variable, a
 * helper that takes a matcher name, or anything built at run time. Nothing in
 * this repository does that, and if something starts, this check goes quiet
 * rather than wrong, which is the failure direction to prefer.
 *
 * Run with `bun run check:matchers` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SPECS = 'helix'
const HARNESS = 'tooling/testing/src/browser.ts'

/** Every `*.dom.spec.ts`, which is the set `specs:browser` bundles and runs. */
const specs = (root) => {
  const found = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === 'dist') {
        continue
      }
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) {
        walk(path)
      } else if (entry.endsWith('.dom.spec.ts')) {
        found.push(path)
      }
    }
  }
  walk(root)
  return found
}

/* The interface, not the object literal: it is the declaration the harness has
   to satisfy, so a name typed there and never implemented is TypeScript's
   problem rather than this script's, and reading one list keeps the two from
   disagreeing about which is authoritative. */
const harness = readFileSync(HARNESS, 'utf8')
const declared = new Set(
  [...harness.matchAll(/^ {2}(to[A-Za-z]+)(\??):/gm)].map((one) => one[1]),
)
if (declared.size === 0) {
  console.error(`matchers: read no matcher names out of ${HARNESS}, so this checked nothing.`)
  process.exit(1)
}

/* In the matcher position and nowhere else. `expect(anything).toX` and
   `.not.toX`, which together are every way a matcher is reached, and neither of
   which matches `value.toLowerCase()`. */
const CALLED = /(?:\)\s*\.|\.not\s*\.)(to[A-Z][A-Za-z]*)\s*\(/g

const problems = []
let asserted = 0

for (const file of specs(SPECS)) {
  const text = readFileSync(file, 'utf8')
  const seen = new Map()
  for (const match of text.matchAll(CALLED)) {
    asserted += 1
    if (!declared.has(match[1]) && !seen.has(match[1])) {
      seen.set(match[1], text.slice(0, match.index).split('\n').length)
    }
  }
  for (const [name, line] of seen) {
    problems.push(
      `${file}:${line}: calls \`${name}\`, which the browser harness does not implement. Under ` +
        'happy-dom this passes, and in a real engine it is a `TypeError` reported as a failed ' +
        `assertion: the thing it meant to compare is never compared. Add it to \`${HARNESS}\` ` +
        'rather than rewriting the spec around it.',
    )
  }
}

if (problems.length > 0) {
  console.error(
    `Matchers the browser harness does not have (${problems.length}):\n\n  ${problems.join('\n\n  ')}\n`,
  )
  process.exit(1)
}

console.log(
  `matchers: ${asserted} assertions across the DOM specs, every one of them a matcher both runners have`,
)
