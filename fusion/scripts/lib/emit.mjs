/**
 * Writes a generated file, or judges the one on disk against what would be
 * written and says which lines differ.
 *
 * Every generator carried its own copy of this, read what is there, compare,
 * write or complain, and one of the ten printed which lines had moved while
 * the other nine said only that some line had. A stale file on a runner costs
 * a round trip to learn what moved, and the round trip is the whole build
 * again, so the diff is the part worth sharing.
 *
 * What it leaves to the caller is what to do about it: the exit code, the count
 * line, and whether an absent file is stale are each generator's own, so this
 * returns and the caller decides.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative } from 'node:path'
import { root } from './workspace.mjs'

/** How many differing lines are printed before the count stands in for the rest. */
const SHOWN = 20

/**
 * Writes `text` to `path`, or with `check` compares the two and prints the first
 * differing lines and the `hint` when they disagree.
 *
 * Returns `{ stale, written }`: `stale` is true only when checking and the
 * file differs, `written` only when not checking and the file changed. An
 * unchanged file is left alone in both modes.
 */
export const emit = (path, text, { check = false, hint = '' } = {}) => {
  const absent = !existsSync(path)
  const held = absent ? '' : readFileSync(path, 'utf8')
  if (!absent && held === text) {
    return { stale: false, written: false }
  }
  if (!check) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, text)
    return { stale: false, written: true }
  }
  const before = held.split('\n')
  const after = text.split('\n')
  const moved = []
  for (let index = 0; index < Math.max(before.length, after.length); index += 1) {
    if (before[index] !== after[index]) {
      moved.push([before[index], after[index]])
    }
  }
  const name = relative(root, path)
  console.error(
    `${name} is ${absent ? 'missing' : 'behind its sources'}${hint ? `. ${hint}` : '.'}\n` +
      `  ${moved.length} line${moved.length === 1 ? '' : 's'} differ:\n` +
      moved
        .slice(0, SHOWN)
        .map(([was, now]) => `  - ${was ?? '(absent)'}\n  + ${now ?? '(absent)'}`)
        .join('\n') +
      (moved.length > SHOWN ? `\n  ... and ${moved.length - SHOWN} more` : ''),
  )
  return { stale: true, written: false }
}
