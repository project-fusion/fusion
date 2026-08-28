#!/usr/bin/env node
/**
 * Checks that no reflected property carries a default.
 *
 * **The two together are what write onto a host nobody configured.** Reflection
 * exists so a selector can reach a value, and a default is what the element
 * holds before anyone says otherwise. A property with both writes its attribute
 * onto every host the moment the element upgrades, including the ones the
 * consumer rendered and did not touch, and the consequences are worse than
 * untidy markup:
 *
 * - **React reports it as a hydration mismatch.** The server sends
 *   `<helix-radio-group>` and the client finds `<helix-radio-group
 *   orientation="vertical">`, because the element wrote that on itself between
 *   the two. #121 chased exactly this and found five attributes React listed
 *   that `curl` could not see.
 * - **A serialized host re-parses as a declaration.** `Image.status` is element
 *   state: copy a loaded image's markup and paste it back and the new element
 *   starts life claiming to have loaded something it has never fetched.
 * - **The stylesheet gets harder, not easier.** With no default the resting
 *   arrangement is the attribute's absence, so a rule only has to name the
 *   departure: `:host([orientation="horizontal"])` and nothing at all for the
 *   other case.
 *
 * `Tree.chevronPlacement` is the one this was written after. It reflected and
 * defaulted to `'start'`, so every tree anybody rendered carried
 * `chevron-placement="start"`, and `tree-root.ssr.spec.ts` caught it by
 * asserting the host holds only what the consumer wrote. That assertion is
 * worth having on any component whose host takes attributes, and this is the
 * version that does not need somebody to remember to write it.
 *
 * **`false` and the empty string are not defaults**, they are the absence of a
 * value spelled out. A boolean property has to be initialised to something for
 * TypeScript, and `reflect: true` on a boolean writes nothing when it is false,
 * which is the resting state this asks for.
 *
 * The rule is in `.claude/rules/helix.md` and has been for months. Seven
 * properties were breaking it when this was written, which is the argument for
 * a check rather than a rule.
 *
 * Run with `bun run check:api:reflected` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const TIERS = ['helix/headless/src', 'helix/styled/src']

/** Values that mean "nothing was said", rather than a choice made for a consumer. */
const RESTING = new Set(['false', "''", '""', 'undefined', 'null'])

/** Every `.ts` under a tier, specs and generated stylesheets excluded. */
const sources = (root) => {
  const found = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) {
        walk(path)
      } else if (entry.endsWith('.ts') && !entry.includes('.spec.') && !entry.endsWith('.css.ts')) {
        found.push(path)
      }
    }
  }
  walk(root)
  return found
}

const problems = []
let reflected = 0

for (const tier of TIERS) {
  for (const file of sources(tier)) {
    const text = readFileSync(file, 'utf8')
    /* The decorator, then the declaration on the line after it. A type
       annotation may sit between the name and the `=`, which is what a first
       version of this missed: `orientation: 'horizontal' | 'vertical' =
       'vertical'` looks nothing like `orientation = 'vertical'` to a pattern
       that assumed the simple form, and it reported none of the seven. */
    for (const match of text.matchAll(
      /@property\(\{[^}]*reflect:\s*true[^}]*\}\)\s*\n\s*(?:override\s+)?(?:declare\s+)?(\w+)\s*(?::[^=\n]+)?(=\s*([^\n]+?))?\s*$/gm,
    )) {
      reflected += 1
      const [, name, , value] = match
      if (value === undefined || RESTING.has(value.trim())) {
        continue
      }
      const line = text.slice(0, match.index).split('\n').length + 1
      problems.push(
        `${file}:${line}: \`${name}\` reflects and defaults to ${value.trim()}, so every host ` +
          'gains an attribute nobody wrote. Declare it optional and let the resting arrangement ' +
          'be the absence, which is what the stylesheet should be asking about anyway.',
      )
    }
  }
}

if (problems.length > 0) {
  console.error(
    `Reflected properties writing onto every host (${problems.length}):\n\n  ${problems.join('\n\n  ')}\n`,
  )
  process.exit(1)
}

console.log(`reflected: ${reflected} reflecting properties, not one of them with a default`)
