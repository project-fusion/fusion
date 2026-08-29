#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
/**
 * Writes `fusion/docs/references/token-reference.md` from the token registry.
 *
 * The tokens are TypeScript and `helix/styles/tokens.json` is what they emit, so
 * this reads that map rather than matching declarations out of `tokens.css` with
 * a regular expression: one fewer parser, and the same names an agent and a
 * Foundations page get.
 *
 * Generated for the reason the component reference is: a list of tokens
 * transcribed by hand is a second source of truth for something that already
 * has one, and the copy is the stale one.
 *
 * **Semantic tokens only.** `primitives.css` is `helix/styles`'s own business
 * and nothing outside may read it, so publishing that list would be publishing
 * an API nobody has. The resolved value is shown, which for most tokens is a
 * reference into the primitive layer: that is the honest answer to "what is
 * this", because the indirection is the point.
 *
 * **Readers are counted, because a token nothing reads is worth seeing.** Not a
 * fault on its own, a complete scale is part of the product and a consumer can
 * read a rung we do not, but it is the difference between a scale and a
 * leftover, and `helix component`'s `tokens` cannot see it: that check asks that every token
 * *referenced* exists, never that every token *declared* is read.
 *
 * Run `bun run gen:tokens-reference` to write it, and
 * `bun run check:gen:tokens-reference` to fail when it is behind. `verify` runs the check rather than the writer, for the
 * same reason it runs `biome ci`.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/* From this file rather than from the working directory. Every path below is
   repository-relative, which was true by accident while this lived at the root
   of the tooling folder and is a fault now it lives inside a package: run from
   anywhere but the root, it read nothing and wrote nothing. */
const ROOT = join(import.meta.dirname, '../../..')
const SOURCE = 'helix/styles/tokens.json'
const OUTPUT = 'fusion/docs/references/token-reference.md'

/* The climb from the written file back to the root, derived from where it is
   written rather than counted by hand. A link inside a generated document is
   followed relative to that document, so a hardcoded `../..` is correct only at
   the depth it was written at: moving this file one level down left the link one
   level short, and the `--check` passed the whole time, because the generator
   and the committed file agreed about the wrong answer. */
const UP = '../'.repeat(OUTPUT.split('/').length - 1)
const ROOTS = ['fusion', 'helix']

/** The fifteen, in the order the stylesheet declares them. */
const CATEGORIES = [
  'color',
  'space',
  'radii',
  'font',
  'text',
  'weight',
  'leading',
  'tracking',
  'border',
  'shadow',
  'material',
  'duration',
  'easing',
  'size',
  'layer',
]

/** What each category is for, since a name alone does not say. */
const PURPOSE = {
  border: 'Widths for a rule or an outline.',
  color: 'Every color, resolved through `light-dark()` so a theme needs no second file.',
  duration: 'How long something takes.',
  easing: 'The shape of the curve it takes it along.',
  font: 'The three families.',
  layer: 'Position in the stack. Positional, never named after a component.',
  leading:
    'Line height. The three steps are unitless and scale with the size; the heading one states the gap it wants instead, since a ratio picked per appearance is what left four rungs tighter than the paragraph under them.',
  material: 'Blur and translucency, for a surface that lets the page through.',
  radii: 'Corner radius. `sm` is the house value at 4px and is on nearly every container.',
  shadow: 'Elevation.',
  size: 'Heights and widths a component takes, all of them multiplied by the density seed.',
  space: 'The spacing scale, used for gaps, padding and margins alike.',
  text: 'Font size.',
  tracking: 'Letter spacing.',
  weight: 'The three weights.',
}

const walk = (dir, found = []) => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.next')) {
      continue
    }
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      walk(path, found)
      /* Generated files are filtered below, by asking git rather than by
         matching names here. */
    } else if (path.endsWith('.css') || path.endsWith('.ts') || path.endsWith('.tsx')) {
      found.push(path)
    }
  }
  return found
}

/**
 * What git ignores, which is this repository's own record of what is generated.
 *
 * **A generated file is the sources counted again.** `bun run styles` writes a
 * `.css.ts` beside every `.css` holding the same rules as a template literal,
 * which doubles every stylesheet; `helix/styled/elements.css` and
 * `fusion/site/public/sandbox/frame.css` are the style layers concatenated, and
 * `frame.css` alone holds 238 reads that are copies of reads already counted in
 * the files it was built from.
 *
 * Every one of them is gitignored, so they exist after a build and not before,
 * and counting them makes each number here a fact about whether somebody had run
 * `bun run build` rather than about the library. Measured on one commit,
 * changing nothing but build state: `--helix-color-background` read 63 in a
 * fresh checkout and 105 after a build.
 *
 * A hand-kept ignore list drifts from the other places that decide what is
 * generated. `.gitignore` is the one place that has to be right for the
 * repository to work at all, so it is the one to ask. One `git check-ignore` for
 * the whole candidate list, rather than one per file.
 */
const generated = (paths) => {
  if (paths.length === 0) {
    return new Set()
  }
  try {
    const answer = execFileSync('git', ['check-ignore', '--stdin'], {
      encoding: 'utf8',
      input: paths.join('\n'),
    })
    return new Set(answer.split('\n').filter(Boolean))
  } catch (error) {
    /* `check-ignore` exits 1 when it matched nothing, which is a clean tree
       rather than a failure, and stdout still carries whatever did match. */
    return new Set(
      String(error.stdout ?? '')
        .split('\n')
        .filter(Boolean),
    )
  }
}

/* Every read of every token, across the tiers and the site. The declaration
   file is skipped or each token would count itself, and the syntax colors are
   read from TypeScript rather than from a stylesheet, which is why the sweep is
   not CSS only. */
const reads = new Map()
for (const root of ROOTS) {
  const found = walk(join(ROOT, root))
  const ignored = generated(found)
  for (const path of found) {
    if (ignored.has(path)) {
      continue
    }
    /* The layer's own sources, which declare tokens rather than reading them.
       `tokens.ts` is one of them: a semantic token whose value references
       another, as `shadow-surface` does `shadow-none`, otherwise counts its own
       declaration as a use and stops being reported as unread. */
    if (
      path.endsWith('tokens.css') ||
      path.endsWith('tokens.ts') ||
      path.endsWith('primitives.css')
    ) {
      continue
    }
    for (const [, name] of readFileSync(path, 'utf8').matchAll(/var\((--helix-[a-z0-9-]+)/g)) {
      reads.set(name, (reads.get(name) ?? 0) + 1)
    }
  }
}

const registry = JSON.parse(readFileSync(join(ROOT, SOURCE), 'utf8'))
const declared = registry.tokens.map((token) => [token.name, token.value])

const grouped = new Map(CATEGORIES.map((one) => [one, []]))
const stray = []
for (const [name, value] of declared) {
  /* `--helix-color-background` splits to ['', '', 'helix', 'color', …], so the
     category is the fourth part: the two leading dashes each open an empty one. */
  const category = name.split('-')[3]
  const bucket = grouped.get(category)
  if (bucket) {
    bucket.push([name, value])
  } else {
    stray.push(name)
  }
}

if (stray.length > 0) {
  console.error(
    `Tokens outside the fifteen categories (${stray.length}):\n  ${stray.join('\n  ')}\n\n` +
      'Every token belongs to exactly one category. Either it is misnamed or the ' +
      'category list in this script and in the area rules needs the new one added.',
  )
  process.exit(1)
}

const unread = declared.filter(([name]) => !reads.has(name))

const lines = [
  '# Token reference',
  '',
  `*Generated from [\`helix/styles/src/tokens.ts\`](${UP}helix/styles/src/tokens.ts) by`,
  '`bun run gen:tokens-reference`. Do not edit.*',
  '',
  `${declared.length} semantic tokens in ${CATEGORIES.length} categories, every one in exactly`,
  'one. These are the whole of what a component or an app may use. The primitive',
  "layer underneath (`--_helix-neutral-500` and its kind) is `helix/styles`'s own",
  'business and the `tokens` rule fails on any reference to it from outside.',
  '',
  'Per-component hooks (`--card-padding`, `--drawer-radii`) are not tokens and are',
  'not here. They are API, they default to a semantic token, and the `hooks` rule',
  'holds them to both directions.',
  '',
  '**Reads** counts every `var()` of that token across `helix` and',
  '`site`, the sandbox included. Zero is not a fault: a complete scale is part of what is shipped and',
  'a consumer can reach for a rung we happen not to use. It is worth seeing',
  'because nothing else can see it, the `tokens` rule asking only that every token',
  '*referenced* exists.',
  '',
]

if (unread.length > 0) {
  lines.push(`Currently unread anywhere: ${unread.map(([name]) => `\`${name}\``).join(', ')}.`, '')
}

for (const category of CATEGORIES) {
  const items = grouped.get(category) ?? []
  lines.push(
    `## ${category}`,
    '',
    PURPOSE[category] ?? '',
    '',
    '| Token | Value | Reads |',
    '|---|---|---|',
  )
  for (const [name, value] of items) {
    lines.push(`| \`${name}\` | \`${value}\` | ${reads.get(name) ?? 0} |`)
  }
  lines.push('')
}

const written = `${lines
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trimEnd()}\n`
const output = join(ROOT, OUTPUT)

if (process.argv.includes('--check')) {
  let existing = ''
  try {
    existing = readFileSync(output, 'utf8')
  } catch {
    existing = ''
  }
  if (existing !== written) {
    console.error(
      `${OUTPUT} is behind ${SOURCE}. Run \`bun run gen:tokens-reference\` and commit the result.`,
    )
    process.exit(1)
  }
  console.log(`tokens: ${declared.length} tokens in ${CATEGORIES.length} categories, current`)
} else {
  writeFileSync(output, written)
  console.log(`tokens: ${declared.length} tokens written to ${OUTPUT}`)
}
