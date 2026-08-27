#!/usr/bin/env node
/**
 * Vendors Google's font catalog as a typed list the theme builder can offer.
 *
 * **A bigger list, not a new dependency**, which is the whole of why this is
 * allowed. The builder already fetches `fonts.googleapis.com` at runtime and
 * already argues why: a preview is not a deployment, the Sovereignty Constraint
 * governs what a Fusion product does to a *consumer's* page, and the emitted
 * artifact names the family and leaves the loading to whoever pastes it. That
 * policy does not change shape at two thousand families. What changes is that a reader
 * stops being offered nine.
 *
 * **The weights are the work.** A family's `google` request has to name weights
 * the family actually has: `Inter:wght@400;500;600` is three real weights, and
 * the same string against a family shipping only 400 and 700 returns a
 * stylesheet missing two of them and a page that synthesizes the difference.
 * So each family is intersected with the three the token layer uses, and a
 * variable family, which carries a `wght` axis rather than a list, is asked for
 * whichever of the three fall inside its range.
 *
 * **Vendored rather than fetched at runtime**, because a control that cannot
 * populate itself without the network is a control that is empty on a plane,
 * and because the catalog changes on Google's schedule rather than ours. Run
 * `bun run faces` to refresh it; nothing calls it during a build.
 *
 * The shape is a tuple per family rather than an object, which is two thousand of
 * them: measured, objects cost roughly three times the bytes for the same three
 * fields, and this file ships to a browser.
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

/* **`.generated.` is load-bearing, not decoration.** Seven scripts here find a
   generated file by that segment in its name, and this was called `faces.ts`
   and caught by none of them.

   `check:dialect` is the one that showed it. Google ships a family called
   `Grey Qo`, which the sweep reads as a British color and refuses. dialect:quoted

   The fix that had been applied was that marker, hand-written into a row of the
   generated file, under a header saying not to edit it. It survived until
   somebody ran this script, which is precisely the failure the check's own
   comment predicts: a fix in generated output is undone by the next build. The
   name is the fix, because the exemption is what the name is for. */
const OUT = join(import.meta.dirname, '../../site/ui/content/faces/faces.generated.ts')
const SOURCE = 'https://fonts.google.com/metadata/fonts'

/* What the token layer asks for. `--helix-weight-*` resolves to these three, so
   a face that cannot supply one is asked for the ones it can. */
const WANTED = [400, 500, 600]

const response = await fetch(SOURCE)
if (!response.ok) {
  console.error(`faces: ${SOURCE} answered ${response.status}`)
  process.exit(1)
}
const { familyMetadataList: families } = await response.json()

/** The weights this family can actually serve, out of the three we want. */
const weightsFor = (family) => {
  const axis = (family.axes ?? []).find((entry) => entry.tag === 'wght')
  if (axis) {
    return WANTED.filter((weight) => weight >= axis.min && weight <= axis.max)
  }
  const has = new Set(
    Object.keys(family.fonts ?? {})
      .filter((key) => !key.endsWith('i'))
      .map(Number),
  )
  return WANTED.filter((weight) => has.has(weight))
}

/**
 * Google's five categories, as digits.
 *
 * **Monospace keeps the 1 it already had.** The third field was
 * `category === 'Monospace' ? 1 : 0`, a flag, and every consumer testing it for
 * mono tests `=== 1`; giving the other four the remaining numbers leaves those
 * tests correct and turns the proportional test from `=== 0` into `!== 1`. A
 * flag widened into an enumeration rather than a second field, so the row stays
 * three long and the file stays the size it was.
 *
 * **The counts in this file's prose are deliberately round.** The exact one is
 * Google's and moves on their schedule rather than ours: it was 1,942 when this
 * was written, 1,939 when the catalog was last refreshed before that, and 1,943
 * now, and every one of those was written into a comment by hand. The arguments
 * here are about scale and hold at any of them. The generated file states the
 * real figure, because it is regenerated when the figure changes.
 *
 * A digit rather than the word, for the reason the tuple exists at all: two thousand
 * rows ship to a browser, and `'Handwriting'` is twelve bytes against one.
 *
 * An unknown category falls to sans-serif rather than throwing. These five have
 * been stable for years, and a sixth appearing should put a face in the wrong
 * group rather than fail a build on a Tuesday.
 */
const CATEGORIES = {
  Display: 3,
  Handwriting: 4,
  Monospace: 1,
  'Sans Serif': 0,
  Serif: 2,
}

const rows = []
let skipped = 0
for (const family of families) {
  const weights = weightsFor(family)
  if (weights.length === 0) {
    /* Nothing in the range we render at. A display face that ships only 900 is
       real and is not something the token layer can ask for. */
    skipped += 1
    continue
  }
  rows.push([family.family, weights.join(';'), CATEGORIES[family.category] ?? 0])
}

rows.sort((a, b) => a[0].localeCompare(b[0]))

const body = rows.map(
  ([name, weights, category]) => `  ['${name.replace(/'/g, "\\'")}', '${weights}', ${category}],`,
)

writeFileSync(
  OUT,
  `/* Every Google family the token layer can render, generated by
   \`bun run faces\`. Do not edit.

   \`tooling/scripts/build-faces.mjs\` writes it from \`${SOURCE}\`
   and its docblock carries the reasoning: a preview is not a deployment, the
   weights are intersected with the three the token layer uses, and a family
   that can supply none of them is left out.

   A tuple per family rather than an object, because there are ${rows.length} of
   them and this ships to a browser.

   A plain block rather than a doc block, because this describes the file and
   the declarations under it carry their own. \`check:orphans\` caught the first
   version claiming to document the blank line beneath it. */

/**
 * \`[family, weights, category]\`, where the category is one of Google's five:
 * 0 sans-serif, 1 monospace, 2 serif, 3 display, 4 handwriting.
 *
 * Monospace is 1 because the field used to be a monospace flag, so every test
 * for it reads the same as it did. Proportional is \`!== 1\` rather than \`=== 0\`.
 */
export type FaceRow = readonly [string, string, FaceCategory]

/** The five, so a consumer can name one rather than remembering a digit. */
export type FaceCategory = 0 | 1 | 2 | 3 | 4

/** Every family, alphabetical, monospace and proportional together. */
export const GOOGLE_FACES: readonly FaceRow[] = [
${body.join('\n')}
]
`,
)
console.log(
  `faces: ${rows.length} families with at least one of ${WANTED.join('/')}, ${skipped} without`,
)
