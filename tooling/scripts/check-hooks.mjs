#!/usr/bin/env node
/**
 * A documented CSS hook has to be read by a rule, or it does nothing at all.
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
 * Private properties (`--_name`) are excluded: they are a component talking to
 * itself and are nobody's API. Design tokens (`--helix-name`) are excluded too,
 * because `check:tokens` already owns them and a component reading one is not
 * publishing a hook.
 *
 * Run with `bun run check:hooks` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

/* Every tier that ships CSS or documents a component. `helix/styles` reads
   hooks without declaring any, which is exactly the pairing that made Button's
   go missing: the declaration stayed in one tier and the rule moved to
   another. */
const TIERS = ['helix/core/src', 'helix/headless/src', 'helix/styles/src', 'helix/web/src']

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

const declared = new Map()
const read = new Map()

for (const tier of TIERS) {
  for (const path of walk(tier).filter(isSource)) {
    const text = readFileSync(path, 'utf8')
    if (extname(path) === '.ts') {
      for (const [, name] of text.matchAll(/@cssproperty\s+(--[a-z0-9-]+)/g)) {
        declared.set(name, path)
      }
    }
    if (extname(path) === '.css') {
      for (const [, name] of text.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
        if (ours(name) && !read.has(name)) {
          read.set(name, path)
        }
      }
    }
  }
}

const problems = []

for (const [name, path] of [...declared].sort()) {
  if (!read.has(name)) {
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

if (problems.length > 0) {
  console.error(`CSS hooks that are declared or read but not both (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

console.log(`hooks: ${declared.size} documented CSS properties, every one read by a rule`)
