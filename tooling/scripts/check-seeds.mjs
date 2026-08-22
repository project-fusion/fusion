#!/usr/bin/env node
/**
 * Holds the theme engine's seed names and the stylesheet's, in both directions.
 *
 * **Two derivations compute this palette and nothing has ever compared them.**
 * `@helix-io/theme` solves tokens in JavaScript and emits a block of custom
 * properties; `helix/styles` derives its own ramp in CSS from a handful of
 * seeds. They meet at exactly one place, the seed names, and until #141 they
 * disagreed there in silence: `toCss` wrote `--helix-seed-density` and
 * `--helix-seed-radius` while the stylesheet read `--_helix-seed-density` and
 * `--_helix-seed-radii`, both private with no public name to fall back through.
 * Two of the five intent knobs did nothing, and a spec asserting one of the
 * dead names passed the whole time.
 *
 * A spec can only hold a name it names, which is why this is a check and not a
 * test. It reads both sides and compares the sets.
 *
 * **Both directions, because each failure is different.**
 *
 * 1. **Emitted and unread.** The engine writes a name no stylesheet consumes,
 *    so a consumer sets an intent input and nothing moves. This is the failure
 *    #141 found, and it is invisible from either file alone.
 * 2. **Read and never emitted.** The stylesheet offers a public seed the engine
 *    cannot produce, so the documented path to a theme cannot reach part of the
 *    palette and a consumer has to hand-write CSS to finish the job.
 *
 * The second is not hypothetical either: the accent and neutral seeds are read
 * by the ramp and the engine emits neither, which is real and is #141's
 * remaining work rather than a bug. `PLANNED` carries them with a reason each,
 * because an allowlist without reasons becomes the place things go to stop
 * being questioned.
 *
 * **Both sides are compared as suffixes, not as whole names**, because the
 * engine's prefix is an input: `namespace` exists so a team on their own tokens
 * can use the solver without adopting Helix, and it makes the emitted name a
 * template rather than a literal. So `brand` is the unit of comparison and
 * `--helix-seed-brand` is what the stylesheet happens to call it.
 *
 * **The stylesheet side is read from the public name inside `var()`.** A seed
 * is written `var(--_helix-seed-brand, ...)` on the private twin and
 * `var(--helix-seed-brand, <default>)` where the public name is the input, so
 * the public names are exactly the first arguments. Matching the declarations
 * instead would find the private names, which is the wrong set: those are the
 * stylesheet talking to itself.
 *
 * **It covers the token names too, and the name of the check is narrower than
 * the job it does.** The boundary is the same one: every colour token the
 * engine emits has to be a name `tokens.css` declares, or a themed page sets a
 * property nothing reads, which is the seed bug one level up and with thirty-six
 * more chances to happen. They agree today, measured, which is precisely the
 * state the seed names were in before they drifted. `seeds` stays the name
 * because the seeds are the sharp edge and a renamed check loses its history in
 * commit messages that cite it.
 *
 * Run with `bun run check:seeds` (also part of `bun run verify`).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const ENGINE = 'helix/theme/src/derive.ts'
const MODEL = 'helix/theme/src/model.ts'
const SHEETS = ['helix/styles/src/primitives.css', 'helix/styles/src/tokens.css']

/**
 * Seeds the stylesheet reads that the engine is not expected to emit yet, and
 * why. Each entry is a claim that a consumer writing CSS by hand is the
 * intended path today, which is exactly the kind of claim that should expire.
 */
const PLANNED = new Map([
  [
    'accent',
    '#141: the engine derives an accent and emits its tokens, but the CSS ramp ' +
      'takes a seed rather than the solved steps, so seeding it would hand the ' +
      'stylesheet a second opinion on colours the engine already computed',
  ],
  ['accent-hue', "#141: same, and the relationship is the stylesheet's to apply"],
  ['neutral-chroma', '#141: the engine takes the cast and derives from it directly'],
  ['neutral-hue', '#141: same'],
  ['chroma-scale', '#141: the CSS series ramp reads it, the engine applies it before emitting'],
])

const read = (path) => readFileSync(join(ROOT, path), 'utf8')

/* Comments hold seed names too: `primitives.css` explains the whole scheme in
   prose directly above the block, and `derive.ts` documents the two names it
   used to get wrong. Reading those in makes the check pass on the bug it was
   written for, which is the trap `check:composed`, `check:seams` and
   `check:grounds` each record hitting. */
const uncommented = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')

/* **Two forms, because the seeds are data before they are CSS.** They are
   declared as object keys, `'seed-brand': …`, and rendered into
   `--${namespace}-seed-brand: …` from that one place, so the literal prefix is
   never in the source to match on and the key may or may not carry a quote.
   What both forms share is ending in `seed-<name>` followed by a colon, and
   nothing else in this file does, comments already being stripped. */
const emitted = new Set(
  [...uncommented(read(ENGINE)).matchAll(/seed-([a-z0-9-]+)'?\s*:/g)].map((m) => m[1]),
)

const consumed = new Set()
for (const sheet of SHEETS) {
  const source = uncommented(read(sheet))
  for (const found of source.matchAll(/var\(\s*--helix-seed-([a-z0-9-]+)/g)) {
    consumed.add(found[1])
  }
  /* A public seed can also be declared outright rather than read through a
     private twin, which is how `--helix-seed-accent-hue` is written: it is an
     angle with no colour behind it, so there is nothing for it to fall back
     through and the public name is the declaration. */
  for (const found of source.matchAll(/^\s*--helix-seed-([a-z0-9-]+)\s*:/gm)) {
    consumed.add(found[1])
  }
}

const problems = []

for (const name of [...emitted].sort()) {
  if (!consumed.has(name)) {
    problems.push(
      `${ENGINE} emits the seed \`${name}\` and no stylesheet reads it. A derived theme ` +
        'carrying this name moves nothing on the page, which is invisible from ' +
        'either file alone. Either the stylesheet should read it or the engine ' +
        'should stop emitting it.',
    )
  }
}

for (const name of [...consumed].sort()) {
  if (emitted.has(name) || PLANNED.has(name)) {
    continue
  }
  problems.push(
    `${SHEETS.join(' or ')} reads the seed \`${name}\` and ${ENGINE} never emits it, so ` +
      'the documented path to a theme cannot reach it and a consumer has to ' +
      'hand-write CSS to finish the job. Emit it, or record it in `PLANNED` ' +
      'with the reason.',
  )
}

for (const [name, why] of PLANNED) {
  if (!consumed.has(name)) {
    problems.push(
      `\`${name}\` is in \`PLANNED\` (${why}) and no stylesheet reads it. An ` +
        'exemption for a name nothing consumes is an entry nobody will ever ' +
        'remove. Delete it.',
    )
  }
  if (emitted.has(name)) {
    problems.push(
      `\`${name}\` is in \`PLANNED\` (${why}) and ${ENGINE} now emits it. The ` +
        'reason has expired, which is the point of writing one down. Delete the ' +
        'entry.',
    )
  }
}

/* The token names, read from the model rather than from a derived theme, so the
   check needs no colour math and cannot be fooled by a theme that happens not
   to emit something. */
const modelNames = [
  ...[...uncommented(read(MODEL)).matchAll(/name:\s*'(color-[a-z0-9-]+)'/g)].map((m) => m[1]),
  ...[...uncommented(read(MODEL)).matchAll(/'(color-[a-z0-9-]+)',?\s*$/gm)].map((m) => m[1]),
]

const declared = new Set(
  SHEETS.flatMap((sheet) => [
    ...uncommented(read(sheet)).matchAll(/^\s*--helix-(color-[a-z0-9-]+)\s*:/gm),
  ]).map((m) => m[1]),
)

for (const name of [...new Set(modelNames)].sort()) {
  if (!declared.has(name)) {
    problems.push(
      `${MODEL} names \`${name}\` as an ink or a ground and ${SHEETS[1]} does not ` +
        'declare it, so a themed page would set a property nothing reads and the ' +
        'pairing would be measured against a colour no component can paint.',
    )
  }
}

/* **Every other token `toCss` writes, which was the gap this check had.** It
   held the seeds and the model's colour names and nothing else, so the whole
   non-colour half of the emitted block was unguarded: separation, material,
   type and motion. `--helix-font-body` shipped that way and nothing read it,
   the token layer calling it `--helix-font-sans`, so setting a body face moved
   the headings and left every other word on the page alone.

   Read from the template literals rather than by running the engine, so the
   check needs no colour math and sees a name even where nothing emits it under
   the default intent. */
const written = new Set(
  [...uncommented(read(ENGINE)).matchAll(/`\s*--\$\{namespace\}-([a-z0-9-]+):/g)].map((m) => m[1]),
)

const declaredAll = new Set(
  SHEETS.flatMap((sheet) => [
    ...uncommented(read(sheet)).matchAll(/^\s*--helix-([a-z0-9-]+)\s*:/gm),
  ]).map((m) => m[1]),
)

/* **A name interpolated twice is a family, and the family still has to exist.**
   The type ramp is written `--${namespace}-text-${name}:`, so the whole of it
   slipped past the pattern above, which stops at the first `$`. Matching the
   prefix catches the failure that matters here, a family the token layer does
   not have at all: `--helix-typeface-lg` would be reported where
   `--helix-text-lg` is fine. It cannot check the leaf, and saying so is better
   than implying otherwise. */
const families = new Set(
  [...uncommented(read(ENGINE)).matchAll(/`\s*--\$\{namespace\}-([a-z0-9-]+)-\$\{/g)].map(
    (m) => m[1],
  ),
)

const declaredFamilies = new Set([...declaredAll].map((name) => name.split('-')[0]))

for (const family of [...families].sort()) {
  if (!declaredFamilies.has(family)) {
    problems.push(
      `${ENGINE} writes a \`--helix-${family}-*\` family and no stylesheet ` +
        'declares one, so every token in it sets a property nothing reads.',
    )
  }
}

for (const name of [...written].sort()) {
  if (name.startsWith('seed-') || declaredAll.has(name)) {
    continue
  }
  problems.push(
    `${ENGINE} writes \`--helix-${name}\` and no stylesheet declares it, so a ` +
      'derived theme carrying it sets a property nothing reads. Either the token ' +
      'layer should have the name or the engine should stop writing it.',
  )
}

if (problems.length > 0) {
  console.error(`Seeds out of step (${problems.length}):\n\n  ${problems.join('\n\n  ')}\n`)
  process.exit(1)
}

/* **The planned count is only printed when there is one**, and that is not
   cosmetic. `check:floors` reads the integers out of this line and fails on a
   zero, on the grounds that a check with nothing to say should not report
   success. An empty `PLANNED` is the *good* outcome here, meaning the engine
   emits everything the stylesheet reads, so printing `0 planned` would turn
   the day this row is finished into a red build. */
const planned = PLANNED.size > 0 ? `, ${PLANNED.size} planned and each still read` : ''
console.log(
  `seeds: ${emitted.size} emitted, ${consumed.size} read${planned}; ` +
    `${new Set(modelNames).size} model names, ${written.size} written tokens and ` +
    `${families.size} written families, every one declared`,
)
