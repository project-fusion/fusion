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
 * Run with `bun run check:seeds` (also part of `bun run verify`).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const ENGINE = 'helix/theme/src/derive.ts'
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

/* Written `--${namespace}-seed-brand`, so the literal prefix is not there to
   match on. Every emission ends in `seed-<name>:` and nothing else in this file
   does, comments already being stripped. */
const emitted = new Set(
  [...uncommented(read(ENGINE)).matchAll(/-seed-([a-z0-9-]+)\s*:/g)].map((m) => m[1]),
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

if (problems.length > 0) {
  console.error(`Seeds out of step (${problems.length}):\n\n  ${problems.join('\n\n  ')}\n`)
  process.exit(1)
}

console.log(
  `seeds: ${emitted.size} emitted, ${consumed.size} read, ` +
    `${PLANNED.size} planned and each still read`,
)
