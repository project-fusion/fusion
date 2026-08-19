#!/usr/bin/env node
/**
 * A controlled property must be rejected without an answer, and allowed with one.
 *
 * `helix-controlled-props` intersects each controlled tag with a union, so
 * `<helix-input value="Ada">` is a type error unless something answers the
 * change. That constraint is generated, several steps from anything a person
 * edits, and it is the kind of thing that fails by doing nothing: the first
 * version of the plugin matched only single-line tag entries, which is 24 of
 * 194, so it covered an eighth of the library, emitted no warning and passed
 * every check in the repository.
 *
 * So this runs `tsc` over `tooling/fixtures/controlled-props.tsx` and compares
 * the diagnostics against the `@expect` lines in it. **Both directions are
 * checked**, and the second is the one worth the script:
 *
 * - a line marked `@expect TS2322` that stops erroring means the constraint has
 *   quietly stopped constraining, and a consumer finds out through a control
 *   that ignores every keystroke;
 * - a line with no marker that starts erroring means it has grown too strict,
 *   and a consumer finds out through a library that will not let them write
 *   correct code. The fixture holds the two patterns that legitimately declare
 *   ownership without a handler prop, a ref-bound listener and a route-owned
 *   `active`, because both are real and both are in this repository.
 *
 * **Replaces two `@ts-expect-error` directives**, which asserted the same thing
 * one direction at a time and were satisfied by *any* error on the line: a
 * misspelled tag name would have kept them green. This asserts the code.
 *
 * Run with `bun run check:controlled` (also part of `bun run verify`).
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const FIXTURE = 'tooling/fixtures/controlled-props.tsx'
const PROJECT = 'tooling/fixtures/tsconfig.json'

/** `path(line,col): error TSxxxx:` and nothing indented under it. */
const DIAGNOSTIC = /^(.+?)\((\d+),\d+\): error (TS\d+):/

/**
 * What each marked line must report.
 *
 * The marker sits above the line it describes, so an expectation is recorded
 * against the next line. Written that way rather than by line number so moving
 * a case around cannot silently point the assertion at its neighbour.
 */
const expected = new Map()
const lines = readFileSync(FIXTURE, 'utf8').split('\n')
for (const [index, line] of lines.entries()) {
  const marker = line.match(/^\/\/ @expect (TS\d+)$/)
  if (marker) {
    expected.set(index + 2, marker[1])
  }
}

if (expected.size === 0) {
  /* Loud rather than empty, for the reason `check:events` gives: read the other
     way, an unparsed fixture produces no expectations, every diagnostic looks
     unexpected, and a total failure reports as a different total failure. */
  console.error(
    `controlled: no \`@expect\` markers found in ${FIXTURE}, so nothing could be checked`,
  )
  process.exit(1)
}

const run = spawnSync('node_modules/.bin/tsc', ['-p', PROJECT], { encoding: 'utf8' })
const output = `${run.stdout ?? ''}${run.stderr ?? ''}`

const reported = new Map()
for (const line of output.split('\n')) {
  const match = line.match(DIAGNOSTIC)
  if (match?.[1].endsWith('controlled-props.tsx')) {
    reported.set(Number(match[2]), match[3])
  }
}

if (reported.size === 0 && run.status !== 0) {
  // tsc failed without reporting anything against the fixture, which is a
  // broken project rather than a passing check.
  console.error(
    `controlled: tsc exited ${run.status} with no diagnostics for ${FIXTURE}:\n${output}`,
  )
  process.exit(1)
}

const problems = []

for (const [line, code] of expected) {
  const got = reported.get(line)
  if (got === undefined) {
    problems.push(
      `${FIXTURE}:${line} was expected to report ${code} and reported nothing. ` +
        'The controlled-property constraint is not reaching this element, so declaring ' +
        'ownership without answering it now compiles. Check `helix-controlled-props` ' +
        'still matches the tag entries the JSX generator writes.',
    )
  } else if (got !== code) {
    problems.push(`${FIXTURE}:${line} was expected to report ${code} and reported ${got}.`)
  }
}

for (const [line, code] of reported) {
  if (!expected.has(line)) {
    problems.push(
      `${FIXTURE}:${line} reported ${code} and was expected to compile: ${lines[line - 1]?.trim()}. ` +
        'The constraint rejects a pattern that is correct, which reaches a consumer as a ' +
        'library that will not let them write working code.',
    )
  }
}

if (problems.length > 0) {
  console.error(`Controlled-property constraint is wrong (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

console.log(
  `controlled: ${expected.size} rejected without an answer, ` +
    `${lines.filter((line) => line.startsWith('const ')).length - expected.size} allowed with one`,
)
