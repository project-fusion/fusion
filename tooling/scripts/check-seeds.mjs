#!/usr/bin/env node
/**
 * Holds the theme engine's seed names and the stylesheet's, in both directions.
 *
 * **Two derivations compute this palette and nothing has ever compared them.**
 * `@fusion.dev/helix-theme` solves tokens in JavaScript and emits a block of custom
 * properties; `helix/styles` derives its own ramp in CSS from a handful of
 * seeds. They meet at exactly one place, the seed names, and a disagreement
 * there is silent: two of the five intent knobs once did nothing at all, and a
 * spec asserting one of the dead names passed the whole time.
 *
 * A spec can only hold a name it names, which is why this is a check and not a
 * test. It reads both sides and compares the sets.
 *
 * **Both directions, because each failure is different.**
 *
 * 1. **Emitted and unread.** The engine writes a name no stylesheet consumes,
 *    so a consumer sets an intent input and nothing moves. It is invisible from
 *    either file alone.
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
 * the job it does.** The boundary is the same one: every color token the
 * engine emits has to be a name `tokens.css` declares, or a themed page sets a
 * property nothing reads, which is the seed bug one level up and with thirty-six
 * more chances to happen. `seeds` stays the name because the seeds are the sharp
 * edge.
 *
 * Run with `bun run check:css:seeds` (also part of `bun run verify`).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { emitted as emittedNames, modelNames, seedNames } from './lib/theme-facts.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

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
      'stylesheet a second opinion on colors the engine already computed',
  ],
  ['accent-hue', "#141: same, and the relationship is the stylesheet's to apply"],
  ['neutral-chroma', '#141: the engine takes the cast and derives from it directly'],
  ['neutral-hue', '#141: same'],
])

const read = (path) => readFileSync(join(ROOT, path), 'utf8')

/* Comments hold seed names too: `primitives.css` explains the whole scheme in
   prose directly above the block, and `derive.ts` names the ones it documents.
   Reading those in makes the check pass on the exact bug it was written for. */
const uncommented = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')

/* **The seeds the engine emitted, rather than a regular expression guessing at
   how it writes them.** The literal prefix is never in the source to match on,
   so the answer comes from the oracle: these are the keys it actually wrote. */
const emitted = seedNames

const consumed = new Set()
for (const sheet of SHEETS) {
  const source = uncommented(read(sheet))
  for (const found of source.matchAll(/var\(\s*--helix-seed-([a-z0-9-]+)/g)) {
    consumed.add(found[1])
  }
  /* A public seed can also be declared outright rather than read through a
     private twin, which is how `--helix-seed-accent-hue` is written: it is an
     angle with no color behind it, so there is nothing for it to fall back
     through and the public name is the declaration. */
  for (const found of source.matchAll(/^\s*--helix-seed-([a-z0-9-]+)\s*:/gm)) {
    consumed.add(found[1])
  }
}

const problems = []

for (const name of [...emitted].sort()) {
  if (!consumed.has(name)) {
    problems.push(
      `the engine emits the seed \`${name}\` and no stylesheet reads it. A derived theme ` +
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
    `${SHEETS.join(' or ')} reads the seed \`${name}\` and the engine never emits it, so ` +
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
      `\`${name}\` is in \`PLANNED\` (${why}) and the engine now emits it. The ` +
        'reason has expired, which is the point of writing one down. Delete the ' +
        'entry.',
    )
  }
}

/* The token names the surface model knows, taken from the pairs the engine
   measured rather than from a token list: a ground the model names and no theme
   emits still has to be declared, and it is present there as the background of
   an unverifiable pair. */

const declared = new Set(
  SHEETS.flatMap((sheet) => [
    ...uncommented(read(sheet)).matchAll(/^\s*--helix-(color-[a-z0-9-]+)\s*:/gm),
  ]).map((m) => m[1]),
)

for (const name of [...new Set(modelNames)].sort()) {
  if (!declared.has(name)) {
    problems.push(
      `the surface model names \`${name}\` as an ink or a ground and ${SHEETS[1]} does not ` +
        'declare it, so a themed page would set a property nothing reads and the ' +
        'pairing would be measured against a color no component can paint.',
    )
  }
}

/* **Every other token `toCss` writes**, so the non-color half of the emitted
   block is guarded too: separation, material, type and motion. A name the token
   layer spells differently (`--helix-font-body` against `--helix-font-sans`)
   sets a property nothing reads, and nothing else notices.

   **Read from what the engine emitted across every oracle intent**, not matched
   against the template literals: a template can see a family and never a leaf,
   `--${namespace}-text-${name}` stopping the pattern at the first `$`, and it
   cannot see the color tokens at all, those being written by a loop. The trade
   is that a branch no intent reaches is invisible, which is why four of the
   seventeen intents exist to turn on the tail of the emission. */
const written = new Set([...emittedNames].filter((name) => !name.startsWith('seed-')))

const declaredAll = new Set(
  SHEETS.flatMap((sheet) => [
    ...uncommented(read(sheet)).matchAll(/^\s*--helix-([a-z0-9-]+)\s*:/gm),
  ]).map((m) => m[1]),
)

/* **A name interpolated twice is a family, and the family still has to exist.**
   The type ramp is written `--${namespace}-text-${name}:`, which no pattern over
   the source can reach past the first `$`. Matching the prefix catches the
   failure that matters here, a family the token layer does
   not have at all: `--helix-typeface-lg` would be reported where
   `--helix-text-lg` is fine. It cannot check the leaf, and saying so is better
   than implying otherwise. */
const families = new Set([...written].map((name) => name.split('-')[0]))

const declaredFamilies = new Set([...declaredAll].map((name) => name.split('-')[0]))

for (const family of [...families].sort()) {
  if (!declaredFamilies.has(family)) {
    problems.push(
      `the engine writes a \`--helix-${family}-*\` family and no stylesheet ` +
        'declares one, so every token in it sets a property nothing reads.',
    )
  }
}

for (const name of [...written].sort()) {
  if (name.startsWith('seed-') || declaredAll.has(name)) {
    continue
  }
  problems.push(
    `the engine writes \`--helix-${name}\` and no stylesheet declares it, so a ` +
      'derived theme carrying it sets a property nothing reads. Either the token ' +
      'layer should have the name or the engine should stop writing it.',
  )
}

if (problems.length > 0) {
  console.error(`Seeds out of step (${problems.length}):\n\n  ${problems.join('\n\n  ')}\n`)
  process.exit(1)
}

/* **The planned count is only printed when there is one**, and that is not
   cosmetic. `check:spec:floors` reads the integers out of this line and fails on a
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
