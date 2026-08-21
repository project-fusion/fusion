#!/usr/bin/env node
/**
 * Runs every other check and refuses a success line that counts nothing.
 *
 * **A check that silently stops checking reads exactly like a check that
 * passes.** `check:art` held the number words in the gallery prose against the
 * real family count, and its pattern ran `forty` through `seventy` and stopped
 * matching the day the catalog passed seventy-nine. It went on printing
 * `art: 85 families, every one drawn, and the prose agrees` for two families'
 * worth of drift, because eighty-five families were still being *looked at*.
 *
 * That is the trap this is for, and it is a specific one: the number a check
 * reports has to be the number of things it *tested*, not the number it walked
 * past. A corpus size is reassuring and proves nothing.
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
 * `check:art` would have survived this. The only real defence there is that
 * each check counts its assertions, which is a property of how each one is
 * written and not something another script can impose.
 *
 * Run with `bun run check:floors` (also part of `bun run verify`).
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts ?? {}
const checks = Object.keys(scripts)
  .filter((name) => name.startsWith('check:'))
  // Itself, and the two that compare generated files rather than counting a corpus.
  .filter((name) => !['check:floors', 'check:reference', 'check:tokens-reference'].includes(name))

const problems = []
for (const name of checks) {
  let output = ''
  try {
    output = execFileSync('bun', ['run', name], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    // The check itself failed, which is its own report to make and not this one's.
    continue
  }
  const line = output
    .split('\n')
    .map((one) => one.trim())
    .filter(Boolean)
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
