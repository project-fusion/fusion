#!/usr/bin/env node
/**
 * A documented CSS hook has to be read somewhere, or it does nothing at all.
 *
 * `@cssproperty` is how a component publishes a custom property a consumer may
 * set. It reaches the manifest, the reference doc and the API page, so a name
 * written there is a promise. Nothing checked that any rule read it, and the
 * failure is completely silent: the consumer sets the property, the cascade
 * carries it, and no declaration ever asks for it.
 *
 * Found the same way it is checked here, on `Button`. Its box moved to the base
 * layer and the shadow rules that read `--button-background-color`,
 * `--button-foreground-color` and `--button-radii` moved out from under it, so
 * three of its four documented hooks had been inert since that refactor while
 * the API page went on listing them.
 *
 * Both directions, because both are silent in their own way:
 *
 * - **Declared and never read** is a promise with nothing behind it.
 * - **Read and never declared** is a working feature nobody is told about, and
 *   one nothing stops a later edit from removing, since no document names it.
 *
 * Design tokens (`--helix-name`) are excluded, because `check:tokens` already
 * owns them and a component reading one is not publishing a hook.
 *
 * **Private properties (`--_name`) used to be excluded outright, and that was
 * the hole.** The reasoning was that they are a component talking to itself and
 * so nobody's API, which is true of what they promise and says nothing about
 * whether anyone answers. `--_toggle-height` was written by Toggle Group and
 * read by nothing at all: the item it was meant to size used a literal
 * `block-size: 100%` in its own sheet, and the property sat there through every
 * run of this check because the exemption was on the name rather than on the
 * question. A private property with no reader is the same broken promise as a
 * public one, and it is harder to see, because no API page lists it.
 *
 * So the third rule below: a private property declared in a component
 * stylesheet and read by nothing in its own package is dead. Package rather
 * than file, because that is where the underscore's contract lives: the value
 * never leaves the package, and Tabs sets `--_tab-radius` on its root for the
 * tab's own shadow root to read, one file over.
 *
 * Two things are deliberately outside it. `helix/styles` is excluded because
 * its primitives are a scale, and `check:tokens` says in as many words that a
 * rung with no reader is fine: `--_helix-neutral-500` is not dead, it is a step
 * nothing has needed yet. And `.examples/` is excluded because a headless example's
 * gray palette is emitted whole for every family by `build-headless-examples.mjs`,
 * so a family that uses four of the seven is not a fault in the example.
 *
 * Run with `bun run check:hooks` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

/* Every tier that ships CSS or documents a component. `helix/styles` reads
   hooks without declaring any, which is exactly the pairing that made Button's
   go missing: the declaration stayed in one tier and the rule moved to
   another. */
const TIERS = ['helix/core/src', 'helix/headless/src', 'helix/styles/src', 'helix/styled/src']

const walk = (dir, found = []) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      walk(path, found)
    } else {
      found.push(path)
    }
  }
  return found
}

/* Generated `.css.ts` files are the `.css` beside them wrapped in a template
   literal, so counting both would let a hook look read when the source it came
   from was deleted. */
const isSource = (path) => !path.endsWith('.css.ts') && !path.includes('.spec.')

const ours = (name) => !name.startsWith('--_') && !name.startsWith('--helix-')

/* Where the private rule applies: the component tiers, and not the base
   examples inside them. See the header for why `helix/styles` is not here. */
const OWNS_PRIVATE = (path) => !path.startsWith('helix/styles/') && !path.includes('.examples/')

/** The package a file belongs to, which is how far a private property travels. */
const packageOf = (path) => path.split('/').slice(0, 2).join('/')

/* A comment quoting `var(--_thing)` is prose about a reader, not one. The
   public halves above scan the file whole and have got away with it; this rule
   cannot, because a property's own explanation sits directly above it and
   routinely spells out the rule that was supposed to read it. */
const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '')

const declared = new Map()
/* Every declaration, not just the last, so a name written twice is visible.
   `declared` above is a Map and the second `set` overwrote the first, which is
   why this check has never been able to see a duplicate: by the time it counts,
   each name appears once. Measured on `Divider`, which declared
   `--divider-color` and `--divider-thickness` twice apiece under two different
   descriptions, and shipped all eight to the manifest and the API page. */
const declaredAt = new Map()
const read = new Map()
/* `--_name` -> package -> the file that declared it, and the packages that read it. */
const privateDeclared = new Map()
const privateRead = new Map()
/* Prefixes read through an interpolation, so `--chart-series-7` counts as read
   because something reads `var(--chart-series-${…})`. */
const families = new Map()

for (const tier of TIERS) {
  for (const path of walk(tier).filter(isSource)) {
    const text = readFileSync(path, 'utf8')
    if (extname(path) === '.ts') {
      for (const [, name] of text.matchAll(/@cssproperty\s+(--[a-z0-9-]+)/g)) {
        declared.set(name, path)
        const key = `${path}\u0000${name}`
        declaredAt.set(key, (declaredAt.get(key) ?? 0) + 1)
      }
    }
    if (extname(path) === '.css') {
      for (const [, name] of text.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
        if (ours(name) && !read.has(name)) {
          read.set(name, path)
        }
      }
    }
    if (OWNS_PRIVATE(path)) {
      const source = withoutComments(text)
      if (extname(path) === '.css') {
        for (const [, name] of source.matchAll(/^\s*(--_[a-z0-9-]+)\s*:/gm)) {
          const where = privateDeclared.get(name) ?? new Map()
          if (!where.has(packageOf(path))) {
            where.set(packageOf(path), path)
          }
          privateDeclared.set(name, where)
        }
      }
      for (const [, name] of source.matchAll(/var\(\s*(--_[a-z0-9-]+)/g)) {
        const where = privateRead.get(name) ?? new Set()
        where.add(packageOf(path))
        privateRead.set(name, where)
      }
    }
    /* A `style="--a: var(--b)"` in a template is a read too, and missing it
       reported twenty-four live hooks as dead. The charts put the series index
       into CSS this way precisely because CSS cannot count it: the component
       writes `--chart-series: var(--chart-series-3)` onto the rectangle, so
       `--chart-series-3` is read by the component rather than by a rule. Only
       inside a `style=` attribute, so an ordinary `var()` in prose or in a
       comment still does not count as one. */
    if (extname(path) === '.ts') {
      for (const [, attribute] of text.matchAll(/style="([^"]*)"/g)) {
        /* A family read through an interpolation, `var(--chart-series-${n})`.
           The number is chosen at runtime, so no literal `--chart-series-7`
           exists anywhere and matching names alone reported twenty-four live
           hooks as dead. What the component states is that it reads the whole
           family, so that is what is recorded. */
        for (const [, prefix] of attribute.matchAll(/var\(\s*(--[a-z0-9-]+)-\$\{/g)) {
          if (ours(prefix)) {
            families.set(prefix, path)
          }
        }
        for (const [, name] of attribute.matchAll(/var\(\s*(--[a-z0-9-]+)\)/g)) {
          if (ours(name) && !read.has(name)) {
            read.set(name, path)
          }
        }
      }
    }
  }
}

const problems = []

const inFamily = (name) => {
  const at = name.lastIndexOf('-')
  return at > 0 && /^\d+$/.test(name.slice(at + 1)) && families.has(name.slice(0, at))
}

/* A duplicate pairs with a rule exactly as a single declaration does, so it
   passes every test below it and is invisible to the two-way check this file is
   about. It is only ever a mistake: a hook is one thing, and two descriptions of
   it on one page is the reader being asked which to believe. */
for (const [key, count] of [...declaredAt].sort()) {
  if (count > 1) {
    const [path, name] = key.split('\u0000')
    problems.push(
      `${path}: \`${name}\` is declared ${count} times in one doc block. ` +
        'The manifest keeps every one, so the reference page lists the hook twice, and where the ' +
        'two descriptions differ it lists it twice saying different things.',
    )
  }
}

for (const [name, path] of [...declared].sort()) {
  if (!read.has(name) && !inFamily(name)) {
    problems.push(
      `${path}: documents \`${name}\` and no rule reads it. A hook nothing reads ` +
        'is listed on the API page and does nothing when a consumer sets it.',
    )
  }
}

for (const [name, path] of [...read].sort()) {
  if (!declared.has(name)) {
    problems.push(
      `${path}: reads \`${name}\` and no component documents it with ` +
        '`@cssproperty`. A hook that works and is not published is one a later ' +
        'edit removes without knowing it was API.',
    )
  }
}

for (const [name, where] of [...privateDeclared].sort()) {
  for (const [pkg, path] of where) {
    if (!privateRead.get(name)?.has(pkg)) {
      problems.push(
        `${path}: declares \`${name}\` and nothing in ${pkg} reads it. A private ` +
          'property is a component talking to itself, and this one is talking to nobody.',
      )
    }
  }
}

if (problems.length > 0) {
  console.error(
    `CSS hooks that do not hold up, declared without a reader, read without a declaration, or declared twice (${problems.length}):\n`,
  )
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

console.log(`hooks: ${declared.size} documented CSS properties, every one read by a rule`)
