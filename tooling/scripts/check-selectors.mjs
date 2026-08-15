#!/usr/bin/env node
/**
 * Checks for CSS that cannot match what it is aimed at.
 *
 * Two rules, both of the same family: a selector that is valid, compiles, ships,
 * and quietly styles nothing.
 *
 * **A `[part=]` for a part nothing renders.**
 *
 * A shadow part is a contract between a component's markup and its own CSS, and
 * nothing enforces it: a selector naming a part that no longer exists is valid
 * CSS that matches nothing, so it fails by doing nothing at all. There is no
 * error, no warning, and no visual clue beyond the feature quietly not
 * happening.
 *
 * It has happened. Card rendered a `<div part="container">` until the refactor
 * that moved it onto the host, which left two rules behind: one a verbatim copy
 * of the `:host` block, and the other the entire horizontal layout. Nothing
 * caught it, and `orientation="horizontal"` did nothing for however long it sat
 * there. A card told to lay out sideways laid out as a stack.
 *
 * Parts are resolved through `extends`, because a styled component usually
 * renders none of its own: `helix-icon-button` styles `[part="button"]` and the
 * markup for it lives in `HelixBaseButton`, in another tier and another family.
 * Checking a component against only its own file reports every one of those as
 * dead.
 *
 * **An inherited property on the default slot's `::slotted()`.** `::slotted()`
 * matches elements and nothing else, so a component whose content may be
 * written as bare text between its tags gets none of it. The type simply does
 * not apply, and the component renders at whatever the page hands it.
 *
 * Found in five: the blockquote set a passage in display type that only reached
 * a quote wrapped in a paragraph, and the stat's value was `text-3xl` for
 * anyone who wrapped it and body text for anyone who did not. Both look like a
 * component that was never styled rather than one whose rule missed.
 *
 * Only the default slot. A named slot can hold nothing but elements, because
 * `slot="…"` is an attribute and a text node has none, so `::slotted()` there
 * reaches everything that can be there.
 *
 * The fix is to split the rule: inherited properties onto the slot, where they
 * reach assigned text through the flattened tree, and everything else left on
 * the element, which is the only thing that can carry it.
 *
 * **`:has()` inside `:host()`.** Not allowed, so the whole rule is dropped when
 * the sheet is parsed. `CSS.supports('selector(:host(:has(*)))')` reports false
 * in Chrome 148, and `:not(:has(...))` inside it is refused for the same
 * reason, which is the form that actually shipped.
 *
 * This one is written down in the area rules and shipped anyway. The drawer
 * hid its header with `:host(:not(:has([slot="header"])))`, the rule did
 * nothing, and every drawer with no header painted a hairline across its top
 * with nothing above it. There is no fix at the selector level, because the
 * detection does not exist: a region that cannot know whether it was filled
 * must not draw anything that depends on it being filled.
 *
 * Run with `bun run check:selectors` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const TIERS = ['helix/core/src', 'helix/headless/src', 'helix/web/src', 'helix/sandbox/src']

/** Every `.ts` under a tier, skipping specs and generated stylesheets. */
const sources = (dir) => {
  const found = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      found.push(...sources(path))
    } else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts') && !entry.endsWith('.css.ts')) {
      found.push(path)
    }
  }
  return found
}

/** Every `.css` under a tier. Generated `.css.ts` files are the same content. */
const stylesheets = (dir) => {
  const found = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      found.push(...stylesheets(path))
    } else if (entry.endsWith('.css')) {
      found.push(path)
    }
  }
  return found
}

/* What each class renders, and what it extends. A class is recorded by name
   rather than by file, because that is what `extends` names and what crosses a
   tier boundary. */
const renders = new Map()
const bases = new Map()
const fileOf = new Map()

for (const tier of TIERS) {
  for (const file of sources(tier)) {
    /* Comments out of the source too, and for a sharper reason than in the CSS.
       These components document themselves in prose that quotes markup: the base
       card's own JSDoc explains that `<div part="container">` would be a second
       box doing nothing, which is exactly the wrapper it does not render. Read
       with comments in, the scanner credited it with rendering the very part
       whose absence it was describing, and the check passed on the bug it was
       written for. Verified by putting that bug back: reported clean before this
       line, reported on the line after. */
    const text = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    for (const [, name, base] of text.matchAll(
      /export class (\w+)(?:\s+extends\s+([\w<>(), ]+?))?\s*\{/g,
    )) {
      /* Every name in the clause, not just the innermost. A styled control
         extends something like `MixinControllerChecked(MixinField(HelixFormElement))`
         and each of those three renders part of the markup, so reading only the
         base left everything a mixin renders looking dead. Found by the check
         itself the first time a mixin rendered a part: it reported five, and all
         five existed. */
      for (const parent of base?.match(/\w+/g) ?? []) {
        if (parent !== name) {
          bases.set(name, [...(bases.get(name) ?? []), parent])
        }
      }
      renders.set(name, new Set())
      fileOf.set(name, file)
    }
    /* Parts belong to the last thing declared in the file, which is the only
       one in every component file in this repo. A mixin is a `const` rather than
       a class, and its markup is as real as any component's. */
    const declarations = [...text.matchAll(/export (?:class|const) (\w+)/g)].map(([, name]) => name)
    const last = declarations.at(-1)
    if (last) {
      if (!renders.has(last)) {
        renders.set(last, new Set())
        fileOf.set(last, file)
      }
      for (const [, part] of text.matchAll(/part="([a-z-]+)"/g)) {
        renders.get(last)?.add(part)
      }
    }
  }
}

/** Everything a class renders, including what it inherits. */
const partsOf = (name, seen = new Set()) => {
  if (!name || seen.has(name)) {
    return new Set()
  }
  seen.add(name)
  const own = renders.get(name) ?? new Set()
  const inherited = (bases.get(name) ?? []).flatMap((parent) => [...partsOf(parent, seen)])
  return new Set([...own, ...inherited])
}

/* Properties that reach a text node by inheriting. Anything outside this set
   has to stay on `::slotted()`, because a text node has no box to put it on. */
const INHERITED = new Set([
  'color',
  'font',
  'font-family',
  'font-size',
  'font-style',
  'font-variant',
  'font-weight',
  'letter-spacing',
  'line-height',
  'text-align',
  'text-indent',
  'text-transform',
  'white-space',
  'word-break',
  'word-spacing',
])

const problems = []
let checked = 0

for (const tier of TIERS) {
  for (const sheet of stylesheets(tier)) {
    /* Comments out first. These stylesheets explain themselves at length, and
       a comment naming the part a rule used to select on is prose about a
       mistake, not the mistake. Reported once for real, on the accordion, where
       the note explaining the fix was itself flagged as the fault. */
    const css = readFileSync(sheet, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const selected = new Set([...css.matchAll(/\[part="([a-z-]+)"\]/g)].map(([, name]) => name))
    if (selected.size === 0) {
      continue
    }
    /* The class beside it. A stylesheet lives with the component it dresses,
       so the sibling `.ts` of the same basename is the one that owns it. */
    const sibling = sheet.replace(/\.css$/, '.ts')
    const owner = [...fileOf].find(([, path]) => path === sibling)?.[0]
    if (!owner) {
      problems.push(`${sheet}: no component beside it, so its parts cannot be checked`)
      continue
    }
    checked += 1
    const available = partsOf(owner)
    for (const part of [...selected].sort()) {
      if (!available.has(part)) {
        const had = [...available].sort().join(', ') || 'none'
        problems.push(`${sheet}: [part="${part}"] matches nothing. ${owner} renders: ${had}`)
      }
    }
  }
}

/* The second rule, over every stylesheet rather than only those naming a part,
   and read with comments already stripped for the same reason as above. */
for (const tier of TIERS) {
  for (const sheet of stylesheets(tier)) {
    const css = readFileSync(sheet, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const [, body] of css.matchAll(
      /slot:not\(\[name\]\)::slotted\([^)]*\)[^{]*\{([^}]*)\}/g,
    )) {
      const missed = [...body.matchAll(/([a-z-]+)\s*:/g)]
        .map(([, name]) => name)
        .filter((name) => INHERITED.has(name))
      if (missed.length > 0) {
        problems.push(
          `${sheet}: the default slot's ::slotted() sets ${[...new Set(missed)].sort().join(', ')}, ` +
            'which a value written as bare text never receives. Move those onto the slot itself.',
        )
      }
    }
  }
}

/* The third rule. Comments are already gone from `css`, but this scans the
   files again rather than folding into the loop above, which only visits sheets
   that name a part. */
for (const tier of TIERS) {
  for (const sheet of stylesheets(tier)) {
    const css = readFileSync(sheet, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const [match] of css.matchAll(/:host\([^{]*:has\(/g)) {
      problems.push(
        `${sheet}: \`${match.trim()}…\` is dropped when the sheet is parsed. ` +
          '`:has()` is not allowed inside the functional `:host()`, in any form, ' +
          'so this rule has never matched. A region cannot detect its own emptiness.',
      )
    }
  }
}

if (problems.length > 0) {
  console.error(`Selectors that match nothing (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}`)
  }
  process.exit(1)
}
console.log(
  `selectors: ${checked} stylesheets, every part accounted for, no slotted-only type, no :has() in :host()`,
)
