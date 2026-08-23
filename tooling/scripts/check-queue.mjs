/**
 * Holds `docs/19-queue.md` to one number per row.
 *
 * Written after the same collision happened twice in one evening, the second
 * time to the person who had just written a note in that file telling everyone
 * to take the next number from the bottom of the table. That is the whole
 * argument for this being a check: a note is read by whoever goes looking for
 * one, and this mistake is made by whoever does not.
 *
 * Numbers are the queue's only stable handle. A commit message naming #49 means
 * something a year later precisely because nothing else claims 49, and the
 * moment two rows share a number every commit that cites it becomes ambiguous.
 *
 * It also catches the shape that hid the first collision: rows below a blank
 * line, which is where a markdown table ends. Three of them sat under a rule
 * for hours, rendering as raw text, in the queue by intention and not in it at
 * all in fact.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FILE = 'docs/19-queue.md'
const text = readFileSync(join(ROOT, FILE), 'utf8')
const lines = text.split('\n')

const problems = []
const seen = new Map()

/* Every row anywhere in the file, so the sweeps share one number space with the
   table above them: they are the same queue and a reader citing #58 does not
   say which section it was in. */
const row = /^\|\s*(\d+)\s*\|/
for (const [index, line] of lines.entries()) {
  const found = row.exec(line)
  if (!found) {
    continue
  }
  const number = Number(found[1])
  const at = index + 1
  const first = seen.get(number)
  if (first === undefined) {
    seen.set(number, at)
  } else {
    problems.push(
      `${FILE}:${at}: #${number} is already used on line ${first}. A number is the ` +
        "queue's only stable handle, so two rows sharing one makes every commit " +
        'citing it ambiguous. Take the next free number, which is ' +
        `#${Math.max(...seen.keys()) + 1}.`,
    )
  }
}

/* And in order, inside every section.
 *
 * Twice now a row has gone in beside a number rather than after the last one,
 * and both times the file looked fine from where the edit was made. Ascending
 * order is what makes a section readable rather than a pile.
 *
 * **Every table, not the first one.** This read the first table only, which was
 * right while the queue was one table and became a guarantee covering a seventh
 * of the file the day it became seven. A check that quietly stops covering what
 * it names is the failure mode this repository keeps finding, so it walks them
 * all and says how many it walked.
 *
 * The sweeps are deliberately *not* in numeric order: that section says it is
 * ordered by what unblocks what, which is a real ordering and a more useful one
 * there. It is excluded by name rather than by position. */
const SWEEPS = '## Sweeps'
let sweeping = false
let tables = 0
let table = []
const closeTable = () => {
  for (const [index, entry] of table.entries()) {
    const previous = table[index - 1]
    if (previous && entry.number < previous.number) {
      problems.push(
        `${FILE}:${entry.at}: #${entry.number} comes after #${previous.number}. A section ` +
          'reads in order, which is what makes it a list rather than a pile.',
      )
    }
  }
  if (table.length > 0) {
    tables += 1
  }
  table = []
}
for (const [index, line] of lines.entries()) {
  if (line.startsWith('## ')) {
    closeTable()
    sweeping = line.trim() === SWEEPS
    continue
  }
  const found = row.exec(line)
  if (found && !sweeping) {
    table.push({ at: index + 1, number: Number(found[1]) })
  } else if (!found && line.trim() === '') {
    closeTable()
  }
}
closeTable()

/* A row that is not in a table is not in the queue, however much it looks like
   one. A table ends at the first blank line, so anything after that and before
   the next header row is loose text. */
let inTable = false
for (const [index, line] of lines.entries()) {
  if (/^\|\s*#\s*\|/.test(line) || /^\|\s*-+\s*\|/.test(line)) {
    inTable = true
    continue
  }
  if (line.trim() === '') {
    inTable = false
    continue
  }
  if (row.test(line) && !inTable) {
    problems.push(
      `${FILE}:${index + 1}: this row is below a blank line, so it is not in the ` +
        'table and renders as raw text. Move it into one.',
    )
  }
}

if (problems.length > 0) {
  console.error(`Queue out of step (${problems.length}):\n\n  ${problems.join('\n  ')}\n`)
  process.exit(1)
}

/* The next free number, printed rather than left to be found. It used to be the
   bottom row of the one table; with a section per area there is no bottom to
   read, and "take the next number from the bottom" is the note that has already
   failed twice in this file's own history. */
const next = Math.max(...seen.keys()) + 1
console.log(
  `queue: ${seen.size} rows across ${tables} sections, every number used once and every ` +
    `section in order. The next free number is #${next}.`,
)
