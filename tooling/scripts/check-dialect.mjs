#!/usr/bin/env node
/**
 * Holds every word this repository writes to American spelling.
 *
 * **The rule was never written down, which is why it did not survive.** A sweep
 * on 19 Aug 2026 took the count from 658 occurrences to 239, and four days later
 * it was 1,685 across 386 files. Nothing checked it, so there was no line for a
 * contributor to have read and no script to fail.
 *
 * **Comments count, and that is the whole of why the first sweep decayed.** An
 * unwritten convention is learned from the corpus, so prose in the wrong
 * dialect teaches the next person to write it.
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
 * **And this file skips its own list.** The denylist is British by construction
 * and lives inside a tree the writer walks, so `bun run fix:dialect` rewrites it
 * into pairs with the same word on both sides, after which the check reports
 * every file American while reading nothing. Only the `PAIRS` literal is exempt;
 * the prose around it is checked like any other file's.
 *
 * Run `bun run fix:dialect` to rewrite, and `bun run check:prose:dialect` to
 * fail when a British form is left. `verify` runs the check, for the reason it
 * runs `biome ci`.
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
 * release. The same timing argument as [#215](../../fusion/docs/19-queue.md).
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
  /* Six inflections rather than a stem: `\b` bounds the pattern at both ends,
     so `rasterise` never matches inside `rasterises`, which is why `analyse` is
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

/* **`.claude` is in here for the reason the docblock gives.** An unwritten
   convention is learned from the corpus, and `.claude/rules` is the corpus an
   agent reads first and most literally: the one directory written to be copied
   from is the last one that may sit outside this list. */
const ROOTS = ['cortex', 'fusion', 'helix', 'tooling', '.claude', '.github']

/* Root files are named rather than globbed, so a root file that is not named
   here is never swept. */
const FILES = ['AGENTS.md', 'CLAUDE.md', 'Cargo.toml', 'README.md']

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
 * **Prose about spelling has to be able to name a spelling.** A queue row
 * recording that `::part(center)` was a real public part loses the name of the
 * thing it is about the moment the sweep reaches it.
 *
 * An explicit marker rather than a rule that guesses. Backticks are the
 * tempting signal and the wrong one: an identifier named in a comment is
 * backticked too, and an identifier spelled the British way is exactly what
 * this should catch. Whether a word is being used or named is something only
 * the author knows, so the author says it, on the line, where a reader sees it.
 *
 * An HTML comment because those rows are markdown table cells, where nothing
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

/**
 * Every pair, plus the regular inflections of each.
 *
 * **`\b` at both ends makes the list a list of exact words**, so a stem never
 * matches inside its own plural: the pair for the commonest word in the
 * repository caught one occurrence of eighty-six, and stems alone let 255
 * occurrences past the check, four of them accounting for 194. Enumerating
 * inflections by hand covers a family; these suffixes cover the rest.
 *
 * A closed suffix set rather than `[a-z]*`, because the open form matches a
 * compound as readily as an inflection: `aria-labelledby` is the platform's
 * own attribute and `ColourInput` is an alias that exists so a British speaker
 * finds the family, and both would be rewritten into something that does not
 * work. A compound that does need catching is cheaper as its own pair than as
 * a rule with exceptions.
 *
 * `analyses` is the one collision the suffixes create, being the American
 * plural of `analysis` as well as the British verb, so it is named here rather
 * than guessed at.
 */
const SUFFIXES = ['', 'd', 'ed', 'es', 'ing', 'r', 'rs', 's']
const COLLISIONS = new Set(['analyses'])

const INFLECTED = PAIRS.flatMap(([british, american]) =>
  SUFFIXES.map((suffix) => [british + suffix, american + suffix]).filter(
    ([form]) => !COLLISIONS.has(form),
  ),
)

/** One line, every pair applied. No pattern spans a newline, so this is whole. */
const swept = (line) => {
  let after = line
  for (const [british, american] of INFLECTED) {
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
    for (const [british, american] of INFLECTED) {
      const found = new RegExp(`\\b${british}\\b`, 'i').exec(line)
      /* A match the rewrite would not change is not a finding. Reporting every
         pair whose left side appears on the line turns one British word into a
         complaint per pair, most of them naming the same word as both the fault
         and the fix. The line above decides what gets written; this decides
         what gets said, and the two have to agree. */
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
    console.error(`\n  ...and ${problems.length - 40} more. Run \`bun run fix:dialect\`.`)
  }
  process.exit(1)
}

console.log(`dialect: ${checked} files, every one in American spelling`)
