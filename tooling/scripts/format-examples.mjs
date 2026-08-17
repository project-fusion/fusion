#!/usr/bin/env node
/**
 * One attribute per line in every example, unless the element has only one.
 *
 * Biome does not format HTML, so the 159 examples were the one body of source in
 * this repository nothing kept consistent, and it showed: an element with six
 * attributes ran off the side of the sandbox's source pane, which is the pane a
 * reader is looking at when they meet the component. The rule is the one a
 * reader can apply without thinking about a column count. One attribute stays
 * where it is, because wrapping `<helix-card appearance="plain">` onto three
 * lines is noise; two or more go one per line, because that is where scanning
 * for a particular attribute starts costing something.
 *
 * The closing `>` goes on its own line at the tag's indentation, so the
 * attribute block reads as a list and the tag's own name and its end line up.
 * `/>` keeps its slash.
 *
 * **And they are alphabetized**, case-insensitively, which is the same rule this
 * repository applies to object keys, interface members and exported types. It
 * was left alone at first on the argument that a reader's own order says
 * something, and across 159 files it did not: the same element appeared with
 * `id` first here and `appearance` first there, so there was no order to
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
 * `bun run check` writes; `bun run check:examples` judges. Same split as
 * `biome check --write` against `biome ci`, for the same reason: a step that
 * edits your files cannot tell you whether they were right.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOTS = ['helix/web/src', 'helix/sandbox/src']

const walk = (dir, found = []) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      walk(path, found)
    } else if (path.endsWith('.html') && path.includes('.examples')) {
      found.push(path)
    }
  }
  return found
}

/**
 * Splits an open tag's attribute list into its parts.
 *
 * Hand-walked rather than matched with one expression, because an attribute
 * value can hold anything at all: `onsubmit="event.preventDefault()"` has a
 * space and parentheses in it, and a `style` value has semicolons. Only a quote
 * that is not inside another quote ends a value.
 */
const attributes = (body) => {
  const parts = []
  let current = ''
  let quote = ''
  for (const char of body) {
    if (quote) {
      current += char
      if (char === quote) {
        quote = ''
      }
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      current += char
      continue
    }
    if (/\s/.test(char)) {
      if (current) {
        parts.push(current)
        current = ''
      }
      continue
    }
    current += char
  }
  if (current) {
    parts.push(current)
  }
  return parts
}

/* An open tag, and only an open tag: not a closing tag, not a comment, not a
   doctype. The body stops at the first `>` that is not inside a quoted value,
   which is why this is a function and not a single pattern. */
const OPEN = /<([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g

const format = (text) =>
  /* The whole match is not used: every branch rebuilds the tag from its parts.
     Named `_whole` so the position is still readable against the pattern. */
  text.replace(OPEN, (_whole, tag, body, slash, index) => {
    const parts = attributes(body).sort((one, two) =>
      one.toLowerCase().localeCompare(two.toLowerCase()),
    )
    if (parts.length < 2) {
      /* Nothing to lay out. Collapse whatever whitespace it has, so a tag that
         was wrapped for one attribute comes back to one line. */
      return `<${tag}${parts.length ? ` ${parts[0]}` : ''}${slash}>`
    }
    const before = text.lastIndexOf('\n', index) + 1
    const indent = (text.slice(before, index).match(/^\s*/) ?? [''])[0]
    const inner = `${indent}  `
    return `<${tag}\n${parts.map((one) => inner + one).join('\n')}\n${indent}${slash}>`
  })

const problems = []
let written = 0

for (const root of ROOTS) {
  for (const path of walk(root)) {
    const before = readFileSync(path, 'utf8')
    const after = format(before)
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
}

if (problems.length > 0) {
  console.error(
    `Examples with more than one attribute on a line (${problems.length}):\n\n  ${problems.join(
      '\n  ',
    )}\n\nRun \`bun run check\` and commit the result.`,
  )
  process.exit(1)
}

console.log(
  process.argv.includes('--write')
    ? `examples: ${written} reformatted`
    : 'examples: one attribute per line, or one attribute',
)
