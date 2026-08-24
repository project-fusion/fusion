#!/usr/bin/env node
/**
 * A documented part has to be rendered, and a rendered part has to be documented.
 *
 * `@csspart` is how a component publishes a `::part()` name. It reaches the
 * manifest, the reference doc and the API page, so a name written there is a
 * promise, and a part rendered without one is a working hook nobody is told
 * about and nothing stops a later edit from renaming.
 *
 * The same shape as `check:hooks`, for the same reason: three of these turned up
 * in the audit and none of them could have been caught by reading, because a
 * `::part()` that resolves to nothing is valid CSS that matches nothing.
 * `Breadcrumbs` published a `nav` part the family does not render; `Checkbox`
 * renders a `field` part the styled tier builds its whole card appearance on and
 * never declared it; `Slider` was missing three.
 *
 * **Parts are inherited.** A styled component usually renders nothing of its
 * own and takes its markup from the headless class it extends, so the render to
 * check against is the whole chain. `extends` is followed through both tiers.
 *
 * **Comments are stripped from both sides first.** The base card's JSDoc quotes
 * markup it does not render, and a check that read comments as renders passed on
 * the very bug it was written for. `check:selectors` learned that already.
 *
 * Run with `bun run check:parts` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

const TIERS = ['helix/core/src', 'helix/headless/src', 'helix/styled/src', 'helix/sandbox/src']

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

const isSource = (path) =>
  extname(path) === '.ts' && !path.endsWith('.css.ts') && !path.includes('.spec.')

/** Every component in both tiers, by class name. */
/* What each shared `draw…` helper writes, read once from core's utils. */
const helpers = new Map()
for (const dir of readdirSync('helix/core/src/utils', { withFileTypes: true })) {
  if (!dir.isDirectory() || !dir.name.startsWith('draw-')) {
    continue
  }
  for (const file of readdirSync(join('helix/core/src/utils', dir.name))) {
    if (!file.endsWith('.ts') || file.includes('.spec.')) {
      continue
    }
    const code = readFileSync(join('helix/core/src/utils', dir.name, file), 'utf8')
    const name = /export const (draw[A-Z]\w*)/.exec(code)?.[1]
    if (name) {
      helpers.set(
        name,
        /* What it writes and what it forwards. A part reached through
           `exportparts` is a part a consumer styles, and `drawTooltip` forwards
           `Tooltip`'s bubble rather than drawing one: read for `part` alone,
           three charts documented a `tooltip` nothing appeared to render. */
        [
          ...[...code.matchAll(/part="([a-z0-9-]+)"/g)].map((m) => m[1]),
          ...[...code.matchAll(/exportparts="([^"]+)"/g)].flatMap((m) =>
            m[1]
              .split(',')
              .map((one) => one.split(':').pop()?.trim() ?? '')
              .filter(Boolean),
          ),
        ],
      )
    }
  }
}

const components = new Map()

for (const tier of TIERS) {
  for (const path of walk(tier).filter(isSource)) {
    const text = readFileSync(path, 'utf8')
    /* A mixin is a function returning a class, so its parts belong to whatever
       applies it: `MixinField` renders the label, the hint and the feedback that
       every field component documents, and a check that only followed `extends`
       reported all three as undocumented on nine components at once. The mixin
       is registered under its exported name, which is exactly the identifier
       the base expression carries. */
    const mixin = text.match(/export const (Mixin\w+)\s*=/)
    const declaration = text.match(/export class (\w+)(?: extends ([\s\S]*?))?\s*\{/)
    if (!declaration && !mixin) {
      continue
    }
    const [, name, base = ''] = declaration ?? [undefined, mixin[1], '']
    /* The JSDoc is where `@csspart` lives, and the render is where parts are
       written. Both are read from the same file; comments are stripped from the
       render side so a part named in prose is not counted as one. */
    const documented = [...text.matchAll(/@csspart\s+([a-z0-9-]+)/g)].map((m) => m[1])
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    /* `exportparts` publishes a part too, and until the sandbox forwarded the
       splitter's divider nothing here did: a part reached through it read as
       documented-but-never-rendered, and the fix would have been to stop
       documenting a part consumers can style. The exposed name is what they
       write, so an aliased `inner: outer` counts as `outer`. */
    const forwarded = [...code.matchAll(/exportparts="([^"]+)"/g)].flatMap((m) =>
      m[1]
        .split(',')
        .map((one) => one.split(':').pop()?.trim() ?? '')
        .filter(Boolean),
    )
    /* Parts written by a shared draw helper count as this component's.
     *
     * `drawTooltip` lives in core and holds the markup every chart shares,
     * because a mixin cannot carry a protected render seam across its declared
     * interface. Walking `extends` alone, the five tooltip parts read as
     * documented-and-never-rendered on both charts that call it, and the fix
     * this check suggests would have been to stop documenting parts a consumer
     * can very much style. So a file that imports a `draw…` helper inherits the
     * parts that helper writes. */
    const drawn = [...code.matchAll(/\b(draw[A-Z]\w*)\s*\(/g)]
      .map((m) => helpers.get(m[1]))
      .filter(Boolean)
      .flat()
    const rendered = [
      ...[...code.matchAll(/part="([a-z0-9-]+)"/g)].map((m) => m[1]),
      ...forwarded,
      ...drawn,
    ]
    components.set(name, {
      bases: [...base.matchAll(/(\w+)/g)].map((m) => m[1]),
      documented,
      path,
      rendered,
    })
  }
}

/** Everything the class renders, including what it inherits. */
const renderedBy = (name, seen = new Set()) => {
  const entry = components.get(name)
  if (!entry || seen.has(name)) {
    return []
  }
  seen.add(name)
  return [...entry.rendered, ...entry.bases.flatMap((base) => renderedBy(base, seen))]
}

/** Everything the class documents, including what it inherits. */
const documentedBy = (name, seen = new Set()) => {
  const entry = components.get(name)
  if (!entry || seen.has(name)) {
    return []
  }
  seen.add(name)
  return [...entry.documented, ...entry.bases.flatMap((base) => documentedBy(base, seen))]
}

const problems = []

for (const [name, entry] of components) {
  const rendered = new Set(renderedBy(name))
  const documented = new Set(documentedBy(name))
  if (rendered.size === 0 && documented.size === 0) {
    continue
  }
  for (const part of entry.documented) {
    if (!rendered.has(part)) {
      problems.push(
        `${entry.path}: ${name} documents \`@csspart ${part}\` and nothing in its render ` +
          'chain writes it. A `::part()` for a part nothing renders is valid CSS that ' +
          'matches nothing, so a consumer styling it sees no error and no effect.',
      )
    }
  }
  /* Only where the class documents at least one part. A component that
     documents none has not published a part surface at all, and half of those
     are deliberate: the sandbox's internals are not API. */
  if (entry.documented.length === 0) {
    continue
  }
  for (const part of new Set(entry.rendered)) {
    if (!documented.has(part)) {
      problems.push(
        `${entry.path}: ${name} renders \`part="${part}"\` and no \`@csspart\` declares it. ` +
          'A part that works and is not published is one a later edit renames without ' +
          'knowing it was API.',
      )
    }
  }
}

if (problems.length > 0) {
  console.error(`Parts that are documented or rendered but not both (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

const total = [...components.values()].reduce((count, one) => count + one.documented.length, 0)
console.log(`parts: ${total} documented parts, every one rendered, and every render declared`)
