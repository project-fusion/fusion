#!/usr/bin/env node
/**
 * Where two spellings exist for one idea, the hooks settle on one.
 *
 * **`check:hooks` holds two real rules and has no opinion about the noun.** It
 * requires a hook to be named for its family and to have a reader, and neither
 * of those stops one component calling a corner `--card-radii` while another
 * calls it `--video-radius`. Measured 28 Aug 2026 over the 490 published hooks,
 * four questions had two answers each: `-radii` against `-radius` 12 to 8,
 * `-background` against `-background-color` 8 to 23, `-inset` against
 * `-padding` 15 to 5, and a physical name over a logical property eleven times.
 *
 * **The property decides, not the majority**, which settled two of them against
 * the count. Thirteen of the fifteen `-inset` hooks were feeding `padding`, so
 * the minority spelling was the accurate one; and `-radii` is the plural naming
 * a token *ramp* while a hook sets one corner.
 *
 * **The rule is narrow on purpose, and the first version of this check was not.**
 * It derived the expected name from the property each hook feeds and required
 * every hook to end with it, which reported 79 hooks and was wrong about most of
 * them: `--dialog-scrim` feeds `background-color`, `--dialog-rise` feeds
 * `translate`, `--chat-message-measure` feeds `max-inline-size`, and in every
 * one of those the name is *better* than the property. A hook may name the idea
 * it controls; what it may not do is name the same idea a second way. So this
 * checks synonyms rather than derivation, which is `check:axes`' shape: a closed
 * vocabulary, one spelling each, and silence about everything outside it.
 *
 * The exception list is the interesting part rather than an escape hatch. A hook
 * really feeding `inset-*` keeps `-inset`, because there the word is the
 * property.
 *
 * Run with `bun run check:hook-names` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SHEETS = ['helix/styled/src', 'helix/sandbox/src']

/**
 * One idea, one spelling. The key is refused and the value is what to write.
 *
 * `-inset` is conditional rather than banned, so it is not here: see `LOGICAL`
 * and the `inset-` test below.
 */
const SYNONYMS = {
  background: 'background-color',
  radii: 'radius',
}

/**
 * A physical name over a logical property, which is a name that can be wrong.
 *
 * Every stylesheet in the library authors logical properties, so a hook called
 * `-height` feeding `block-size` reads correctly in one writing mode and lies in
 * another. `border-width` and `stroke-width` are not in this: the first names
 * part of a shorthand and the second is SVG's own, physical by nature.
 */
const LOGICAL = { height: 'block-size', width: 'inline-size' }
const PHYSICAL_IS_FINE = new Set(['border-width', 'stroke-width'])

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

/**
 * Every property each component hook is read in, and where it was found.
 *
 * **One level of indirection is followed, because the library's own idiom needs
 * it.** A sheet commonly reads a hook once into a private at the top, so a
 * consumer overriding it moves every use at once: `--_card-inset:
 * var(--card-padding, …)` and then `padding: var(--_card-inset)`. Recording only
 * direct reads missed those entirely, which was 131 of the 490 published hooks
 * unchecked, including the `--card-padding` this check was written for.
 */
const feeds = new Map()
const privates = new Map()
const reads = []
for (const dir of SHEETS) {
  for (const file of walk(join(ROOT, dir))) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const declaration = /^\s*([-\w]+)\s*:\s*(.*)$/.exec(line)
      if (!declaration) {
        continue
      }
      const [, property, value] = declaration
      for (const [, hook] of value.matchAll(/var\((--[a-z0-9-]+)/g)) {
        if (hook.startsWith('--helix-')) {
          continue
        }
        reads.push({ file: relative(ROOT, file), hook, property })
        if (property.startsWith('--')) {
          if (!privates.has(property)) {
            privates.set(property, new Set())
          }
        }
      }
      if (!property.startsWith('--')) {
        for (const [, name] of value.matchAll(/var\((--_[a-z0-9-]+)/g)) {
          if (!privates.has(name)) {
            privates.set(name, new Set())
          }
          privates.get(name).add(property)
        }
      }
    }
  }
}
for (const { hook, property, file } of reads) {
  if (hook.startsWith('--_')) {
    continue
  }
  const resolved = property.startsWith('--') ? [...(privates.get(property) ?? [])] : [property]
  if (resolved.length === 0) {
    continue
  }
  if (!feeds.has(hook)) {
    feeds.set(hook, { properties: new Set(), where: file })
  }
  for (const one of resolved) {
    feeds.get(hook).properties.add(one)
  }
}

const problems = []
for (const [hook, { properties, where }] of [...feeds].sort()) {
  const name = hook.replace(/^--/, '')
  const last = name.split('-').pop()

  const synonym = SYNONYMS[last]
  if (synonym) {
    problems.push(
      `${where}: ${hook} ends with \`-${last}\`, and this library spells that \`-${synonym}\`. ` +
        'One idea with two spellings is one a consumer cannot predict.',
    )
    continue
  }

  /* `-inset` is right only where it feeds a real `inset-*`. Thirteen of the
     fifteen were feeding `padding`, which is the property a consumer would
     guess and the one they would be wrong about. */
  if (last === 'inset' && ![...properties].some((one) => one.startsWith('inset'))) {
    problems.push(
      `${where}: ${hook} is read in ${[...properties].sort().join(', ')} and not in any ` +
        '`inset-*`, so it is padding. Name it `-padding`, which is what a consumer guesses.',
    )
    continue
  }

  const logical = LOGICAL[last]
  if (logical && !PHYSICAL_IS_FINE.has(name.split('-').slice(-2).join('-'))) {
    const lies = [...properties].some((one) => /(^|-)(block|inline)-size$/.test(one))
    if (lies) {
      problems.push(
        `${where}: ${hook} is read in ${[...properties].sort().join(', ')}, which is a logical ` +
          `property, and its name is physical. Name it \`-${logical}\`: a physical name over a ` +
          'logical property is correct in one writing mode and wrong in another.',
      )
    }
  }
}

if (problems.length > 0) {
  console.error(`Hooks spelling one idea a second way (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}`)
  }
  console.error('')
  process.exit(1)
}

console.log(
  `hook names: ${feeds.size} component hooks, one spelling each for corner, ground, inner space and axis.`,
)
