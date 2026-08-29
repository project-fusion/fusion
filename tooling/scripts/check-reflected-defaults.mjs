#!/usr/bin/env node
/**
 * A reflected property may not default to something that writes an attribute.
 *
 * **The server writes what the consumer typed; the client writes that plus
 * whatever reflection decided.** Lit reflects a property on the update that
 * changes it, and a property with a non-empty default is changed on the first
 * one, so `@property({ reflect: true }) open = true` turns
 * `<helix-thing label="x">` into `<helix-thing label="x" open>` the moment it
 * upgrades. That is a hydration mismatch a React consumer reports and does not
 * patch up, and it is invisible to every other check here: the component works,
 * the attribute is correct, and the two renders simply disagree.
 *
 * **What is allowed.** A reflected boolean defaulting to `false` writes nothing,
 * which is the ordinary case and most of the library.
 *
 * **A reflected string defaulting to `''` is not silent.** Lit reflects the
 * empty string as `author=""`. Measured by mounting the element: a consumer
 * writing `<helix-chat-message>` got back `author="" state=""`. Both properties
 * are undefined at rest.
 *
 * **Nor is `updated` a remedy.** "Written after the first render" is not written
 * after hydration: `updated` runs in the microtask checkpoint `firstUpdated`
 * runs in, before React need have reached the node. A property moved there to
 * satisfy this check goes on writing `visible="0"` onto every server-rendered
 * instance, which is the fault `data-settled` exists for.
 *
 * **The rule is the resting state, not the timing.** A property writes nothing
 * until it departs from what a consumer's server would have sent, whichever
 * mechanism writes it. Where the resting state is the one that needs saying, the
 * hook inverts: `helix-toast-item` publishes `data-closed` rather than
 * `data-open`, a toast being open at rest.
 *
 * **A static pass cannot see most of this**, which is why it is not the only
 * guard. Reflection is one route; `setAttribute`, `toggleAttribute` and a
 * `dataset` write are three more, and they produce the identical symptom from
 * somewhere this file has no reason to look.
 * `helix/headless/src/hydration.dom.spec.ts` mounts every registered element and
 * fails if it adds anything at all to its own host, which asks the outcome
 * rather than enumerating the causes.
 *
 * **A getter with no setter is refused outright**, for a different reason worth
 * keeping in the same place: Lit reflects what is in `changedProperties`, and
 * nothing puts a derived getter there after the first update, so the attribute
 * is right on load and wrong from the first change. Reflection on a computed
 * value is a promise the mechanism cannot keep.
 *
 * Run with `bun run check:api:reflected-defaults`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SOURCE } from './lib/workspace.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const TIERS = [SOURCE.headless, SOURCE.styled, SOURCE.core]

/** Every `.ts` under a directory that is not a spec. */
const sources = (from, found = []) => {
  let entries
  try {
    entries = readdirSync(join(ROOT, from), { withFileTypes: true })
  } catch {
    return found
  }
  for (const entry of entries) {
    const path = join(from, entry.name)
    if (entry.isDirectory()) {
      sources(path, found)
    } else if (entry.name.endsWith('.ts') && !entry.name.includes('.spec.')) {
      found.push(path)
    }
  }
  return found
}

/**
 * A default that writes no attribute when reflected.
 *
 * `''` does not belong on this list: Lit reflects the empty string as
 * `author=""`, measured on `helix-chat-message`, which is an attribute a
 * consumer's server never sent. An absent initializer and an explicit
 * `undefined` are the two that genuinely write nothing, and `false` is the third
 * because a reflected boolean removes the attribute rather than writing it.
 */
const silent = (initializer) =>
  initializer === undefined || initializer === 'false' || initializer === 'undefined'

const problems = []
let checked = 0

for (const tier of TIERS) {
  for (const file of sources(tier)) {
    const text = readFileSync(join(ROOT, file), 'utf8')
    /* The decorator, then whatever follows it: a field with an optional
       initializer, or a getter. Comments in between are skipped by the `\s*`
       only where there are none, which is why the doc block is consumed first. */
    for (const match of text.matchAll(
      /@property\(([^)]*reflect:\s*true[^)]*)\)\s*(?:\/\*[\s\S]*?\*\/\s*)?(?:override\s+)?(get\s+)?(\w+)(?:\([^)]*\))?(?:\??:[^=\n]+)?(?:\s*=\s*([^\n]+?))?\s*$/gm,
    )) {
      const [, , isGetter, name, initializer] = match
      checked += 1
      const line = text.slice(0, match.index).split('\n').length

      if (isGetter) {
        /* A getter with a setter beside it reflects correctly, because the
           setter is what puts the property in `changedProperties`. */
        if (!new RegExp(`\\bset\\s+${name}\\s*\\(`).test(text)) {
          problems.push(
            `${relative(ROOT, join(ROOT, file))}:${line}: \`${name}\` is a getter with no setter and reflects. ` +
              'Lit reflects what is in `changedProperties`, and nothing puts a derived getter there ' +
              'after the first update, so the attribute is right on load and wrong from the first ' +
              'change. Write it in `updated`, or give it a setter.',
          )
          continue
        }

        /* **A getter has a default too, and it is one line further away.** Every
           controlled property in this library reads `this.xState ?? this.defaultX`,
           so what it returns before anybody writes to it is `defaultX`'s
           initializer. `helix-chat`'s `pinned` defaults to true, because a
           conversation opens at its most recent turn, and reflected it writes
           `pinned` onto a host the server served without one. The setter rule
           above lets an accessor through, so nothing else catches that. */
        const body = text.slice(match.index).match(/\{([\s\S]*?)\n\s{2}\}/)?.[1] ?? ''
        const backing = body.match(/\?\?\s*this\.(\w+)/)?.[1]
        const fallback = backing
          ? text.match(new RegExp(`\\b${backing}\\s*(?::[^=\\n]+)?=\\s*([^\\n]+?)\\s*$`, 'm'))?.[1]
          : undefined
        if (backing && !silent(fallback)) {
          problems.push(
            `${relative(ROOT, join(ROOT, file))}:${line}: \`${name}\` reflects and falls back to ` +
              `\`${backing}\`, which defaults to \`${fallback}\`, so it writes an attribute on upgrade ` +
              'that the server did not. That is a hydration mismatch a consumer reports and cannot ' +
              'patch up. Default it to nothing, or write the attribute in `updated`.',
          )
        }
        continue
      }

      if (!silent(initializer?.trim().replace(/,$/, ''))) {
        problems.push(
          `${relative(ROOT, join(ROOT, file))}:${line}: \`${name}\` reflects and defaults to ` +
            `\`${initializer?.trim()}\`, so it writes an attribute on upgrade that the server did not. ` +
            'That is a hydration mismatch a consumer reports and cannot patch up. Default it to ' +
            'nothing, or write the attribute in `updated` after the first render.',
        )
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`Reflected properties that write on upgrade (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

console.log(
  `reflected-defaults: ${checked} reflected properties, every one silent until something sets it`,
)
