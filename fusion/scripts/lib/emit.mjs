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
 * What it leaves to the caller is what to do about it: the exit code and the
 * count line are each generator's own, so this returns and the caller decides.
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
 * Returns `{ absent, stale, written }`: `stale` is true only when checking and
 * the file differs, `written` only when not checking and the file changed, and
 * `absent` only when checking found no file to compare. An unchanged file is
 * left alone in both modes.
 *
 * **Absent is not stale, and a fresh clone is what made that the answer
 * everywhere.** No generated file is committed, so one that is not on disk is
 * one nothing has built yet rather than one behind its sources, and it is not
 * something a push can carry. Reported as stale it took down the pre-push hook
 * on the first check a clone reached, and `verify` never saw it, because CI
 * builds what the checks read before it runs any of them. So this says which
 * file is missing and what writes it, and passes: what catches a generator that
 * has stopped writing is the build that reads the file, which cannot start.
 *
 * `build-token-layer.mjs` had already reached this for `dist/tokens.json`, in
 * the days when `src/tokens.css` beside it was tracked and a missing one there
 * did mean a deletion.
 */
export const emit = (path, text, { check = false, hint = '' } = {}) => {
  const absent = !existsSync(path)
  if (check && absent) {
    console.error(`${relative(root, path)} is not generated yet${hint ? `. ${hint}` : '.'}`)
    return { absent: true, stale: false, written: false }
  }
  const held = absent ? '' : readFileSync(path, 'utf8')
  if (!absent && held === text) {
    return { absent: false, stale: false, written: false }
  }
  if (!check) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, text)
    return { absent: false, stale: false, written: true }
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
    `${name} is behind its sources${hint ? `. ${hint}` : '.'}\n` +
      `  ${moved.length} line${moved.length === 1 ? '' : 's'} differ:\n` +
      moved
        .slice(0, SHOWN)
        .map(([was, now]) => `  - ${was ?? '(absent)'}\n  + ${now ?? '(absent)'}`)
        .join('\n') +
      (moved.length > SHOWN ? `\n  ... and ${moved.length - SHOWN} more` : ''),
  )
  return { absent: false, stale: true, written: false }
}
