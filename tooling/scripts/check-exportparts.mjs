#!/usr/bin/env node
/**
 * A component that renders another has to publish what it rendered.
 *
 * `::part()` reaches one shadow boundary and stops. A component that renders
 * another therefore hides that child's entire part surface unless it forwards
 * it with `exportparts`, and the failure is the silent kind this repository
 * keeps meeting: `helix-date-input::part(cell)` is valid CSS that matches
 * nothing, with no error, no warning, and nothing to search for.
 *
 * **Measured before this was written:** thirty-seven sites across nineteen
 * families render another Helix element, eight forwarded anything at all, and
 * 148 published child parts were unreachable from the outside. The composed
 * components a consumer reaches for first were the least styleable half of the
 * library.
 *
 * `overriding-a-component.mdx` already told consumers that a part they cannot
 * reach is a bug worth reporting. This is the check that stops it being one.
 *
 * Three rules:
 *
 * - **Forward everything the child publishes.** Withholding a part protects
 *   nothing: the child publishes it on its own element already, so the only
 *   effect is that the composed component is less useful than its parts.
 * - **Prefix with the role**, which is the `part` the parent gave the child, or
 *   the name it chose for the child's contribution where it renders no part of
 *   its own. Bare forwarding collides: `command` forwarding the listbox's
 *   `search-field` under a name it renders itself makes
 *   `helix-command::part(search-field)` match two elements.
 * - **A part already named for its role keeps the role alone.** A `dialog`
 *   inside the `dialog` role is `dialog`, not `dialog-dialog`. The collision
 *   rule below is what keeps the collapse safe.
 *
 * **A forwarded part still needs its `@csspart`,** and `check:api:parts` is what
 * asks for it: it counts an `exportparts` name as rendered, so a forward
 * without a declaration fails there rather than here. The two checks are one
 * contract read from two ends.
 *
 * **And the door has to be checked from outside.** `check:css:selectors` reads
 * `[part="x"]` inside a component's own sheet and stops there, so
 * `helix-thing::part(nothing)` written from outside is unchecked in every sheet,
 * doc and page in the repository. It is the same silence as every other part
 * failure, in the one place nobody looks, and it had eight.
 *
 * Run with `bun run check:api:exportparts` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  compositions,
  exposedAs,
  partDocsByTag,
  TIERS,
  walk,
  withoutComments,
} from './lib/compositions.mjs'
import { SOURCE } from './lib/workspace.mjs'

const docs = partDocsByTag()
const sites = compositions()

/** What each file renders in its own right, for the collision rule. */
const rendersOwn = new Map()
for (const tier of TIERS) {
  for (const path of walk(tier)) {
    const code = withoutComments(readFileSync(path, 'utf8'))
    const own = new Set()
    for (const [, value] of code.matchAll(/(?<!\[)part="([a-z0-9 -]+)"/g)) {
      for (const one of value.split(/\s+/)) {
        own.add(one)
      }
    }
    rendersOwn.set(path, own)
  }
}

/** The line a character offset falls on, so a problem points somewhere. */
const lineAt = (path, at) => readFileSync(path, 'utf8').slice(0, at).split('\n').length

const problems = []

for (const site of sites) {
  const published = docs.get(site.child)
  if (!published || published.size === 0) {
    continue
  }
  const where = `${site.path}:${lineAt(site.path, site.at)}`

  /* Something has to name the child, or a forward has no prefix to take. */
  const roles = new Set([...site.forwarded.values()].map((exposed) => exposed.split('-')[0]))
  const role = site.role ?? (roles.size === 1 ? [...roles][0] : undefined)
  if (!role) {
    problems.push(
      `${where}: renders <${site.child}>, which publishes ${published.size} parts, and gives it no ` +
        'role. Put a `part` on it, or forward under one name, so a forwarded part has a prefix.',
    )
    continue
  }

  for (const part of published.keys()) {
    const exposed = exposedAs(role, part)
    if (!site.forwarded.has(part)) {
      problems.push(
        `${where}: renders <${site.child}> and does not forward its \`${part}\` part. ` +
          `A consumer writing \`::part(${exposed})\` reaches nothing, and gets no error for it. ` +
          `Add \`${part}: ${exposed}\` to this element's \`exportparts\`.`,
      )
      continue
    }
    const actual = site.forwarded.get(part)
    if (actual !== exposed) {
      problems.push(
        `${where}: forwards <${site.child}>'s \`${part}\` as \`${actual}\`, and the role here is ` +
          `\`${role}\`, so it reads as \`${exposed}\`. One prefix per site, or two levels agreeing ` +
          'on a word collide under one name.',
      )
    }
  }

  /* The collapse above is only safe while the parent does not render the role
     itself. `part="dialog"` on an element forwarding `dialog: dialog` makes
     `::part(dialog)` match two boxes, which is the failure the prefix exists to
     prevent, arrived at from the other side. */
  for (const [part, exposed] of site.forwarded) {
    if (exposed === site.role && part !== site.role) {
      continue
    }
    if (exposed === role && rendersOwn.get(site.path)?.has(role)) {
      problems.push(
        `${where}: forwards <${site.child}>'s \`${part}\` as \`${role}\`, and this component also ` +
          `renders \`part="${role}"\`, so \`::part(${role})\` matches both. Rename the role.`,
      )
    }
  }
}

/**
 * Every `::part()` written from outside a component, wherever it is written.
 *
 * Sheets, examples, documentation and the site alike: a selector naming a part
 * nothing publishes is dead in all four, and the consequence is the same.
 * Generated output under `fusion/site/public` is skipped, being a copy of a source
 * this already reads.
 */
const OUTSIDE = [SOURCE.styled, SOURCE.headless, 'helix/docs/content', 'fusion/site', 'fusion/docs']
const SKIP = new Set(['.next', '.turbo', 'node_modules', 'public'])

const everyFile = (dir, found = []) => {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) {
      continue
    }
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      everyFile(path, found)
    } else if (/\.(css|mdx|md|tsx?)$/.test(path) && !path.endsWith('.css.ts')) {
      found.push(path)
    }
  }
  return found
}

for (const root of OUTSIDE) {
  for (const path of everyFile(root)) {
    const text = readFileSync(path, 'utf8')
    for (const match of text.matchAll(/(helix-[a-z0-9-]+)::part\(\s*([a-z0-9-]+)\s*\)/g)) {
      const [, tag, part] = match
      const publishes = docs.get(tag.replace(/^helix-(headless-)?/, ''))
      /* A tag with no manifest entry is not ours to judge. */
      if (!publishes || publishes.has(part)) {
        continue
      }
      const line = text.slice(0, match.index).split('\n').length
      problems.push(
        `${path}:${line}: \`${tag}::part(${part})\` names a part that element does not publish. ` +
          `It publishes: ${[...publishes.keys()].sort().join(', ')}. A \`::part()\` matching ` +
          'nothing is valid CSS with no error and no effect.',
      )
    }
  }
}

if (problems.length > 0) {
  console.error(`Composed components hiding or colliding on a part (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

const forwarded = sites.reduce((count, site) => count + site.forwarded.size, 0)
console.log(
  `exportparts: ${sites.length} compositions, ${forwarded} child parts forwarded and prefixed, ` +
    'and every `::part()` written from outside names one that exists',
)
