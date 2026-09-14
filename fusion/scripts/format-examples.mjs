#!/usr/bin/env node
/**
 * One attribute per line in every example, unless the element has only one.
 *
 * An element with six attributes runs off the side of the sandbox's source
 * pane, which is the pane a reader is looking at when they meet the component.
 * The rule is the one a reader can apply without thinking about a column count.
 * One attribute stays where it is, because wrapping
 * `<helix-card appearance="plain">` onto three lines is noise; two or more go
 * one per line, because that is where scanning for a particular attribute
 * starts costing something.
 *
 * **Three bodies of markup are under it**, because a reader copies whichever one
 * is in front of them: the `.examples` on both tiers, the ones in
 * `helix/sandbox`, and the fenced HTML in the documentation.
 *
 * `TIERS` rather than `SOURCE.styled` alone, which is what this walked until the
 * headless examples were counted: 41 open tags carrying two or more attributes on
 * a line, in a tier whose examples sit in the same sandbox pane the rule is
 * written for. A rule that governs one tier is a rule a reader meets half of.
 *
 * **Biome sorts attributes too, now that `useSortedAttributes` is on**, and this
 * has to agree with it or the two take turns undoing each other inside a single
 * `bun run fix`.
 *
 * The closing `>` goes on its own line at the tag's indentation, so the
 * attribute block reads as a list and the tag's own name and its end line up.
 * `/>` keeps its slash.
 *
 * **And they are alphabetized**, case-insensitively, which is the same rule this
 * repository applies to object keys, interface members and exported types. A
 * reader's own order says nothing here: the same element appears with `id`
 * first in one file and `appearance` first in another, so there is no order to
 * preserve, only an absence of one. Alphabetical is the order you can find an
 * attribute in without reading the others.
 *
 * Nothing here is order-sensitive, which is what makes this safe: HTML
 * attributes are a set, unlike the `exports` conditions in a `package.json`,
 * which is exactly why `useSortedKeys` is off for those.
 *
 * **It rewrites open tags and nothing else.** Text, comments and closing tags
 * are copied through untouched, and an attribute value is never re-quoted.
 *
 * `bun run fix` writes; `bun run check:cli:component` judges. Same split as
 * `biome check --write` against `biome ci`, for the same reason: a step that
 * edits your files cannot tell you whether they were right.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOTS = [...TIERS, SOURCE.sandbox]

/* And the prose, whose HTML samples are copied exactly as often as an example
   is. `check:cli:component` holds these fences to the rules about inline styles
   and declared state and leaves the shape of the markup alone, so a code fence
   is the one place a six-attribute one-liner could otherwise survive. */
const DOCS = ['helix/docs/content', 'cortex/docs/content']

const walk = (dir) =>
  readdirSync(dir, { recursive: true })
    .filter((entry) => entry.endsWith('.html') && entry.includes('.examples'))
    .map((entry) => join(dir, entry))

import { format } from '@fusion.dev/scripts/format-open-tags'
import { SOURCE, TIERS } from '@fusion.dev/scripts/workspace'

/* Fenced HTML only, and the fence is reformatted in place rather than the file:
   an MDX page is mostly prose, and prose has angle brackets in it. */
const FENCE = /(```html\n)([\s\S]*?)(```)/g

const formatFences = (text) =>
  text.replace(FENCE, (_, open, body, close) => open + format(body) + close)

const files = []
for (const root of ROOTS) {
  for (const path of walk(root)) {
    files.push([path, format])
  }
}
for (const dir of DOCS) {
  if (!existsSync(dir)) {
    continue
  }
  for (const entry of readdirSync(dir).filter((one) => one.endsWith('.mdx'))) {
    files.push([join(dir, entry), formatFences])
  }
}

const problems = []
let written = 0

for (const [path, apply] of files) {
  const before = readFileSync(path, 'utf8')
  const after = apply(before)
  if (before === after) {
    continue
  }
  if (process.argv.includes('--write')) {
    writeFileSync(path, after)
    written += 1
  } else {
    problems.push(path)
  }
}

if (problems.length > 0) {
  console.error(
    `Examples with more than one attribute on a line (${problems.length}):\n\n  ${problems.join(
      '\n  ',
    )}\n\nRun \`bun run fix\` and commit the result.`,
  )
  process.exit(1)
}

console.log(
  process.argv.includes('--write')
    ? `examples: ${written} reformatted`
    : `examples: ${files.length} files, one attribute per line, or one attribute`,
)
