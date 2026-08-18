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
 * five files under `site/ui/lib/component-art`. Two things about it are silent:
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
const ART = 'site/ui/lib/component-art'

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

/* And the numbers the prose states. Written out as words, which is the house
   style everywhere else in these files, so they are matched as words. */
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
]
const wordFor = (count) => WORDS[count - 49]
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

for (const file of ['index.tsx', 'core.tsx']) {
  const text = readFileSync(join(ART, file), 'utf8')
  for (const [, word] of text.matchAll(/\b(f(?:orty|ifty)-[a-z]+|sixty(?:-[a-z]+)?|fifty)\b/g)) {
    if (word !== said && word !== foldersSaid) {
      problems.push(
        `${ART}/${file}: says "${word}" where the catalog has ${families.size} families ` +
          `("${said}") over ${folders} folders in helix/web/src ("${foldersSaid}").`,
      )
    }
  }
}

if (problems.length > 0) {
  console.error(`Gallery art out of step (${problems.length}):\n\n  ${problems.join('\n  ')}\n`)
  process.exit(1)
}

console.log(`art: ${families.size} families, every one drawn, and the prose agrees`)
