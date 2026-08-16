#!/usr/bin/env node
/**
 * Every component that animates has to answer `prefers-reduced-motion` itself.
 *
 * The base layer has a global rule capping animation and transition duration for
 * a reader who asked not to be moved, and its comment used to claim it beat "a
 * component's own transition". It does not. The rule is `*, *::before,
 * *::after` in the document, and `*` does not cross a shadow boundary, so it
 * reaches prose, layout and the `data-` recipes and **not one part of any
 * component in this library**.
 *
 * Measured under `prefers-reduced-motion: reduce`: a light-DOM element resolved
 * to `1e-05s`, and a component's shadow child kept its full authored duration.
 * That is not fixable from the base layer, because a document rule has no way
 * in. It is a rule for writing components, which makes it a job for a check.
 *
 * What counts as answering it: a `@media (prefers-reduced-motion: reduce)` block
 * anywhere in the same stylesheet. This deliberately does not check *what* the
 * block does, because there is no single right answer and the component knows
 * which one applies:
 *
 * - `Progress` swaps its travelling segment for a static hatch, because a
 *   stopped segment is parked somewhere and reads as a value.
 * - `Toast.Item` keeps its timer bar running, because it is the only thing
 *   saying how long is left and a 2px rule crossing once over eight seconds is
 *   nearer a clock than an animation.
 * - Most simply drop the transition.
 *
 * Naming the rule is the point; choosing the answer is the component's.
 *
 * Run with `bun run check:motion` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

const TIERS = ['helix/web/src', 'helix/sandbox/src']

/* `transition` and `animation` both, because both are capped by the rule that
   does not reach here, and a transition on `opacity` moves a reader exactly as
   much as an animation does. */
const MOVES = /^\s*(animation|transition)(-duration|-name)?\s*:/m

const ANSWERS = /@media[^{]*prefers-reduced-motion:\s*reduce/

/* A transition that only carries `none` is a component switching motion off,
   which is the answer rather than the question. */
const ONLY_NONE = /^\s*(animation|transition)[^:]*:\s*none\s*;?\s*$/

const sheets = (dir) => {
  const found = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      found.push(...sheets(path))
    } else if (extname(path) === '.css') {
      found.push(path)
    }
  }
  return found
}

const problems = []

for (const tier of TIERS) {
  for (const sheet of sheets(tier)) {
    const css = readFileSync(sheet, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    if (!MOVES.test(css)) {
      continue
    }
    const moving = css.split('\n').filter((line) => MOVES.test(line) && !ONLY_NONE.test(line))
    if (moving.length === 0 || ANSWERS.test(css)) {
      continue
    }
    problems.push(
      `${sheet}: moves (${moving.length} declaration${moving.length === 1 ? '' : 's'}) and has no ` +
        '`@media (prefers-reduced-motion: reduce)` block. The base layer cannot reach in here: ' +
        'its rule is `*` in the document, which does not cross a shadow boundary.',
    )
  }
}

if (problems.length > 0) {
  console.error(`Components that move without answering the preference (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

console.log('motion: every stylesheet that moves answers prefers-reduced-motion')
