#!/usr/bin/env node
/**
 * Every family that has no printed form says so in its own stylesheet.
 *
 * **A page cannot answer this for a component.** `@media print` does not cross a
 * shadow boundary, any more than a reduced-motion rule does, so a consumer who
 * wants a clean printout cannot write one: the rule has to be inside the sheet
 * the component adopts. That is the same finding `check:motion` already made
 * about motion, and this is the same check for the same reason.
 *
 * **What it requires, and what it deliberately does not.** Two categories print
 * nothing at all and need no judgement per component: `actions`, because paper
 * cannot be pressed, and `overlays`, because on paper there is no over. Every
 * family in those two answers `@media print` or fails here.
 *
 * Everything else is a decision rather than a rule. A Table prints, a Card
 * prints, a chart prints; an Input prints its value and not its chrome; a
 * Navigation prints nothing because a page has no elsewhere to go. Those are
 * scoped in 165 and are not enforced here, because a check that guessed at them
 * would be asserting a design nobody has made yet.
 *
 * `DECIDED` holds the families outside those two categories that have been
 * answered anyway, so that removing one of their rules fails rather than going
 * quiet. It is the list that grows as 165 is worked through.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const SOURCE = 'helix/web/src'

/* Answered ahead of their category, and held here so they cannot be un-answered
   by accident. Each is chrome: a way of moving around a document rather than any
   of the document, which a printed page has no use for. */
const DECIDED = new Set(['command', 'megamenu', 'toolbar'])

/* The two categories where nothing prints and no per-component judgement is
   needed. Read from the source rather than listed, so a family that changes
   category is judged by the one it is in now. */
const SILENT = new Set(['actions', 'overlays'])

const families = readdirSync(SOURCE, { withFileTypes: true })
  .filter((one) => one.isDirectory())
  .map((one) => one.name)
  .sort()

const problems = []
let answered = 0

for (const family of families) {
  const dir = join(SOURCE, family)
  const sheets = []
  const walk = (at) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== '.examples') {
        walk(join(at, entry.name))
      } else if (entry.name.endsWith('.css')) {
        sheets.push(join(at, entry.name))
      }
    }
  }
  walk(dir)
  if (sheets.length === 0) {
    continue
  }

  /* The category lives in the headless tier's JSDoc, which is where a family
     says what it is. A family with no category is not judged: `field` and
     `mixins` are shared machinery rather than components. */
  let category
  const headless = join('helix/headless/src', family)
  if (existsSync(headless)) {
    const walkTs = (at) => {
      for (const entry of readdirSync(at, { withFileTypes: true })) {
        if (category !== undefined) {
          return
        }
        const path = join(at, entry.name)
        if (entry.isDirectory()) {
          walkTs(path)
        } else if (entry.name.endsWith('.ts') && !entry.name.includes('.spec.')) {
          category = /@category\s+(\w+)/.exec(readFileSync(path, 'utf8'))?.[1]
        }
      }
    }
    walkTs(headless)
  }

  const prints = sheets.some((one) => /@media\s+print/.test(readFileSync(one, 'utf8')))
  if (prints) {
    answered += 1
  }

  if (SILENT.has(category ?? '') && !prints) {
    problems.push(
      `${family}: is \`@category ${category}\` and has no \`@media print\` rule. Nothing in that ` +
        'category has a printed form, and a page cannot say so on its behalf: `@media print` does ' +
        "not cross a shadow boundary. Hide the host in the component's own sheet.",
    )
  }

  if (DECIDED.has(family) && !prints) {
    problems.push(
      `${family}: was answered for print and no longer is. It is in \`DECIDED\` in this script, ` +
        'which exists so a rule cannot be dropped quietly. Restore it, or take the family out of ' +
        'that list with the reason it now prints.',
    )
  }
}

for (const family of DECIDED) {
  if (!families.includes(family)) {
    problems.push(`${family}: is in \`DECIDED\` and is not a family. Remove it.`)
  }
}

if (problems.length > 0) {
  console.error(
    `Families that print what they should not (${problems.length}):\n\n  ${problems.join('\n  ')}\n`,
  )
  process.exit(1)
}

console.log(
  `print: ${answered} families answer \`@media print\`, and every one in ${[...SILENT].join(' and ')} is among them`,
)
