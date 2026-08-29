#!/usr/bin/env node
/**
 * Every family that has no printed form says so in its own stylesheet.
 *
 * **A page cannot answer this for a component.** `@media print` does not cross a
 * shadow boundary, any more than a reduced-motion rule does, so a consumer who
 * wants a clean printout cannot write one: the rule has to be inside the sheet
 * the component adopts. That is the same finding `check:css:motion` already made
 * about motion, and this is the same check for the same reason.
 *
 * **Every family, with no exempt categories.** A family with a stylesheet says
 * what it does on paper, or it fails here.
 *
 * The answers are four, and each family's own sheet carries the reason. Chrome
 * hides, because a printed page has no elsewhere to go and a spinner is a
 * promise nothing will keep. Surfaces flatten, because a lift is a shadow and a
 * printer turns a shadow into a gray smear. Boxes that scroll unclip, because a
 * box that hides is a box that loses content on paper. And anything whose fill
 * *is* the information forces itself to print: a chart with no fill is a frame,
 * and a ticked checkbox whose tick is a background prints as an empty box, which
 * is a document saying the opposite of the truth.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SOURCE } from './lib/workspace.mjs'

const TIER = SOURCE.styled

const families = readdirSync(TIER, { withFileTypes: true })
  .filter((one) => one.isDirectory())
  .map((one) => one.name)
  .sort()

const problems = []
let answered = 0

for (const family of families) {
  const dir = join(TIER, family)
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

  const prints = sheets.some((one) => /@media\s+print/.test(readFileSync(one, 'utf8')))
  if (prints) {
    answered += 1
    continue
  }

  problems.push(
    `${family}: has a stylesheet and no \`@media print\` rule, so it prints whatever the browser ` +
      'decides. A page cannot answer for it: `@media print` does not cross a shadow boundary, which ' +
      'is why every family says this for itself. Hide it, flatten it, unclip it, or force its fill ' +
      'to print, and put the reason beside the rule.',
  )
}

if (problems.length > 0) {
  console.error(
    `Families that print what they should not (${problems.length}):\n\n  ${problems.join('\n  ')}\n`,
  )
  process.exit(1)
}

console.log(`print: ${answered} families, every one of them saying what it does on paper`)
