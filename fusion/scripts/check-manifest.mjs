#!/usr/bin/env node
/**
 * Holds the Rust manifest generator to the analyzer's output, byte for byte.
 *
 * **The manifest is not one file's problem.** Every reference page, all three
 * sets of framework typings, sixty component rules, the prose checks and the
 * eval corpus are derived from `custom-elements.json`, so a generator that
 * says almost the same thing moves all of them at once. The four files in this
 * repository are what `@custom-elements-manifest/analyzer` wrote, and this
 * regenerates each with `helix manifest build` and compares the bytes.
 *
 * **Bytes rather than meaning, which is the whole point of it.** `helix
 * manifest diff` already compares what two manifests say, and it is the right
 * tool while a rule is being worked out. What it cannot see is the order the
 * keys are in, and that order is not a choice: it is a trace of the analyzer's
 * own execution, where a list the class filled leads and one it was given
 * trails, and a method's signature lands before or after the stamp depending
 * on which kind of thing gave the method. A comparison that ignores it would
 * let the generator drift back into writing a file that means the same and
 * reads as eighty thousand moved lines.
 *
 * **Each tier is generated from the ancestors as they are committed**, which
 * is what the analyzer does: it reads its dependencies' published manifests
 * rather than deriving them. So a wrong `core` makes `headless` wrong too, and
 * the first failure is the one to read.
 *
 * The tier is read from each package's `cem.config.ts` and the dependencies
 * from its `package.json`, because those are where the analyzer reads them and
 * a list here would be a second place to keep right.
 *
 * Run with `bun run check:manifest` (also part of `bun run check:cli`).
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const MANIFEST = 'custom-elements.json'

/** The helix packages that ship a manifest, with what each needs to build one. */
const shipped = readdirSync('helix', { withFileTypes: true })
  .filter((one) => one.isDirectory())
  .map((one) => join('helix', one.name))
  .filter((at) => existsSync(join(at, MANIFEST)) && existsSync(join(at, 'cem.config.ts')))
  .sort()

const named = new Map(
  shipped.map((at) => [JSON.parse(readFileSync(join(at, 'package.json'), 'utf8')).name, at]),
)

/** What `cem.config.ts` says this package ships, which the CLI takes as a flag. */
const tierOf = (at) => {
  const said = readFileSync(join(at, 'cem.config.ts'), 'utf8').match(/tier:\s*'([a-z]+)'/)
  if (said === null) {
    throw new Error(`${at}/cem.config.ts declares no tier`)
  }
  return said[1]
}

let compared = 0
const failed = []

for (const at of shipped) {
  const dependencies = Object.keys(
    JSON.parse(readFileSync(join(at, 'package.json'), 'utf8')).dependencies ?? {},
  )
    .filter((one) => named.has(one))
    .flatMap((one) => ['--dependency', `${one}=${join(named.get(one), MANIFEST)}`])

  const built = spawnSync(
    'bun',
    ['helix/cli/npm/bin.mjs', 'manifest', 'build', at, '--tier', tierOf(at), ...dependencies],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 * 128 },
  )
  if (built.status !== 0) {
    failed.push(`${at}: the generator exited ${built.status}\n${built.stderr?.trim() ?? ''}`)
    continue
  }

  compared += 1
  const committed = readFileSync(join(at, MANIFEST), 'utf8')
  if (built.stdout === committed) {
    continue
  }

  /* The first line that differs, because a reader wants the place rather than
     the count: the rest of the file is usually the same difference repeated. */
  const mine = built.stdout.split('\n')
  const theirs = committed.split('\n')
  const at_ = mine.findIndex((one, index) => one !== theirs[index])
  failed.push(
    [
      `${at}: the generated manifest is not what the analyzer wrote`,
      `  first at line ${at_ + 1} of ${theirs.length}`,
      `  analyzer  ${(theirs[at_] ?? '<end of file>').trim().slice(0, 120)}`,
      `  generated ${(mine[at_] ?? '<end of file>').trim().slice(0, 120)}`,
    ].join('\n'),
  )
}

if (failed.length > 0) {
  for (const one of failed) {
    console.error(`x ${one}`)
  }
  console.error(
    '\nRun `helix manifest diff <package>/custom-elements.json <(helix manifest build <package> …)`',
  )
  console.error('to see what the two disagree about, or read the order rules in')
  console.error('`helix/cli/src/manifest/order.rs`, which say why the keys sit where they do.')
  process.exit(1)
}

console.log(`manifest: ${compared} tiers, byte for byte with the analyzer`)
