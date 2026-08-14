#!/usr/bin/env node
/**
 * Fails the build when component CSS bypasses the semantic token layer.
 *
 * The token layer only holds if nothing routes around it. One `#f5f5f5` in one
 * component is invisible in review and then invisible in every theme that
 * component appears in: the theme changes, that one value does not, and the
 * bug surfaces as "the disclosure looks wrong in dark mode" months later.
 *
 * Two rules:
 *
 *   1. No raw values in properties that have tokens. Colours, spacing, radii,
 *      durations, font sizes, weights, and z-index must come from
 *      `var(--helix-*)`.
 *   2. No reaching past the semantic layer. `--_helix-*` primitives are
 *      internal to @helix-io/styles; a component referencing one is coupled to
 *      a ramp position rather than a role.
 *   3. No references to tokens that do not exist. A renamed or mistyped token
 *      resolves to nothing and the property silently falls back to the browser
 *      default. This is the failure mode rules 1 and 2 cannot see, because the
 *      code looks correct.
 *
 * Scans `css` tagged templates in .ts files and plain .css files.
 * Run with `bun run check:tokens` (part of `check` and `verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const IGNORED = new Set([
  '.git',
  '.local',
  '.next',
  '.next-dev',
  '.turbo',
  'dist',
  'node_modules',
  'target',
])

/** The styles package owns primitives and raw values by definition. */
const OWNS_PRIMITIVES = /helix[/\\]styles[/\\]/

/** Properties whose values must come from a token, and which category serves them. */
const TOKENIZED = [
  {
    category: 'color',
    property:
      /(?:^|[^-\w])(?:color|background-color|border-color|outline-color|fill|stroke|caret-color|text-decoration-color|border-(?:block|inline)(?:-(?:start|end))?-color)\s*:/,
  },
  {
    category: 'space',
    property:
      /(?:^|[^-\w])(?:padding|margin|gap|row-gap|column-gap)(?:-(?:block|inline|top|right|bottom|left)(?:-(?:start|end))?)?\s*:/,
  },
  { category: 'radii', property: /(?:^|[^-\w])border-radius\s*:/ },
  { category: 'text', property: /(?:^|[^-\w])font-size\s*:/ },
  { category: 'weight', property: /(?:^|[^-\w])font-weight\s*:/ },
  { category: 'duration', property: /(?:^|[^-\w])(?:transition-duration|animation-duration)\s*:/ },
  { category: 'layer', property: /(?:^|[^-\w])z-index\s*:/ },
]

/** Literal color values. Any of these in a component is a bug. */
const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\s*\(/

/** A bare length or number where a token belongs. */
const RAW_LENGTH = /(?:^|[\s:(,])-?\d*\.?\d+(?:px|rem|em|ms|s)?(?=[\s;,)]|$)/

/**
 * Operands of a `calc()` multiplication or division.
 *
 * `calc(var(--_card-inset) * -1)` scales a token; the `-1` is a factor, not a
 * length, and flagging it would push authors toward a second token that exists
 * only to hold the number minus one. Addition and subtraction are left alone,
 * because `calc(var(--x) + 4px)` really is a raw length.
 */
const CALC_FACTOR = /[*/]\s*-?\d*\.?\d+|-?\d*\.?\d+\s*[*/]/g

/** Values that are structural rather than design decisions. */
const ALLOWED_VALUES = new Set([
  '0',
  '0px',
  '0rem',
  'auto',
  'none',
  'inherit',
  'initial',
  'unset',
  'revert',
  'currentColor',
  'transparent',
  '100%',
  '50%',
  '1',
  '1px',
  '9999px',
])

const walk = function* (dir) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED.has(entry)) {
      continue
    }
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      yield* walk(full)
    } else if (/\.(?:css|ts)$/.test(entry) && !entry.endsWith('.spec.ts')) {
      yield full
    }
  }
}

/** Extracts CSS blocks: whole file for .css, `css\`...\`` templates for .ts. */
const cssBlocks = (file, source) => {
  if (file.endsWith('.css')) {
    return [{ offset: 0, text: source }]
  }
  const blocks = []
  const pattern = /\bcss`([\s\S]*?)`/g
  let match = pattern.exec(source)
  while (match !== null) {
    blocks.push({ offset: match.index, text: match[1] })
    match = pattern.exec(source)
  }
  return blocks
}

const lineOf = (source, index) => source.slice(0, index).split('\n').length

const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '')

const violations = []
const root = process.argv[2] ?? process.cwd()

/**
 * Every semantic token the styles package defines.
 *
 * Built by scanning declarations rather than maintained by hand, so the list
 * cannot drift from what actually ships.
 */
const defined = new Set()
for (const file of walk(root)) {
  if (!OWNS_PRIMITIVES.test(relative(root, file)) || !file.endsWith('.css')) {
    continue
  }
  for (const [, name] of readFileSync(file, 'utf8').matchAll(/^\s*(--helix-[\w-]+)\s*:/gm)) {
    defined.add(name)
  }
}

if (defined.size === 0) {
  console.error('check-tokens: found no token definitions, refusing to pass vacuously')
  process.exit(1)
}

for (const file of walk(root)) {
  const rel = relative(root, file)
  const source = readFileSync(file, 'utf8')
  const ownsPrimitives = OWNS_PRIMITIVES.test(rel)

  for (const block of cssBlocks(file, source)) {
    const text = stripComments(block.text)

    for (const [index, rawLine] of text.split('\n').entries()) {
      const line = rawLine.trim()
      if (line === '' || line.startsWith('--')) {
        // Token definitions themselves may hold raw values.
        continue
      }
      const at = `${rel}:${lineOf(source, block.offset) + index}`

      if (!ownsPrimitives && /var\(\s*--_helix-/.test(line)) {
        violations.push({
          at,
          line,
          message: 'References an internal primitive. Use a semantic --helix-* token.',
          rule: 'no-primitive-access',
        })
      }

      for (const [, name] of line.matchAll(/var\(\s*(--helix-[\w-]+)/g)) {
        if (!defined.has(name)) {
          violations.push({
            at,
            line,
            message: `${name} is not defined by @helix-io/styles. Renamed or mistyped.`,
            rule: 'unknown-token',
          })
        }
      }

      for (const { category, property } of TOKENIZED) {
        if (!property.test(line)) {
          continue
        }
        const value = line
          .slice(line.indexOf(':') + 1)
          .replace(/;.*$/, '')
          .trim()
        if (value === '' || value.includes('var(--helix-') || ALLOWED_VALUES.has(value)) {
          continue
        }
        if (ownsPrimitives) {
          continue
        }

        const scalar = value.replace(CALC_FACTOR, '')
        const raw = RAW_COLOR.test(scalar) || RAW_LENGTH.test(scalar)
        if (raw) {
          violations.push({
            at,
            line,
            message: `Raw value where a --helix-${category}-* token belongs.`,
            rule: `no-raw-${category}`,
          })
        }
      }
    }
  }
}

if (violations.length === 0) {
  console.log('tokens: no raw values or primitive access in component CSS')
  process.exit(0)
}

console.error(`Token violations (${violations.length}):\n`)
for (const v of violations) {
  console.error(`  [${v.rule}] ${v.at}`)
  console.error(`    ${v.line}`)
  console.error(`    ${v.message}\n`)
}
process.exit(1)
