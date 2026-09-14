/**
 * Holds `.local/queue.md` to one number per row.
 *
 * A check rather than a note in the file, because a note is read by whoever
 * goes looking for one and this mistake is made by whoever does not.
 *
 * Numbers are the queue's only stable handle. A commit message naming #49 means
 * something a year later precisely because nothing else claims 49, and the
 * moment two rows share a number every commit that cites it becomes ambiguous.
 *
 * It also catches rows below a blank line, which is where a markdown table
 * ends. Those render as raw text: in the queue by intention and not in it at
 * all in fact.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { root } from '@fusion.dev/scripts/workspace'

/* **`.local` is gitignored, and that is the point.** The queue holds the
   reasoning behind unfinished and declined decisions, which is worth keeping and
   is nobody else's to read.

   **So this check is local and says so rather than failing.** It is not in
   `verify`, `check` or the pre-push hook, so nothing in CI reads the queue and a
   machine with no copy is the ordinary case rather than a fault. */
const FILE = '.local/queue.md'
if (!existsSync(join(root, FILE))) {
  console.log(`queue: no ${FILE} on this machine, so there is nothing to check.`)
  process.exit(0)
}
const text = readFileSync(join(root, FILE), 'utf8')
const lines = text.split('\n')

const problems = []

/* **Every `check:` name a row cites, held to one that exists.**
 *
 * The scopes were swept out of this file on 31 Aug and writing that check found
 * a larger drift underneath: 219 of the `check:*` names here resolved to no
 * script, because the gates moved into `helix component` and `fusion prose` and
 * the rows kept citing the scripts they used to be. A name that runs nothing is
 * an instruction that cannot be followed, and it is the kind that reads as
 * current right up until somebody types it.
 *
 * Read from `package.json` rather than from a list, so a script renamed again
 * fails here on the same day rather than the next time anybody greps.
 */
const scripts = new Set(
  Object.keys(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts ?? {}),
)

/* And every rule name, from the two CLIs that own them. A rule is a file, so
   the directory listing is the register: `hook_names.rs` is `hook-names`. */
const rules = new Set(
  ['helix/cli/src/component', 'fusion/cli/src/prose', 'fusion/cli/src/rules', 'fusion/cli/src/spec']
    .flatMap((where) => {
      try {
        return readdirSync(join(root, where))
      } catch {
        return []
      }
    })
    .filter((one) => one.endsWith('.rs') && one !== 'mod.rs')
    .map((one) => one.replace(/\.rs$/, '').replaceAll('_', '-')),
)

/* The row about the drift quotes the old names to say what they were, so it is
   the one row allowed to carry them. */
const QUOTING = new Set([340])

for (const [index, line] of lines.entries()) {
  const found = /^\|\s*(\d+)\s*\|/.exec(line)
  if (!found || QUOTING.has(Number(found[1]))) {
    continue
  }
  for (const [, name] of line.matchAll(/`(check:[a-z][a-z0-9:-]*)`/g)) {
    if (scripts.has(name) || name === 'check:') {
      continue
    }
    const base = name.split(':').at(-1)
    const instead = rules.has(base) ? `the \`${base}\` rule` : 'the script that replaced it'
    problems.push(
      `${FILE}:${index + 1}: #${found[1]} cites \`${name}\`, which is not a script in ` +
        `package.json. The gates moved into the two CLIs, so this wants ${instead}.`,
    )
  }
}
const seen = new Map()
/** Columns in the table currently being read, from its own header row. */
let width

/* Every row anywhere in the file, so the sweeps share one number space with the
   table above them: they are the same queue and a reader citing #58 does not
   say which section it was in. */
const row = /^\|\s*(\d+)\s*\|/
const headerRow = /^\|\s*#\s*\|/
for (const [index, line] of lines.entries()) {
  if (line.startsWith('## ')) {
    width = undefined
  }
  if (headerRow.test(line)) {
    width = line.split('|').length - 2
  }
  const found = row.exec(line)
  if (!found) {
    continue
  }
  const number = Number(found[1])
  const at = index + 1
  /* **A row wider than its header loses the surplus, silently.**
   *
   * GitHub inserts empty cells when a row has too few and *ignores* the excess
   * when it has too many, so a row written `| n | done | note | amendment |`
   * under a three column header renders the note and drops the amendment. It
   * looks correct in the source and correct on the page, and the part that is
   * missing is the part that was added last, which is usually the correction.
   *
   * Measured on this file: 42 rows had grown a cell per amendment and 111 KB of
   * it, an eighth, had never been rendered. Confirmed against GitHub's own
   * renderer rather than against the spec.
   *
   * The header is read per table, because the sweeps could take a different
   * shape later and a number hard coded here would be a second definition. */
  if (width !== undefined) {
    const cells = line.split('|').length - 2
    if (cells > width) {
      problems.push(
        `${FILE}:${at}: #${number} has ${cells} cells where the table's header has ` +
          `${width}. The surplus is dropped when this renders, so ${cells - width} ` +
          'piece(s) of the row are invisible on GitHub. Fold them into the last ' +
          'column rather than adding a cell.',
      )
    }
  }
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
 * A row goes in beside a number rather than after the last one, and the file
 * looks fine from where the edit was made. Ascending order is what makes a
 * section readable rather than a pile.
 *
 * **Every table, not the first one.** Reading the first table only covers a
 * seventh of the file while reporting on the queue, so this walks them all and
 * says how many it walked.
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

/* The next free number, printed rather than left to be found: with a section
   per area there is no single bottom row to read it off. */
const next = Math.max(...seen.keys()) + 1
console.log(
  `queue: ${seen.size} rows across ${tables} sections, every number used once and every ` +
    `section in order. The next free number is #${next}.`,
)
