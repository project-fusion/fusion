#!/usr/bin/env node
/**
 * Refuses a TypeScript or Rust file longer than 400 lines, unless it is on
 * the list of files that already were.
 *
 * **One check for both languages, with a list.** Biome's
 * `noExcessiveLinesPerFile` keeps no baseline, and Clippy holds each Rust
 * function but not a file. The files over the limit when the rule arrived are
 * listed in `long-files.json`, and the list only shrinks: `lib/lengths.mjs`
 * says how.
 *
 * **What is read.** Every tracked `.ts`, `.tsx` and `.rs` file. A generated
 * module (`.generated.ts`), a stylesheet module (`.css.ts`) and a declaration
 * file (`.d.ts`) are left out: their length comes from what they are
 * generated from or declare.
 *
 *   bun fusion/scripts/check-lengths.mjs
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { judge, LIMIT, lines } from '@fusion.dev/scripts/lengths'
import { root } from '@fusion.dev/scripts/workspace'

const LIST = 'fusion/scripts/long-files.json'

const tracked = execFileSync('git', ['ls-files', '-z', '*.ts', '*.tsx', '*.rs'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 1 << 28,
})
  .split('\0')
  .filter((path) => path !== '' && !/\.(generated|css|d)\.ts$/.test(path))

const lengths = new Map(
  tracked.map((path) => [path, lines(readFileSync(join(root, path), 'utf8'))]),
)
const listed = JSON.parse(readFileSync(join(root, LIST), 'utf8')).files
const { held, off, over } = judge(lengths, listed)

if (over.length > 0 || off.length > 0) {
  for (const { count, path } of over) {
    console.error(`${path}: ${count} lines, over the ${LIMIT} a file may have. Split it.`)
  }
  for (const path of off) {
    console.error(`${path}: no longer over ${LIMIT} lines. Take it off ${LIST}.`)
  }
  process.exit(1)
}

/* The list's count only where it has one: the floor reads a zero as a check
   that counted nothing. */
console.log(
  `lengths: ${held} TypeScript and Rust files hold to ${LIMIT} lines${
    listed.length > 0 ? `, and ${listed.length} listed in ${LIST} may stay longer` : ''
  }`,
)
