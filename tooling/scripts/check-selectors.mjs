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
 * **A `:host([attr])` for an attribute no class declares.** The selector works,
 * which is what makes it worse than a dead one: the attribute is a real API
 * that reaches no manifest, no JSX type and no documentation page, so the only
 * way to find it is to read the stylesheet. `appearance` on the toggle group
 * was exactly this, branching on `[appearance="filled"]` and on the attribute
 * being absent, for as long as the component had existed.
 *
 * Attribute names are resolved the way Lit resolves them: a property's own name
 * lowercased, or the explicit `attribute:` where one is given, gathered through
 * `extends` and through every mixin in the clause. `data-` is exempt, because
 * those are written imperatively rather than declared, which is the whole
 * reason they are `data-`.
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
import { basename, join } from 'node:path'

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
/* What each shared `draw…` helper writes, read once from core's utils. */
const helpers = new Map()
for (const dir of readdirSync('helix/core/src/utils', { withFileTypes: true })) {
  if (!dir.isDirectory() || !dir.name.startsWith('draw-')) {
    continue
  }
  for (const entry of readdirSync(join('helix/core/src/utils', dir.name))) {
    if (!entry.endsWith('.ts') || entry.includes('.spec.')) {
      continue
    }
    const code = readFileSync(join('helix/core/src/utils', dir.name, entry), 'utf8')
    const name = /export const (draw[A-Z]\w*)/.exec(code)?.[1]
    if (name) {
      helpers.set(
        name,
        [...code.matchAll(/part="([a-z0-9-]+)"/g)].map((m) => m[1]),
      )
    }
  }
}
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
      /export class (\w+)(?:\s+extends\s+([\w<>(),\s]+?))?\s*\{/g,
    )) {
      /* Newlines allowed in the clause, which is not a detail. A chain long
         enough to wrap, as `Select`'s is at three mixins, does not match a
         class excluding them, so the scanner saw no bases at all and reported
         every inherited part as dead. It read as five faults in a new component
         and was one in the regex here.
 
         Every name in the clause, not just the innermost. A styled control
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
      /* And the parts a shared `draw…` helper writes on the component's behalf.
       *
       * The same blind spot `check:parts` had, and it fails the opposite way,
       * which is why both were needed: there, five real parts read as
       * documented-and-never-rendered; here, five live stylesheet rules read as
       * matching nothing. Two checks disagreeing with the code in opposite
       * directions about one fact. */
      for (const [, helper] of text.matchAll(/\b(draw[A-Z]\w*)\s*\(/g)) {
        for (const part of helpers.get(helper) ?? []) {
          renders.get(last)?.add(part)
        }
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
    /* Who has to render these parts.
     *
     * Usually one class, the sibling `.ts` of the same basename, because a
     * stylesheet lives with the component it dresses.
     *
     * A shared sheet has no sibling and is composed instead, so its owners are
     * whoever imports it. That is not a weaker check but a stronger one: a part
     * named in `field.css` has to be rendered by every one of the ten controls
     * that compose it, and a control that stops rendering one fails here rather
     * than quietly losing a rule. Resolved from the imports rather than from a
     * list, so composing the sheet is what enrols a component in the check. */
    const sibling = sheet.replace(/\.css$/, '.ts')
    let owners = [...fileOf].filter(([, path]) => path === sibling).map(([name]) => name)
    if (owners.length === 0) {
      const specifier = basename(sheet, '.css')
      owners = [...fileOf]
        .filter(([, path]) => readFileSync(path, 'utf8').includes(`/${specifier}.css.js'`))
        .map(([name]) => name)
    }
    if (owners.length === 0) {
      problems.push(`${sheet}: nothing owns it, so its parts cannot be checked`)
      continue
    }
    checked += 1
    for (const owner of owners) {
      const available = partsOf(owner)
      for (const part of [...selected].sort()) {
        if (!available.has(part)) {
          const had = [...available].sort().join(', ') || 'none'
          problems.push(`${sheet}: [part="${part}"] matches nothing. ${owner} renders: ${had}`)
        }
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

/* What each class declares as an attribute, by the rules Lit uses: the property
   name lowercased, and the explicit `attribute:` where one is given. */
const attributes = new Map()

for (const tier of TIERS) {
  for (const file of sources(tier)) {
    const text = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    for (const [, name] of text.matchAll(/export (?:class|const) (\w+)/g)) {
      if (!attributes.has(name)) {
        attributes.set(name, new Set())
      }
    }
    const owner = [...text.matchAll(/export (?:class|const) (\w+)/g)].at(-1)?.[1]
    if (!owner) {
      continue
    }
    const declared = attributes.get(owner)
    /* Each decorator with the property that follows it. `attribute: false` opts
       out of having one at all, and `attribute: 'x'` names it. */
    for (const [, options, property] of text.matchAll(
      /@property\(([^)]*)\)\s*(?:override\s+)?(\w+)/g,
    )) {
      const explicit = options.match(/attribute:\s*'([^']+)'/)
      if (/attribute:\s*false/.test(options)) {
        continue
      }
      declared?.add(explicit ? explicit[1] : property.toLowerCase())
    }
  }
}

/** Every attribute a class may be selected on, including what it inherits. */
const attributesOf = (name, seen = new Set()) => {
  if (!name || seen.has(name)) {
    return new Set()
  }
  seen.add(name)
  const own = attributes.get(name) ?? new Set()
  const inherited = (bases.get(name) ?? []).flatMap((parent) => [...attributesOf(parent, seen)])
  return new Set([...own, ...inherited])
}

/* Written imperatively rather than declared, which is what `data-` is for, plus
   the handful the platform owns. */
const NOT_PROPERTIES = /^(?:data-|aria-)|^(?:dir|disabled|hidden|id|lang|slot|part|popover)$/

for (const tier of TIERS) {
  for (const sheet of stylesheets(tier)) {
    const css = readFileSync(sheet, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const sibling = sheet.replace(/\.css$/, '.ts')
    const owner = [...fileOf].find(([, path]) => path === sibling)?.[0]
    if (!owner) {
      continue
    }
    const available = attributesOf(owner)
    const used = new Set(
      [...css.matchAll(/:host\([^)]*?\[([a-z-]+)[\]=]/g)].map(([, name]) => name),
    )
    for (const attribute of [...used].sort()) {
      if (NOT_PROPERTIES.test(attribute) || available.has(attribute)) {
        continue
      }
      problems.push(
        `${sheet}: \`:host([${attribute}])\` selects an attribute ${owner} does not declare. ` +
          'It works, which is the problem: it is an API in a stylesheet and nowhere else, ' +
          'so it reaches no manifest, no JSX type and no documentation page.',
      )
    }
  }
}

/**
 * What is actually inside each `:host(...)`, one string per occurrence.
 *
 * Paren-counted rather than matched with a regex, and the regex is why: it was
 * `/:host\([^{]*:has\(/`, whose `[^{]*` runs straight past the closing paren of
 * `:host()` and on through the descendant selectors after it. So a perfectly
 * legal `:host([appearance="card"]) [part="field"]:has(:focus-visible)` was
 * reported as dropped, and the rule it named works. `:host()` takes a compound
 * selector that can itself hold parens, `:not()` most obviously, so counting
 * them is the only way to know where the argument ends.
 *
 * The failure was a false positive, which for a checker is the expensive
 * direction: a real fault gets fixed, and a checker that cries about correct
 * code gets its rule deleted.
 */
const hostArguments = (css) => {
  const found = []
  for (let at = css.indexOf(':host('); at !== -1; at = css.indexOf(':host(', at + 1)) {
    let depth = 0
    for (let scan = at + ':host'.length; scan < css.length; scan += 1) {
      if (css[scan] === '(') {
        depth += 1
      } else if (css[scan] === ')') {
        depth -= 1
        if (depth === 0) {
          found.push(css.slice(at + ':host('.length, scan))
          break
        }
      } else if (css[scan] === '{') {
        // An unbalanced `:host(` cannot be a selector. Nothing to report.
        break
      }
    }
  }
  return found
}

/* The third rule. Comments are already gone from `css`, but this scans the
   files again rather than folding into the loop above, which only visits sheets
   that name a part. */
for (const tier of TIERS) {
  for (const sheet of stylesheets(tier)) {
    const css = readFileSync(sheet, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const inside of hostArguments(css)) {
      if (inside.includes(':has(')) {
        problems.push(
          `${sheet}: \`:host(${inside.trim()})\` is dropped when the sheet is parsed. ` +
            '`:has()` is not allowed inside the functional `:host()`, in any form, ' +
            'so this rule has never matched. A region cannot detect its own emptiness.',
        )
      }
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
