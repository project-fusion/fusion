#!/usr/bin/env node
/**
 * A token a component reads has to resolve on a page that matches no state.
 *
 * **`check:css:tokens` verifies that a token is defined, not that it resolves, and
 * the difference is a component drawn at 950 pixels.** It builds its `defined`
 * set from any `--helix-*:` declaration anywhere in the styles package, so a
 * token declared only inside `[data-density]` counts as present. Every ordinary
 * page is in no density region at all, and there the `var()` falls through to
 * nothing and the whole declaration is dropped.
 *
 * Measured 28 Aug 2026 when exactly that happened to the six relative size
 * tokens, against the values from before they existed:
 *
 * ```
 * select caret   16px -> 950     menu item   32 -> 18
 * tree item      40   -> 20      option row  32 -> 28
 * listbox        66   -> 61      pagination  32 -> 24
 * ```
 *
 * `check:css:tokens` reported green throughout, because the four `[data-density*]`
 * rules in `base.css` still declared them. Fifty-nine stylesheets were reading a
 * token that resolved to nothing on the default page.
 *
 * **It happened three times in one day, which is what makes it a check.** Once
 * when the declarations were lost from `tokens.css`; once when they were
 * restored with `git checkout`, which brought back a version from before they
 * existed; and once when they were hand-written into `tokens.css` at all, that
 * file being *generated* from `tokens.ts` and rewritten by the next `regen`. The
 * third is the interesting one: the fix looked right, the browser disagreed, and
 * nothing between the two said so.
 *
 * **A selector list containing `:root` is unconditional**, which the first
 * version of this analysis got wrong and reported all 186 tokens for. Most of
 * the layer is declared on `:root, [data-helix-theme]`, and a list applies if any
 * one of its selectors matches. Comments are stripped before the braces are
 * counted, for the reason `check:css:selectors` records: a `{` inside a comment ends
 * the block early and every token after it reads as conditional.
 *
 * Run with `bun run check:css:token-defaults` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SOURCE } from './lib/workspace.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const LAYER = [
  'helix/styles/src/primitives.css',
  'helix/styles/src/tokens.css',
  'helix/styles/src/base.css',
]
const SHEETS = [SOURCE.styled, SOURCE.sandbox]

/** Comments hold braces, and an uncounted one ends a block early. */
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Whether a rule applies with no attribute, no theme stamp and no media query.
 *
 * A selector list matches if any one of its selectors does, so a single `:root`
 * in a list of five is enough. `html` is the same element and is what the base
 * layer writes.
 */
const unconditional = (selector) =>
  selector.split(',').some((part) => /^\s*(:root|html)\s*$/.test(part))

/** Tokens declared at the top level of an unconditional rule. */
const defaults = new Set()
for (const file of LAYER) {
  const css = strip(readFileSync(join(ROOT, file), 'utf8'))
  const stack = []
  let buffer = ''
  for (const character of css) {
    if (character === '{') {
      stack.push(buffer.trim())
      buffer = ''
    } else if (character === '}') {
      stack.pop()
      buffer = ''
    } else if (character === ';') {
      const declaration = /^\s*(--helix-[\w-]+)\s*:/.exec(buffer)
      /* Depth one, so a `:root` nested inside `@media (prefers-color-scheme)`
         is correctly not a default: it is the dark arm of one. */
      if (declaration && stack.length === 1 && unconditional(stack[0])) {
        defaults.add(declaration[1])
      }
      buffer = ''
    } else {
      buffer += character
    }
  }
}
if (defaults.size === 0) {
  console.error(
    'check-token-defaults: found no unconditional definitions, refusing to pass vacuously',
  )
  process.exit(1)
}

const walk = function* (dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      yield* walk(path)
    } else if (path.endsWith('.css') && !path.includes('.examples')) {
      yield path
    }
  }
}

/** Every token a component reads, and the first sheet that reads it. */
const read = new Map()
for (const dir of SHEETS) {
  for (const file of walk(join(ROOT, dir))) {
    for (const [, token] of strip(readFileSync(file, 'utf8')).matchAll(/var\((--helix-[\w-]+)/g)) {
      if (!read.has(token)) {
        read.set(token, relative(ROOT, file))
      }
    }
  }
}

const problems = []
for (const [token, where] of [...read].sort()) {
  if (!defaults.has(token)) {
    problems.push(
      `${token} is read by ${where} and has no definition that applies with no attribute, no theme ` +
        'stamp and no media query. On a page matching none of those the `var()` resolves to nothing ' +
        'and the declaration is dropped, which is silent: nothing errors and the component draws at ' +
        'whatever the property falls back to.',
    )
  }
}

if (problems.length > 0) {
  console.error(`Tokens with no unconditional default (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}`)
  }
  console.error('')
  process.exit(1)
}

console.log(
  `token defaults: ${read.size} tokens read by components, every one resolving with no state matched ` +
    `(${defaults.size} unconditional definitions).`,
)
