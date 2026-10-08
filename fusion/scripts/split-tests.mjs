#!/usr/bin/env bun
/**
 * Runs one package's matching spec files in several `bun test` processes at
 * once, and fails when any of them fails or runs a different set of files.
 *
 *   split-tests <filter> [bun test flags...]
 *   split-tests dom.spec --conditions helix-development
 *
 * **`bun test` runs every file in one process, one after another.** The
 * headless tier's DOM specs are 305 files and most of a two-minute `tests` job
 * on a two-core runner, with the second core idle. The pinned Bun has no flag
 * to spread them, so this script finds the files the filter matches, deals
 * them into one group per core, and runs a process per group.
 *
 * **The files are the ones `bun test <filter>` runs.** Bun treats a file as a
 * spec by its name, `.test.` or `.spec.` or the `_test` and `_spec` forms, and
 * then keeps the paths that contain the filter. This script does the same
 * below the working directory, outside `node_modules`. A matching spec under a
 * directory whose name starts with a dot stops the run with an error, because
 * that is the one place where Bun and this script could disagree about what
 * runs.
 *
 * **Each group is passed as paths, and each process has to report exactly
 * those.** A leading `./` makes Bun read an argument as a file path, so
 * `button` cannot also match `toggle-button`. The file count Bun prints at the
 * end is checked against the group, so a file that runs twice, or not at all,
 * fails the run.
 *
 * **Dealt by size, largest first, onto the lightest group so far.** A spec
 * file's size is a fair stand-in for its run time, and it needs nothing
 * recorded: the largest file is a twentieth of the whole.
 */
import { spawn } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { join, relative } from 'node:path'

const [filter, ...flags] = process.argv.slice(2)
if (!filter) {
  console.error('split-tests: needs a filter, the argument `bun test` would take')
  process.exit(1)
}

const SPEC = /(\.|_)(test|spec)\.(c|m)?(j|t)sx?$/

/** Every spec file below `dir` whose path holds the filter. */
const found = []
const hidden = []
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') {
      continue
    }
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(path)
    } else if (SPEC.test(entry.name) && relative(process.cwd(), path).includes(filter)) {
      if (
        relative(process.cwd(), path)
          .split('/')
          .some((part) => part.startsWith('.'))
      ) {
        hidden.push(path)
      } else {
        found.push(path)
      }
    }
  }
}
walk(process.cwd())

if (hidden.length > 0) {
  console.error(
    `split-tests: ${hidden.length} spec files are under a directory starting with a dot, ` +
      `where this and \`bun test\` may not agree on what runs:\n  ${hidden.join('\n  ')}`,
  )
  process.exit(1)
}
if (found.length === 0) {
  console.error(`split-tests: no spec file below ${process.cwd()} matches ${filter}`)
  process.exit(1)
}

/* No more processes than files, and no more than the machine runs at once:
   each one is a whole DOM, and a third on two cores only waits its turn. */
const count = Math.max(1, Math.min(availableParallelism(), found.length))
const groups = Array.from({ length: count }, () => ({ files: [], weight: 0 }))
for (const file of found
  .map((path) => ({ path, size: statSync(path).size }))
  .sort((a, b) => b.size - a.size || (a.path < b.path ? -1 : 1))) {
  const lightest = groups.reduce((low, group) => (group.weight < low.weight ? group : low))
  lightest.files.push(`./${relative(process.cwd(), file.path)}`)
  lightest.weight += file.size
}

const run = (group, index) =>
  new Promise((done) => {
    const started = performance.now()
    const child = spawn(process.execPath, ['test', ...flags, ...group.files.sort()], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    child.stdout.on('data', (chunk) => {
      output += chunk
    })
    child.stderr.on('data', (chunk) => {
      output += chunk
    })
    child.on('close', (code, signal) => {
      done({
        code,
        files: group.files.length,
        index,
        output,
        seconds: ((performance.now() - started) / 1000).toFixed(1),
        signal,
      })
    })
  })

const results = await Promise.all(groups.map(run))

let failed = false
for (const result of results) {
  console.log(`\n=== split-tests: group ${result.index + 1} of ${count}, ${result.files} files`)
  process.stdout.write(result.output)
  /* Bun's last line: `Ran 4854 tests across 305 files. [96.12s]`. */
  const ran = /Ran (\d+) tests? across (\d+) files?/.exec(result.output)
  if (result.code !== 0) {
    failed = true
    console.error(
      `split-tests: group ${result.index + 1} exited ${result.code ?? result.signal} after ${result.seconds}s`,
    )
  } else if (!ran || Number(ran[2]) !== result.files) {
    failed = true
    console.error(
      `split-tests: group ${result.index + 1} was given ${result.files} files and ` +
        `${ran ? `ran ${ran[2]}` : 'did not say how many it ran'}`,
    )
  }
}

const total = results.reduce((sum, result) => {
  const ran = /Ran (\d+) tests? across/.exec(result.output)
  return sum + (ran ? Number(ran[1]) : 0)
}, 0)
console.log(
  `\nsplit-tests: ${found.length} files matching ${filter} in ${count} processes, ${total} tests, ` +
    results.map((result) => `${result.seconds}s`).join(' and '),
)
process.exit(failed ? 1 : 0)
