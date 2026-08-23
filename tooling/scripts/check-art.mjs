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
/* **The counter and the matcher are built from the same two arrays, which is
 * the whole of what this section is for.**
 *
 * They used to be two hand-written lists: a `WORDS` table of every count from
 * forty-nine up, and a separate alternation of decades in the regex below. Two
 * lists that have to agree and nothing making them, so they drifted exactly as
 * that arrangement does. The table reached `eighty-five` while the pattern
 * stopped at `seventy`, and for two families' worth of catalog growth the check
 * found no words to compare and reported that the prose agreed.
 *
 * Extending the pattern to `ninety` fixed the instance and left the shape: the
 * table then ran to `one hundred and twenty`, a phrase with a space in it that
 * the decade alternation could not have matched under any suffix, so the same
 * failure was sitting ten families out. At eighty-nine today that is close
 * enough to be worth doing properly.
 *
 * So `wordFor` spells any number rather than looking one up, the pattern is
 * assembled from the arrays it spells with, and the assertion underneath walks
 * the range and proves the second can find everything the first can say. None
 * of the three can be edited into disagreement without the check failing on its
 * own way in. */
const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
]
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

/* Where a word stops being prose and starts being one of the two counts.
 *
 * Not zero, and the reason is in the note above: forbidding every number word
 * flagged a true sentence about how many cards move. Forty is below any count
 * this catalog has had and above anything the prose says in passing. */
const FLOOR = 40

const wordFor = (count) => {
  if (count < 20) {
    return ONES[count]
  }
  if (count < 100) {
    const tens = TENS[Math.floor(count / 10)]
    return count % 10 === 0 ? tens : `${tens}-${ONES[count % 10]}`
  }
  if (count < 1000) {
    const hundreds = `${ONES[Math.floor(count / 100)]} hundred`
    return count % 100 === 0 ? hundreds : `${hundreds} and ${wordFor(count % 100)}`
  }
  throw new Error(
    `check:art: ${count} is past what wordFor spells. It stops below a thousand because ` +
      'nothing here counts that high, and a count that does needs the thousands case written ' +
      'rather than a silent wrong answer.',
  )
}

/* Every number word from the floor up, hundreds first so a longer phrase is not
   matched as its own opening decade. The suffix stays `[a-z-]+` rather than the
   ones enumerated: what broke was the decade list, and a loose tail means an
   invented compound like `forty-odd` is still caught and reported. */
const NUMBER_WORD =
  `\\b(` +
  `(?:${ONES.slice(1, 10).join('|')}) hundred(?: and [a-z-]+)?` +
  `|(?:${TENS.slice(FLOOR / 10).join('|')})(?:-[a-z]+)?` +
  `)\\b`

/* The proof, rather than the intention. Every word the counter can produce in
   range has to be one the pattern can find, so narrowing the pattern or teaching
   the counter a shape it does not cover fails here rather than in six months of
   a check quietly passing. Two hundred is well past any plausible catalog. */
for (let n = FLOOR; n <= 200; n += 1) {
  if (!new RegExp(NUMBER_WORD).test(wordFor(n))) {
    throw new Error(
      `check:art: wordFor(${n}) is "${wordFor(n)}" and NUMBER_WORD cannot match it. The two are ` +
        'built from the same arrays so that cannot happen by editing one; something has taught ' +
        'one of them a shape the other does not know.',
    )
  }
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
  /* Built above from the same arrays `wordFor` spells with, so the range this
     scans and the range the counter can produce cannot come apart. A fresh
     regex each file because a global one carries `lastIndex` between them. */
  for (const [, word] of text.matchAll(new RegExp(NUMBER_WORD, 'g'))) {
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

/* And every stroked shape has something that strokes it.
 *
 * **The count was checked and the ink never was.** A card with an entry passes
 * the check above whatever that entry draws, and `code` drew nothing at all: its
 * three paths carried `artOn`, which is a hover animation and not a colour, so
 * the whole card was an empty field. Four families were doing it, and one of
 * them, `code-block`, rendered part of its drawing and looked merely sparse.
 *
 * A shape with `fill="none"` and a stroke width has no paint of its own, so it
 * takes one from a class or it is invisible. The classes that supply one are
 * below, and the two that were being reached for, `artLine` and `artFade`, were
 * not classes at all: eight usages across two files, defined nowhere, styling
 * nothing. That is the shape of this fault, a name that looks like paint.
 *
 * Read off the stylesheet rather than listed here, so a new paint class works
 * the day it is written and a renamed one fails the same day. */
const painted = new Set(
  [...readFileSync(join(ART, 'gallery.css'), 'utf8').matchAll(/^\.(art[A-Za-z]+)\s*\{([^}]*)\}/gm)]
    .filter(([, , body]) => /(^|[\s;])stroke:/.test(body))
    .map(([, name]) => name),
)

for (const file of readdirSync(ART).filter((one) => one.endsWith('.tsx'))) {
  const text = readFileSync(join(ART, file), 'utf8')
  for (const [, tag, attrs] of text.matchAll(
    /<(path|circle|rect|line|polyline|polygon|ellipse)\b([^>]*)>/gs,
  )) {
    if (!attrs.includes('fill="none"') || !/strokeWidth/.test(attrs)) {
      continue
    }
    /* An inline `stroke` is paint as much as a class is, and one drawing uses
       it: Menu's ellipsis ring strokes `currentColor` at a fixed opacity, which
       is a fact about that shape rather than about the palette. Reading only
       the class called it invisible when it is on screen. */
    if (/(^|\s)stroke="/.test(attrs)) {
      continue
    }
    const names = /className="([^"]*)"/.exec(attrs)?.[1].split(/\s+/) ?? []
    if (names.some((one) => painted.has(one))) {
      continue
    }
    problems.push(
      `${ART}/${file}: a <${tag}> is drawn with a stroke and carries ` +
        `${names.length > 0 ? `\`${names.join(' ')}\`` : 'no class'}, none of which sets one. ` +
        'It renders as nothing. The classes that stroke are ' +
        `${[...painted].map((one) => `\`${one}\``).join(', ')}.`,
    )
  }
}

if (problems.length > 0) {
  console.error(`Gallery art out of step (${problems.length}):\n\n  ${problems.join('\n  ')}\n`)
  process.exit(1)
}

console.log(
  `art: ${families.size} families, every one drawn and every stroke painted, and ${compared} number words in the prose agree`,
)
