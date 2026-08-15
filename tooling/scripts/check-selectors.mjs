#!/usr/bin/env node
/**
 * Checks that every `[part=]` a stylesheet selects on is a part something
 * renders.
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
      // `MixinControllerOpen(HelixElement)` names its base inside the call.
      const parent = base?.match(/(\w+)\s*\)?\s*$/)?.[1] ?? base?.trim()
      if (parent) {
        bases.set(name, parent)
      }
      renders.set(name, new Set())
      fileOf.set(name, file)
    }
    // Parts belong to the last class declared in the file, which is the only
    // class in every component file in this repo.
    const last = [...text.matchAll(/export class (\w+)/g)].at(-1)?.[1]
    if (last) {
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
  return new Set([...own, ...partsOf(bases.get(name), seen)])
}

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

if (problems.length > 0) {
  console.error(`Dead part selectors (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}`)
  }
  process.exit(1)
}
console.log(`selectors: ${checked} stylesheets, every part accounted for`)
