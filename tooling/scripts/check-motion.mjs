#!/usr/bin/env node
/**
 * Every component that animates has to answer `prefers-reduced-motion` itself.
 *
 * The base layer has a global rule capping animation and transition duration for
 * a reader who asked not to be moved, and it does not reach a component. The
 * rule is `*, *::before, *::after` in the document, and `*` does not cross a
 * shadow boundary, so it reaches prose, layout and the `data-` recipes and
 * **not one part of any component in this library**.
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
 * **Per selector, not per file.** Asking only whether a reduce block exists
 * anywhere in the sheet is satisfied by eight families that still move, each
 * carrying a block that names something else.
 *
 * It still does not check *what* the block does, because there is no single
 * right answer and the component knows which one applies:
 *
 * - `Progress` swaps its traveling segment for a static hatch, because a
 *   stopped segment is parked somewhere and reads as a value.
 * - `Toast.Item` keeps its timer bar running, because it is the only thing
 *   saying how long is left and a 2px rule crossing once over eight seconds is
 *   nearer a clock than an animation.
 * - Most simply drop the transition.
 *
 * Naming the rule is the point; choosing the answer is the component's.
 *
 * Run with `bun run check:css:motion` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { SOURCE } from './lib/workspace.mjs'

/* `helix/styles/src` is in the list because `::part()` is the one construct that
   lets a document sheet write into a shadow tree, so it is the one place a
   component genuinely cannot answer for itself. */
const TIERS = [SOURCE.styles, SOURCE.styled, SOURCE.sandbox, SOURCE.gallery]

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
          at: start,
          body: css.slice(start, at),
          reduced: stack.slice(0, depth).some((outer) => REDUCE.test(outer ?? '')),
          selector: head.replace(/\s+/g, ' '),
          starting: stack.slice(0, depth).some((outer) => STARTING.test(outer ?? '')),
        })
      }
      start = at + 1
    }
  }
  return found
}

const REDUCE = /@media[^{]*prefers-reduced-motion:\s*reduce/

const STARTING = /@starting-style/

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
       one silently loses. */
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

/**
 * A `@starting-style` rule needs an ordinary rule of its own selector, above it.
 *
 * This is the shape of a transition that only works one way. A starting style
 * and an ordinary rule of the same specificity are separated by source order, so
 * a starting style written first loses even on the opening frame and the element
 * arrives already open. The exit still runs, because closing is an ordinary
 * change between two rendered states, which is what makes it hard to see.
 *
 * What is flagged is one thing only: **an ordinary rule with the same selector,
 * below the starting style.** Identical selectors carry identical specificity,
 * so source order is the whole of the decision and the starting value loses.
 *
 * A starting style with no ordinary twin is **not** flagged, because winning on
 * specificity is the other legitimate way to do this and `Tree` does it:
 * `@starting-style { [part="group"]:not([hidden]) }` is (0,2,0) against a
 * settled `[part="group"]` at (0,1,0), so it wins wherever it sits and needs no
 * counterpart.
 *
 * **What this deliberately does not check** is whether a component that
 * transitions `display` with `allow-discrete` has a starting style at all. That
 * looks like the same bug and is not: `Popover`, `Menu`, `Select` and `Combobox`
 * rest closed and open on `[data-placed]`, an attribute the floating controller
 * writes after the element is rendered, so the opening change happens between
 * two rendered states and needs no starting value. Requiring one would condemn
 * four correct components. Which of the two shapes a component wants is its own
 * call; that it does not half-write the shape it picked is what this catches.
 */
for (const tier of TIERS) {
  for (const sheet of sheets(tier)) {
    const css = readFileSync(sheet, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const parsed = rules(css)
    if (!parsed.some((rule) => rule.starting)) {
      continue
    }
    /* Earliest ordinary appearance per selector, which is the one a starting
       style has to sit below. */
    const ordinary = new Map()
    for (const rule of parsed) {
      if (rule.starting || rule.reduced) {
        continue
      }
      for (const one of parts(rule.selector)) {
        if (!ordinary.has(one)) {
          ordinary.set(one, rule.at)
        }
      }
    }
    for (const rule of parsed) {
      if (!rule.starting) {
        continue
      }
      for (const one of parts(rule.selector)) {
        const settled = ordinary.get(one)
        if (settled !== undefined && settled > rule.at) {
          problems.push(
            `${sheet}: the \`@starting-style\` for \`${one}\` sits above the ordinary rule of ` +
              'the same selector. Equal specificity, so source order decides and the starting ' +
              'value loses the one frame it exists for: the element arrives already open and only ' +
              'the exit animates. Move it below.',
          )
        }
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`Motion rules a stylesheet does not answer (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

console.log(
  'motion: every stylesheet that moves answers prefers-reduced-motion, and no starting style is outranked by its own settled rule',
)
