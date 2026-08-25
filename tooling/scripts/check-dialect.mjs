#!/usr/bin/env node
/**
 * Holds every word this repository writes to American spelling.
 *
 * **The rule was never written down, which is why it did not survive.**
 * `3e39ad2f` swept it on 19 Aug 2026, titled 391 words in 105 files, and took
 * the count from 658 occurrences to 239. Four days later it was 1,685 across
 * 386 files. Nothing checked it and `CLAUDE.md` stated the em dash rule and
 * said nothing about spelling, so there was no line for a contributor to have
 * read and no script to fail. This file is the remedy `check:queue` already
 * demonstrates: the rule nobody re-reads survives exactly as long as nobody
 * re-reads it.
 *
 * **Comments count, and that is the whole of why the first sweep decayed.** An
 * unwritten convention is learned from the corpus, so prose in the wrong
 * dialect teaches the next person to write it. The agent that filed this row
 * added fifteen more the same day, matching a house voice it inferred from the
 * text around it.
 *
 * **Pairs rather than a dictionary.** A spell checker would need a word list
 * for every proper noun, token name and API term this repository invents, and
 * would fail on `helix`, `oklch` and `megamenu` before it found a `color`. A
 * closed list of British forms cannot produce a false positive on a word nobody
 * has heard of, and the only cost is that it finds nothing it was not told
 * about, which is a cost a sweep pays once.
 *
 * **Generated files are skipped**, because their source is checked and they are
 * rewritten from it. Fixing a manifest by hand would be fixed back on the next
 * `analyze`.
 *
 * Run `bun run dialect` to rewrite, and `bun run check:dialect` to fail when a
 * British form is left. `verify` runs the check, for the reason it runs
 * `biome ci`.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * British form to American, and every one of them is unambiguous.
 *
 * Ordered longest first where one contains another, so `centering` is rewritten
 * before `center` can claim its first six letters.
 *
 * `gray` is in because it is only ever prose here, checked before adding it:
 * every occurrence is a comment describing a color, and no token, part or
 * property is named with it. CSS accepts both spellings, so a rule would have
 * kept working either way and nothing would have said which one this house
 * writes.
 *
 * **`center` renames a public part**, `donut-chart`'s, and that is deliberate
 * rather than collateral. There is no `helix-v` tag, so `::part(center)` has no
 * consumer to break, and this is free today and a deprecation after the first
 * release. The same timing argument as [#215](../../docs/19-queue.md).
 */
const PAIRS = [
  ['acknowledgment', 'acknowledgment'],
  ['aluminum', 'aluminum'],
  ['apologize', 'apologize'],
  ['artifact', 'artifact'],
  ['behavior', 'behavior'],
  ['caliber', 'caliber'],
  ['canceled', 'canceled'],
  ['canceling', 'canceling'],
  ['catalog', 'catalog'],
  ['centering', 'centering'],
  ['centered', 'centered'],
  ['center', 'center'],
  ['color', 'color'],
  ['defense', 'defense'],
  ['emphasize', 'emphasize'],
  ['emphasized', 'emphasized'],
  ['favor', 'favor'],
  ['fiber', 'fiber'],
  ['flavor', 'flavor'],
  ['fueled', 'fueled'],
  ['honor', 'honor'],
  ['humor', 'humor'],
  ['judgment', 'judgment'],
  ['labeled', 'labeled'],
  ['labeling', 'labeling'],
  ['labor', 'labor'],
  ['license', 'license'],
  ['liter', 'liter'],
  ['marvelous', 'marvelous'],
  ['modeled', 'modeled'],
  ['modeling', 'modeling'],
  ['neighbor', 'neighbor'],
  ['normalize', 'normalize'],
  ['normalized', 'normalized'],
  ['normalizing', 'normalizing'],
  ['offense', 'offense'],
  ['organize', 'organize'],
  ['organized', 'organized'],
  ['organization', 'organization'],
  ['pretense', 'pretense'],
  ['prioritize', 'prioritize'],
  ['prioritized', 'prioritized'],
  ['realize', 'realize'],
  ['realized', 'realized'],
  ['recognize', 'recognize'],
  ['recognized', 'recognized'],
  ['rumor', 'rumor'],
  ['skeptical', 'skeptical'],
  ['skeptic', 'skeptic'],
  ['signaled', 'signaled'],
  ['skillful', 'skillful'],
  ['smolder', 'smolder'],
  ['specialize', 'specialize'],
  ['summarize', 'summarize'],
  ['theater', 'theater'],
  ['traveled', 'traveled'],
  ['traveling', 'traveling'],
  ['willful', 'willful'],
  ['analyzed', 'analyzed'],
  ['analyzing', 'analyzing'],
  ['analyze', 'analyze'],
  ['gray', 'gray'],
  ['among', 'among'],
  ['while', 'while'],
]

const ROOTS = ['cortex', 'docs', 'helix', 'site', 'tooling', '.github']
const FILES = ['CLAUDE.md', 'README.md']

const IGNORED = new Set([
  '.next',
  '.next-dev',
  '.turbo',
  '.vercel',
  'coverage',
  'dist',
  'node_modules',
  'public',
  'target',
  'wasm',
  'worktrees',
])

/* Written by a generator from a source this check already reads, so a fix here
   would be undone by the next build. `custom-elements.json` and the typings
   beside it come from the component sources; the references and the catalog
   come from those manifests. */
const GENERATED =
  /(\.generated\.\w+|custom-elements\.json|jsx\.d\.ts|vue\.d\.ts|elements\.css|\.css\.ts|component-reference\.md|token-reference\.md|catalog\.generated\.json|peers\.json|oracle\.json|metrics\.mdx)$/

const EXTENSIONS = /\.(css|html|md|mdx|mjs|rs|toml|ts|tsx|yml)$/

const files = (dir, found = []) => {
  for (const entry of readdirSync(dir)) {
    if (IGNORED.has(entry)) {
      continue
    }
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      files(path, found)
    } else if (EXTENSIONS.test(path) && !GENERATED.test(path)) {
      found.push(path)
    }
  }
  return found
}

/** Keeps the case the author wrote: `Color` becomes `Color`, `COLOR` `COLOR`. */
const like = (source, replacement) => {
  if (source === source.toUpperCase()) {
    return replacement.toUpperCase()
  }
  if (source[0] === source[0]?.toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1)
  }
  return replacement
}

const write = process.argv.includes('--write')
const problems = []
let checked = 0
let rewritten = 0

for (const path of [...ROOTS.flatMap((root) => files(root)), ...FILES]) {
  const before = readFileSync(path, 'utf8')
  let after = before
  for (const [british, american] of PAIRS) {
    const pattern = new RegExp(`\\b${british}\\b`, 'gi')
    after = after.replace(pattern, (match) => like(match, american))
  }
  checked += 1
  if (after === before) {
    continue
  }
  if (write) {
    writeFileSync(path, after)
    rewritten += 1
    continue
  }
  for (const [index, line] of before.split('\n').entries()) {
    for (const [british, american] of PAIRS) {
      const found = new RegExp(`\\b${british}\\b`, 'i').exec(line)
      if (found) {
        problems.push(`${path}:${index + 1}: \`${found[0]}\` is British. Write \`${american}\`.`)
        break
      }
    }
  }
}

if (write) {
  console.log(`dialect: ${rewritten} of ${checked} files rewritten to American spelling`)
  process.exit(0)
}

if (problems.length > 0) {
  console.error(`British spellings (${problems.length}):\n`)
  for (const problem of problems.slice(0, 40)) {
    console.error(`  ${problem}`)
  }
  if (problems.length > 40) {
    console.error(`\n  ...and ${problems.length - 40} more. Run \`bun run dialect\`.`)
  }
  process.exit(1)
}

console.log(`dialect: ${checked} files, every one in American spelling`)
