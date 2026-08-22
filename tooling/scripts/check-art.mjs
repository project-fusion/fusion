#!/usr/bin/env node
/**
 * Every family in the catalog has a gallery card, and the prose says how many.
 *
 * The design page's numbers come from the manifests: `getFamilies` groups every
 * declaration in `helix/web`, `helix/headless` and `helix/sandbox` by the source
 * folder its `modulePath` names, and the page renders `families.length`. So the
 * count on screen cannot be wrong.
 *
 * The card art is the other half and is hand-written, keyed by that same slug in
 * five files under `helix/gallery/src`. Two things about it are silent:
 *
 * - **A family with no entry renders nothing**, deliberately: Card's media
 *   region is a bare `<slot>`, so an unassigned one generates no box and a new
 *   component simply gets a card with no picture. That is the right default and
 *   it means nobody finds out.
 * - **The counts in those files' own docblocks are prose.** They were written by
 *   hand, they are used in the argument for splitting five files, and they
 *   drifted twice in one afternoon: fifty-eight in the comment against
 *   fifty-seven on the page, because one component was added and the number was
 *   bumped by two.
 *
 * Third of its shape after `check:hooks` and `check:parts`, and the same
 * argument: nothing about a missing entry fails, warns, or looks wrong.
 *
 * Run with `bun run check:art` (also part of `bun run verify`).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const MANIFESTS = [
  'helix/web/custom-elements.json',
  'helix/headless/custom-elements.json',
  'helix/sandbox/custom-elements.json',
]
const ART = 'helix/gallery/src'

/* The same derivation the catalog uses, so this cannot disagree with the page:
   a family is the first path segment under `src/` of a module that declares a
   custom element. */
const families = new Set()
for (const path of MANIFESTS) {
  for (const module of JSON.parse(readFileSync(path, 'utf8')).modules ?? []) {
    if (!(module.declarations ?? []).some((one) => one.tagName)) {
      continue
    }
    const slug = /^src\/([^/]+)\//.exec(module.path ?? '')?.[1]
    if (slug) {
      families.add(slug)
    }
  }
}

const drawn = new Set()
for (const file of readdirSync(ART).filter((one) => one.endsWith('.tsx') && one !== 'index.tsx')) {
  for (const [, slug] of readFileSync(join(ART, file), 'utf8').matchAll(
    /^ {2}['"]?([a-zA-Z-]+)['"]?: \(/gm,
  )) {
    drawn.add(slug)
  }
}

const problems = []
for (const slug of [...families].sort()) {
  if (!drawn.has(slug)) {
    problems.push(
      `${slug}: is a family and has no card art. It will render a card with no ` +
        `picture, which looks deliberate and is not.`,
    )
  }
}
for (const slug of [...drawn].sort()) {
  if (!families.has(slug)) {
    problems.push(`${slug}: has card art and is not a family. Nothing will ever render it.`)
  }
}

/* And the numbers the prose states, under a convention that makes the question
 * answerable: **in these two files a number written as a word is the family
 * count or the folder count, and every other count is written as digits.**
 *
 * The rule earns itself. Without it there are three shapes to chase: the
 * headline "All fifty-seven families", the folder comparison, and sentences like
 * "stated once rather than fifty-seven times" that carry the same number with no
 * noun to match on. Matching only the first two let a partial bump through,
 * measured: changing one of three occurrences in `core.tsx` passed. Forbidding
 * every number word was wrong the other way, and flagged a true sentence about
 * how many cards move.
 *
 * Digits for anything else is the cheap half of the rule and costs the prose
 * nothing, so a word in range is always one of two values and the check is
 * total rather than heuristic.
 */
const WORDS = [
  'forty-nine',
  'fifty',
  'fifty-one',
  'fifty-two',
  'fifty-three',
  'fifty-four',
  'fifty-five',
  'fifty-six',
  'fifty-seven',
  'fifty-eight',
  'fifty-nine',
  'sixty',
  'sixty-one',
  'sixty-two',
  'sixty-three',
  'sixty-four',
  'sixty-five',
  'sixty-six',
  'sixty-seven',
  'sixty-eight',
  'sixty-nine',
  'seventy',
  'seventy-one',
  'seventy-two',
  'seventy-three',
  'seventy-four',
  'seventy-five',
  'seventy-six',
  'seventy-seven',
  'seventy-eight',
  'seventy-nine',
  'eighty',
  'eighty-one',
  'eighty-two',
  'eighty-three',
  'eighty-four',
  'eighty-five',
  'eighty-six',
  'eighty-seven',
  'eighty-eight',
  'eighty-nine',
  'ninety',
  'ninety-one',
  'ninety-two',
  'ninety-three',
  'ninety-four',
  'ninety-five',
  'ninety-six',
  'ninety-seven',
  'ninety-eight',
  'ninety-nine',
  'one hundred',
  'one hundred and one',
  'one hundred and two',
  'one hundred and three',
  'one hundred and four',
  'one hundred and five',
  'one hundred and six',
  'one hundred and seven',
  'one hundred and eight',
  'one hundred and nine',
  'one hundred and ten',
  'one hundred and eleven',
  'one hundred and twelve',
  'one hundred and thirteen',
  'one hundred and fourteen',
  'one hundred and fifteen',
  'one hundred and sixteen',
  'one hundred and seventeen',
  'one hundred and eighteen',
  'one hundred and nineteen',
  'one hundred and twenty',
]
const wordFor = (count) => {
  const word = WORDS[count - 49]
  if (word === undefined) {
    throw new Error(
      `check:art: ${count} families is past the end of WORDS. Add the words up to it: ` +
        'the table exists so a number word in this prose is checkable rather than trusted, ' +
        'and a count off the end silently compared every word against "undefined".',
    )
  }
  return word
}
const said = wordFor(families.size)

/* Folders that are *families*, which is the question the prose is answering:
   how many more entries there are than there are components in `helix/web`. A
   directory with an `index.ts` is what the barrel exports and what
   `check:examples` already calls a family, and it is the difference that
   matters: `field/` is a directory holding the shared field stylesheets, it
   exports nothing and has no element, so counting it made this check disagree
   with correct prose on its first run. */
const folders = readdirSync('helix/web/src', { withFileTypes: true }).filter(
  (one) => one.isDirectory() && existsSync(join('helix/web/src', one.name, 'index.ts')),
).length
const foldersSaid = wordFor(folders)

let compared = 0
for (const file of ['index.tsx', 'core.tsx']) {
  const text = readFileSync(join(ART, file), 'utf8')
  /* Every ten-word from forty up, and the range is the whole point.
   *
   * This read `forty-x|fifty-x|sixty(-x)?|seventy(-x)?|fifty` and so stopped
   * matching the day the catalog passed seventy-nine. `WORDS` ran to
   * `eighty-five` and `wordFor` returned the right answer the whole time; the
   * regex simply found nothing to compare it against, so the check passed by
   * having no work to do. It was two families out of date when this was
   * noticed, which is what a check that silently stops checking costs. */
  for (const [, word] of text.matchAll(
    /\b((?:forty|fifty|sixty|seventy|eighty|ninety)(?:-[a-z]+)?)\b/g,
  )) {
    compared += 1
    if (word !== said && word !== foldersSaid) {
      problems.push(
        `${ART}/${file}: says "${word}" where the catalog has ${families.size} families ` +
          `("${said}") over ${folders} folders in helix/web/src ("${foldersSaid}"). A number ` +
          `word in these files is one of those two; write any other count as digits.`,
      )
    }
  }
}

if (problems.length > 0) {
  console.error(`Gallery art out of step (${problems.length}):\n\n  ${problems.join('\n  ')}\n`)
  process.exit(1)
}

console.log(
  `art: ${families.size} families, every one drawn, and ${compared} number words in the prose agree`,
)
