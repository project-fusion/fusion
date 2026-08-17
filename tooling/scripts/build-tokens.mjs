#!/usr/bin/env node
/**
 * Writes `docs/16-token-reference.md` from `tokens.css`.
 *
 * Generated for the reason the component reference is: a list of tokens
 * transcribed by hand is a second source of truth for something that already
 * has one, and the copy is the stale one. This one would have gone stale
 * immediately, since `--helix-layer-popover` was deleted and `--helix-radii-lg`
 * lost its last reader in the same week it was asked for.
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
 * leftover, and `check:tokens` cannot see it: that check asks that every token
 * *referenced* exists, never that every token *declared* is read.
 *
 * Run `bun run tokens` to write it, and `bun run check:tokens-reference` to fail
 * when it is behind. `verify` runs the check rather than the writer, for the
 * same reason it runs `biome ci`.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SOURCE = 'helix/styles/src/tokens.css'
const OUTPUT = 'docs/16-token-reference.md'
const ROOTS = ['helix', 'site']

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
  color: 'Every colour, resolved through `light-dark()` so a theme needs no second file.',
  duration: 'How long something takes.',
  easing: 'The shape of the curve it takes it along.',
  font: 'The three families.',
  layer: 'Position in the stack. Positional, never named after a component.',
  leading: 'Line height, unitless so it scales with the size.',
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
    } else if (path.endsWith('.css') || path.endsWith('.ts') || path.endsWith('.tsx')) {
      found.push(path)
    }
  }
  return found
}

/* Every read of every token, across the tiers and the site. The declaration
   file is skipped or each token would count itself, and the syntax colours are
   read from TypeScript rather than from a stylesheet, which is why the sweep is
   not CSS only. */
const reads = new Map()
for (const root of ROOTS) {
  for (const path of walk(root)) {
    if (path.endsWith('tokens.css') || path.endsWith('primitives.css')) {
      continue
    }
    for (const [, name] of readFileSync(path, 'utf8').matchAll(/var\((--helix-[a-z0-9-]+)/g)) {
      reads.set(name, (reads.get(name) ?? 0) + 1)
    }
  }
}

const source = readFileSync(SOURCE, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const declared = [...source.matchAll(/^\s*(--helix-[a-z0-9-]+):\s*([^;]+);/gm)].map(
  ([, name, value]) => [name, value.replace(/\s+/g, ' ').trim()],
)

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
  '*Generated from [`helix/styles/src/tokens.css`](../helix/styles/src/tokens.css) by',
  '`bun run tokens`. Do not edit.*',
  '',
  `${declared.length} semantic tokens in ${CATEGORIES.length} categories, every one in exactly`,
  'one. These are the whole of what a component or an app may use. The primitive',
  "layer underneath (`--_helix-neutral-500` and its kind) is `helix/styles`'s own",
  'business and `check:tokens` fails on any reference to it from outside.',
  '',
  'Per-component hooks (`--card-padding`, `--drawer-radii`) are not tokens and are',
  'not here. They are API, they default to a semantic token, and `check:hooks`',
  'holds them to both directions.',
  '',
  '**Reads** counts every `var()` of that token across `helix` and',
  '`site`, the sandbox included. Zero is not a fault: a complete scale is part of what is shipped and',
  'a consumer can reach for a rung we happen not to use. It is worth seeing',
  'because nothing else can see it, `check:tokens` asking only that every token',
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
const output = join(process.cwd(), OUTPUT)

if (process.argv.includes('--check')) {
  let existing = ''
  try {
    existing = readFileSync(output, 'utf8')
  } catch {
    existing = ''
  }
  if (existing !== written) {
    console.error(`${OUTPUT} is behind ${SOURCE}. Run \`bun run tokens\` and commit the result.`)
    process.exit(1)
  }
  console.log(`tokens: ${declared.length} tokens in ${CATEGORIES.length} categories, current`)
} else {
  writeFileSync(output, written)
  console.log(`tokens: ${declared.length} tokens written to ${OUTPUT}`)
}
