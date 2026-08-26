#!/usr/bin/env node
/**
 * Holds every word this repository writes to American spelling.
 *
 * **The rule was never written down, which is why it did not survive.**
 * `1f1a8af9` swept it on 19 Aug 2026, titled 391 words in 105 files, and took
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
 * **And this file skips its own list, which it did not until 25 Aug 2026.** The
 * denylist is British by construction and lives inside a tree the writer walks,
 * so `bun run dialect` rewrote it: measured on the commit that introduced the
 * check, every pair in it is already `['color', 'color']`, meaning the list has
 * never held a British form and the check has never been able to fail. It
 * reports 1,974 files all in American spelling and it is reading nothing. Only
 * the `PAIRS` literal is exempt; the prose around it is checked like any other
 * file's, which is the half that matters, this being thirty lines of the
 * repository's own writing about how it writes.
 *
 * **What is still owed is the restore, and it is a sweep rather than an edit.**
 * Measured 25 Aug 2026 with the real British forms put back: **75 occurrences
 * across 23 files**, 39 of them in `docs/19-queue.md`, led by `color` at 19,
 * `behavior` at 6 and `centered`, `judgment` and `license` at 6 each. Restoring
 * the list without rewriting those turns `verify` red, so the two belong in one
 * change and that change is not this one. The pairs below are the ones this
 * file's own prose needed, and they are proof the mechanism works rather than
 * the whole list.
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
  ['acknowledgement', 'acknowledgment'],
  ['aluminium', 'aluminum'],
  ['apologise', 'apologize'],
  ['artefact', 'artifact'],
  ['behaviour', 'behavior'],
  ['calibre', 'caliber'],
  ['cancelled', 'canceled'],
  ['cancelling', 'canceling'],
  ['catalogue', 'catalog'],
  ['centring', 'centering'],
  ['centred', 'centered'],
  ['centre', 'center'],
  ['colour', 'color'],
  ['defence', 'defense'],
  ['emphasise', 'emphasize'],
  ['emphasised', 'emphasized'],
  ['favour', 'favor'],
  ['fibre', 'fiber'],
  ['flavour', 'flavor'],
  ['fuelled', 'fueled'],
  ['honour', 'honor'],
  ['humour', 'humor'],
  ['judgement', 'judgment'],
  ['labelled', 'labeled'],
  ['labelling', 'labeling'],
  ['labour', 'labor'],
  ['licence', 'license'],
  ['litre', 'liter'],
  ['marvellous', 'marvelous'],
  ['modelled', 'modeled'],
  ['modelling', 'modeling'],
  ['neighbour', 'neighbor'],
  ['normalise', 'normalize'],
  ['normalised', 'normalized'],
  ['normalising', 'normalizing'],
  ['offence', 'offense'],
  ['organise', 'organize'],
  ['organised', 'organized'],
  ['organisation', 'organization'],
  ['pretence', 'pretense'],
  ['prioritise', 'prioritize'],
  ['prioritised', 'prioritized'],
  /* The one family that is live, and the reason the exemption above exists.
     `check-visual.mjs` described text rasterization in British and passed,
     because a denylist that has eaten itself objects to nothing. Six
     inflections rather than a stem: `\b` bounds the pattern at both ends, so
     `rasterise` never matches inside `rasterises`, which is why `analyse` is
     three entries here as well. */
  ['rasterisation', 'rasterization'],
  ['rasterising', 'rasterizing'],
  ['rasterised', 'rasterized'],
  ['rasterises', 'rasterizes'],
  ['rasteriser', 'rasterizer'],
  ['rasterise', 'rasterize'],
  ['realise', 'realize'],
  ['realised', 'realized'],
  ['recognise', 'recognize'],
  ['recognised', 'recognized'],
  ['rumour', 'rumor'],
  ['sceptical', 'skeptical'],
  ['sceptic', 'skeptic'],
  ['signalled', 'signaled'],
  ['skilful', 'skillful'],
  ['smoulder', 'smolder'],
  ['specialise', 'specialize'],
  ['summarise', 'summarize'],
  ['theatre', 'theater'],
  ['travelled', 'traveled'],
  ['travelling', 'traveling'],
  ['wilful', 'willful'],
  ['analysed', 'analyzed'],
  ['analysing', 'analyzing'],
  ['analyse', 'analyze'],
  ['grey', 'gray'],
  ['amongst', 'among'],
  ['whilst', 'while'],
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

/**
 * This file, which is the one file whose British forms are the point of it.
 *
 * A path rather than a flag on the loop, because the loop reaches here through
 * `ROOTS` like everything else and nothing about `tooling/scripts` says stop.
 */
const SELF = join('tooling', 'scripts', 'check-dialect.mjs')

/**
 * The marker a line uses to say its British spellings are quoted, not written.
 *
 * **Prose about spelling has to be able to name a spelling.** Two rows in the
 * queue do: one records that `::part(center)` was a real public part before it
 * was renamed, and one carries the measurement behind #288. Swept, the first
 * loses the name of the thing it is about and the second reports that the most
 * common British spelling in the repository is `color`.
 *
 * An explicit marker rather than a rule that guesses. Backticks were the
 * tempting signal and are the wrong one: an identifier named in a comment is
 * backticked too, and an identifier spelled the British way is exactly what
 * this should catch. Whether a word is being used or named is something only
 * the author knows, so the author says it, on the line, where a reader sees it.
 *
 * An HTML comment because both rows are markdown table cells, where nothing
 * else is invisible to a reader and legal inside a `|` delimited row.
 */
const QUOTED = 'dialect:quoted'

/**
 * Whether a line is inside this file's own `PAIRS` literal, and so exempt.
 *
 * The literal is found rather than counted, so adding a pair cannot silently
 * move the exemption off the end of it. Everything outside it is swept, which
 * is what keeps the docblock above honest about its own dialect.
 */

const exempt = (path, lines) => {
  const marked = (index) => lines[index]?.includes(QUOTED) === true
  if (!path.endsWith(SELF)) {
    return marked
  }
  const opens = lines.findIndex((line) => line.startsWith('const PAIRS = ['))
  if (opens === -1) {
    return marked
  }
  const closes = lines.findIndex((line, index) => index > opens && line === ']')
  return (index) => marked(index) || (index >= opens && index <= closes)
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

/** One line, every pair applied. No pattern spans a newline, so this is whole. */
const swept = (line) => {
  let after = line
  for (const [british, american] of PAIRS) {
    after = after.replace(new RegExp(`\\b${british}\\b`, 'gi'), (match) => like(match, american))
  }
  return after
}

for (const path of [...ROOTS.flatMap((root) => files(root)), ...FILES]) {
  const before = readFileSync(path, 'utf8')
  /* Line by line rather than whole-file, which is what makes the exemption
     expressible: a range of lines can be skipped and a substring of a file
     cannot be, not without losing the line numbers the report is made of. */
  const lines = before.split('\n')
  const skip = exempt(path, lines)
  const after = lines.map((line, index) => (skip(index) ? line : swept(line))).join('\n')
  checked += 1
  if (after === before) {
    continue
  }
  if (write) {
    writeFileSync(path, after)
    rewritten += 1
    continue
  }
  for (const [index, line] of lines.entries()) {
    if (skip(index)) {
      continue
    }
    for (const [british, american] of PAIRS) {
      const found = new RegExp(`\\b${british}\\b`, 'i').exec(line)
      /* A match that the rewrite would not change is not a finding, and the
         reporter said otherwise until 25 Aug 2026. It named every pair whose
         left side appeared on the line, which was harmless only while every
         pair had the same word on both sides: the first live pair turned one
         British word in `docs/19-queue.md` into 169 complaints, most of them
         "`color` is British. Write `color`." The line above decides what gets
         written; this decides what gets said, and the two have to agree. */
      if (found && like(found[0], american) !== found[0]) {
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
