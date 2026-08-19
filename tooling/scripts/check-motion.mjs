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
 * What counts as answering it: every selector that carries a moving declaration
 * appears inside a `@media (prefers-reduced-motion: reduce)` block in the same
 * stylesheet.
 *
 * **Per selector, not per file, and the difference mattered.** The first version
 * asked only whether a reduce block existed anywhere in the sheet, which eight
 * families satisfied while still moving: the toast's exit collapse, the tree's
 * chevron, the select's trigger, the carousel's indicator, and the card
 * appearances on checkbox and radio. Each had a block that named something else.
 *
 * It still does not check *what* the block does, because there is no single
 * right answer and the component knows which one applies:
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

/* `helix/styles/src` is in the list, and leaving it out was the gap that let two
   moving `::part()` rules ship unanswered. `::part()` is the one construct that
   lets a document sheet write into a shadow tree, so it is the one place a
   component genuinely cannot answer for itself. */
const TIERS = ['helix/styles/src', 'helix/web/src', 'helix/sandbox/src']

/* `transition` and `animation` both, because both are capped by the rule that
   does not reach here, and a transition on `opacity` moves a reader exactly as
   much as an animation does. */
const MOVES = /^\s*(animation|transition)(-duration|-name)?\s*:/m

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

/**
 * Every rule in a sheet as `{ selector, body, reduced }`.
 *
 * Brace-counted rather than regex-matched, so a nested `@media` or `@supports`
 * is walked into rather than swallowed, and a rule inside a reduce block is
 * marked as such however deeply it sits.
 */
const rules = (css) => {
  const found = []
  let depth = 0
  let start = 0
  const stack = []
  for (let at = 0; at < css.length; at += 1) {
    if (css[at] === '{') {
      const head = css.slice(start, at).trim()
      stack[depth] = head
      depth += 1
      start = at + 1
    } else if (css[at] === '}') {
      depth -= 1
      const head = stack[depth] ?? ''
      if (!head.startsWith('@')) {
        found.push({
          body: css.slice(start, at),
          reduced: stack.slice(0, depth).some((outer) => REDUCE.test(outer ?? '')),
          selector: head.replace(/\s+/g, ' '),
        })
      }
      start = at + 1
    }
  }
  return found
}

const REDUCE = /@media[^{]*prefers-reduced-motion:\s*reduce/

/** One selector per comma, normalized so the two sides compare. */
const parts = (selector) =>
  selector
    .split(',')
    .map((one) => one.trim().replace(/\s+/g, ' '))
    .filter(Boolean)

/**
 * Whether a selector has to be named, or is already covered by the global rule.
 *
 * The base layer's `*, *::before, *::after` cap reaches everything in the
 * document, so a light-DOM selector in that same file is answered by definition
 * and naming it again would be noise. What it cannot reach is a shadow tree,
 * which from this file means `::part()` and nothing else. A component sheet is
 * all shadow tree, so everything in one has to be named.
 */
const needsNaming = (sheet, selector) =>
  sheet.startsWith('helix/styles/') ? selector.includes('::part(') : true

const problems = []

for (const tier of TIERS) {
  for (const sheet of sheets(tier)) {
    const css = readFileSync(sheet, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const parsed = rules(css)
    /* What the sheet has already answered for. Compared as normalized selector
       text: a reduce rule has to name the same selector, which also means it
       carries the same specificity and therefore actually wins. Naming a looser
       one silently loses, which is the trap that made the per-file check
       useless. */
    const answered = new Set(
      parsed.filter((rule) => rule.reduced).flatMap((rule) => parts(rule.selector)),
    )
    for (const rule of parsed) {
      if (rule.reduced) {
        continue
      }
      const moving = rule.body
        .split('\n')
        .filter((line) => MOVES.test(line) && !ONLY_NONE.test(line))
      if (moving.length === 0) {
        continue
      }
      /* One comma-separated selector at a time, because a rule can be half
         answered and legitimately so: in the base layer
         `[data-button], helix-button::part(button)` needs only the `::part`
         half named, since the other half is light DOM and the global `*` rule
         in the same file already caps it. */
      const unanswered = parts(rule.selector).filter(
        (one) => !answered.has(one) && needsNaming(sheet, one),
      )
      if (unanswered.length === 0) {
        continue
      }
      problems.push(
        `${sheet}: \`${unanswered.join(', ')}\` moves and is not named in a ` +
          '`@media (prefers-reduced-motion: reduce)` block. A reduce rule has to repeat the ' +
          'selector: one written looser loses on specificity and does nothing.',
      )
    }
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
