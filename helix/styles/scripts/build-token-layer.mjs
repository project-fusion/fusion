#!/usr/bin/env bun
/**
 * Writes the token layer from `helix/styles/src/tokens.ts`.
 *
 * Two outputs from one source: the semantic block inside `tokens.css`, and
 * `tokens.json` for everything that needs to know a token's name without
 * parsing a stylesheet to find out.
 *
 * **The stylesheet on its own has no reader that can be checked.** The
 * Foundations pages are written by a person reading it, so a token name that
 * does not exist reaches them unchallenged. A JSON map is the reader those
 * pages need.
 *
 * **The whole of `tokens.css` is written here**, from two sources: the
 * hand-written `src/_modes.css`, which is structure rather than tokens, and the
 * registry. It used to be a generated region fenced inside a hand-written file,
 * which left a source nobody could regenerate and an output nobody could own.
 *
 * The prose between tokens comes across as comments in the order it was
 * written, so the generated stylesheet reads the way the hand-written one did.
 * That is not decoration: most of the reasoning in this design system's color
 * work is in those paragraphs.
 *
 * `turbo run token-layer` writes, `turbo run token-layer -- --check` fails when the
 * outputs and the source disagree.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatted } from '@fusion.dev/scripts/formatted'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const CSS = join(ROOT, 'helix/styles/src/tokens.css')
const JSON_OUT = join(ROOT, 'helix/styles/dist/tokens.json')

const MODES = join(ROOT, 'helix/styles/src/_modes.css')

const { TOKENS, TOKEN_GROUPS } = await import('../src/tokens.ts')

/* Read back out of the module's own source, because a comment is not a value
   and TypeScript does not hand one to a caller. The file is the source of both
   halves and this is the half the language throws away. */
const source = readFileSync(join(ROOT, 'helix/styles/src/tokens.ts'), 'utf8')
const body = source.slice(source.indexOf('export const TOKENS: Token[] = ['))

const declarations = []
/* The pattern has to survive both the formatter and the shape of an entry: the
   formatter breaks a pair across lines whenever it does not fit, and a third
   element, the description, may follow the value. A reader that misses either
   silently drops tokens out of the stylesheet, and `--helix-font-sans` going
   with them takes the whole site back to Times.
   
   The regular expression is not the lesson. The assertion below is, because a
   reader that skips an entry cannot report that it did. */
const pattern =
  /\/\*([\s\S]*?)\*\/|\[\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'\s*(?:,\s*'(?:[^'\\]|\\.)*')?\s*,?\s*\]/g
for (const match of body.matchAll(pattern)) {
  if (match[1] !== undefined) {
    const lines = match[1]
      .trim()
      .split('\n')
      .map((line) => line.trim())
    declarations.push(
      lines.length === 1
        ? `  /* ${lines[0]} */`
        : `  /* ${lines[0]}\n${lines
            .slice(1)
            .map((line) => (line ? `     ${line}` : ''))
            .join('\n')} */`,
    )
    continue
  }
  const name = match[2].replace(/\\'/g, "'")
  const value = match[3].replace(/\\'/g, "'").replace(/\\\\/g, '\\')
  declarations.push(`  --helix-${name}: ${value};`)
}

/* Every token in the registry has to reach the stylesheet.
   
   Counting the source and reporting that number lets declarations go missing
   while this says "177 tokens, current". The output is what a browser reads, so
   the output is what gets counted. */
const emitted = declarations.filter((line) => line.startsWith('  --helix-')).length
if (emitted !== TOKENS.length) {
  console.error(
    `token layer: ${TOKENS.length} tokens in the registry and ${emitted} reached the stylesheet.\n` +
      '  The reader in this script did not understand an entry it was handed.',
  )
  process.exit(1)
}

const block = `/* Generated from src/tokens.ts by \`turbo run token-layer\`. Do not edit. */\n:root,\n[data-helix-theme] {\n${declarations.join('\n')}\n}`

/* The whole file, hand-written half first. The generated block declares only
   `--helix-*` and the partial declares only `--_helix-*` and `color-scheme`, so
   nothing in one can be overridden by the other and appending is safe. */
const existing = existsSync(CSS) ? readFileSync(CSS, 'utf8') : ''
const css = formatted(`${readFileSync(MODES, 'utf8').trimEnd()}\n\n${block}\n`, 'tokens.css')

/* The JSON, which is what a document renders from and what an agent reads.
   
   **An array, not an object keyed by name.** Declaration order is content here:
   the surfaces read as a ladder and the sizes read as a scale, and both become
   a list the moment they are alphabetized. `useSortedKeys` would do exactly
   that to an object and be right to, since nothing about an object promises an
   order. An array promises one. */
const entries = TOKENS.map(([name, value, description]) => ({
  category: name.split('-')[0],
  ...(description ? { description } : {}),
  name: `--helix-${name}`,
  value,
}))
const categories = [...new Set(entries.map((entry) => entry.category))]
/* Through the formatter like everything else generated here. `JSON.stringify`
   with an indent is close to what biome writes and not the same, and a
   generated file the formatter would rewrite is a check failing over bytes
   nobody typed. */
const json = formatted(
  `${JSON.stringify({ categories, count: entries.length, groups: TOKEN_GROUPS, tokens: entries }, undefined, 2)}\n`,
  'tokens.json',
)

if (process.argv.includes('--check')) {
  /* `tokens.json` is a build output now, so a tree that has not been built has
     no file to compare. Absent is not stale. */
  const held = existsSync(JSON_OUT) ? readFileSync(JSON_OUT, 'utf8') : json
  const stale = [
    existing !== css ? 'tokens.css' : undefined,
    held !== json ? 'tokens.json' : undefined,
  ].filter(Boolean)
  if (stale.length > 0) {
    console.error(`token layer: ${stale.join(' and ')} stale. Run \`turbo run token-layer\``)
    process.exit(1)
  }
  console.log(`token layer: ${TOKENS.length} tokens in ${categories.length} categories, current`)
} else {
  mkdirSync(dirname(JSON_OUT), { recursive: true })
  writeFileSync(CSS, css)
  writeFileSync(JSON_OUT, json)
  console.log(`token layer: ${TOKENS.length} tokens in ${categories.length} categories written`)
}
