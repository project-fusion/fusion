#!/usr/bin/env node
/**
 * Checks that a component painting the page's color lets a consumer correct it.
 *
 * **`--helix-color-background` is the page, and a component is not the page.**
 * Every use of it inside a component is a claim about what that component is
 * sitting on, and the claim is right exactly as often as the component is put
 * on the page and no other ground. `Timeline`'s marker made it, painted itself
 * the page color to knock the rail out behind it, and came out darker than any
 * surface that was not the page: a card showed it as a black disc. The
 * sparkline's ring terminus made the same one and looked identical.
 *
 * The trap is that both of those *worked*, for months, because the page is what
 * anybody building a component puts it on. It fails on a card, a drawer, a
 * toast, a panel, a photograph, and none of those is where a component gets
 * built.
 *
 * **Two ways to be right, and this holds components to one of them.**
 *
 * 1. **Be page-level chrome.** An app header, the sandbox shell: these are the
 *    page's own furniture and painting the page's color is what they are for.
 *    Named in `CHROME` below, one line of reasoning each, because an allowlist
 *    without reasons becomes the place things go to stop being questioned.
 * 2. **Take the color from a hook and fall back to the page.** Written
 *    `var(--thing-background, var(--helix-color-background))`, the guess is
 *    still the guess and a consumer on a card can say otherwise in one
 *    declaration. That is the whole difference between a default and a
 *    hardcoding.
 *
 * **Every paint channel, not just `background-color`.** A ground can be painted
 * as a `border-color`, a `fill`, a `stroke`, or the spread of a `box-shadow`,
 * and the first sweep for this looked only at backgrounds and therefore missed
 * the meter's arc tick, which strokes it, and the badge's ring, which spreads
 * it. `PAINTS` is the list, and it is deliberately not "any declaration".
 *
 * **A mix toward the page is a tint, and is left alone.** `Tag` builds its fill
 * as `color-mix(in oklab, tone 14%, background)` and `Button` takes the page's
 * color as the *ink* on a filled tone. Both name this token and neither is
 * painting a ground: one is deriving a color and the other is choosing a
 * foreground. Reporting them made the check un-actionable, seventeen hits of
 * which four were the thing it was written for, so it reads the property as
 * well as the token. That they are also affected by a card is true, and is a
 * different question about tints that no ground check answers.
 *
 * **What it deliberately does not check** is whether the *fix* is a hook at all.
 * Three of the marks it reports would be better as real holes than as painted
 * ones: a mark meaning "a gap in the thing behind me" is honest only if it is
 * cut rather than filled, which is what the sparkline's ring does now and what
 * the slider's own `mask-image` already did. A hook makes the guess correctable;
 * geometry makes it unnecessary. No script can tell which a given mark wants.
 *
 * Run with `bun run check:css:grounds` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { SOURCE } from './lib/workspace.mjs'

const TIER = SOURCE.styled
const TOKEN = '--helix-color-background'

/* The properties that put a color on the page. A custom property is excluded
   by construction: it is a name for a color and says nothing about where the
   color goes, and the declaration that uses it is the one this is about. */
const PAINTS =
  /^\s*(background|background-color|border-color|border-block-color|border-block-end-color|border-block-start-color|border-inline-color|border-inline-end-color|border-inline-start-color|border-top-color|border-right-color|border-bottom-color|border-left-color|box-shadow|caret-color|color|fill|outline-color|stroke|text-decoration-color)\s*:/

/* Page-level chrome, which is the page's furniture rather than something put on
   it. Each of these paints the page's color because that is what it is. */
const CHROME = new Map([
  ['app-header', 'The bar across the top of the page, which is page chrome by definition.'],
  ['sandbox', 'A development tool that owns its whole window, not a component put on a page.'],
])

/** Every `.css` under the tier, generated `.css.ts` excluded. */
const stylesheets = (root) => {
  const found = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) {
        walk(path)
      } else if (entry.endsWith('.css')) {
        found.push(path)
      }
    }
  }
  walk(root)
  return found
}

/* Blanked, not deleted, so every offset after one still names the line it did.
   The newlines have to survive that: replacing a comment with spaces of its own
   length keeps the character count and loses the line count, and every report
   past the first comment then pointed into the middle of a comment. */
const withoutComments = (text) =>
  text.replaceAll(/\/\*[\s\S]*?\*\//g, (match) => match.replaceAll(/[^\n]/g, ' '))

const problems = []
let corrected = 0

for (const file of stylesheets(TIER)) {
  const family = file.slice(TIER.length + 1).split('/')[0]
  if (CHROME.has(family)) {
    continue
  }
  const text = withoutComments(readFileSync(file, 'utf8'))

  for (const match of text.matchAll(new RegExp(String.raw`[\w-]+\s*:[^;{}]*${TOKEN}`, 'g'))) {
    const declaration = match[0]
    if (!PAINTS.test(declaration)) {
      continue
    }
    /* Inside a `color-mix()` it is a tint and not a ground, whatever property
       it lands in. `Announcement` builds its whole treatment by mixing its tone
       toward the page, and only its `border-block-end-color` was caught, purely
       because that one happens to end in `-color` while the fill beside it is a
       `background-image`. Reporting one of a pair that are the same decision is
       worse than reporting neither. */
    if (/color-mix\(/.test(declaration)) {
      continue
    }
    /* Behind a hook is the whole test: a per-component property with the page
       as its fallback. `var(--x, var(--helix-color-background))` passes and a
       bare `var(--helix-color-background)` does not. */
    if (/var\(\s*--(?!helix-)[\w-]+\s*,/.test(declaration)) {
      corrected += 1
      continue
    }
    const line = text.slice(0, match.index).split('\n').length
    problems.push(
      `${file}:${line}: paints \`${TOKEN}\` with no hook to correct it. A component is not ` +
        'the page, so this is a guess about what it was put on, and it is wrong on a card, a ' +
        'drawer or a photograph. Put it behind a per-component property with the page as the ' +
        'fallback, or cut a real hole instead of painting one.',
    )
  }
}

if (problems.length > 0) {
  console.error(
    `Components guessing their own ground (${problems.length}):\n\n  ${problems.join('\n  ')}\n`,
  )
  process.exit(1)
}

console.log(
  `grounds: ${corrected} declarations fall back to the page color, every one of them correctable`,
)
