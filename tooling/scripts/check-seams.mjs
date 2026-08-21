#!/usr/bin/env node
/**
 * Checks that a base component renders another family behind a method.
 *
 * **A styled tier can override a method and cannot override a fragment.** When
 * a headless template names `<helix-listbox>` inline, the tier above inherits
 * that decision whole: it can restyle the listbox through its own definition of
 * the tag, and it cannot render something else there, wrap it, pass it a
 * property the base does not know about, or leave it out. Every one of those is
 * a normal thing for a styled tier to want, and each one currently costs a
 * complete reimplementation of `render`.
 *
 * The convention this enforces is the one Combobox already described in a
 * comment: the template names the *public* tag, and each tier side-effect
 * imports its own version of it. What the comment could not do is apply to the
 * other twenty-one files, which is what this is for.
 *
 * **The seam is a `protected render<Something>()` method**, one per composed
 * element, called from `render`. Overriding it is then the ordinary way to
 * change what goes there, and it is the same seam a consumer subclassing the
 * base gets.
 *
 * **What counts as another family.** The tag's family, taken from where it is
 * declared rather than from its name: `helix-menu-item` is declared in
 * `menu/item/`, so its family is `menu`. A component rendering its own family
 * is exempt, since a part rendering a sibling part is one folder composing
 * itself, and there is no tier decision in it.
 *
 * `<helix-icon>` is exempt too, and that is a judgement rather than an
 * oversight. It is a leaf that takes a name and draws it, it appears in
 * fourteen families, and there is no version of "render a different icon
 * element" that a consumer wants and `--icon-size` plus their own `helix-icon`
 * does not already give them. Wrapping every one of them in a method would be
 * fourteen seams nobody opens.
 *
 * Comments and JSDoc are stripped first, for the reason `check:composed` gives:
 * class docs are full of usage examples naming tags the file has no business
 * rendering, and those are prose.
 *
 * Run with `bun run check:seams` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const TIER = 'helix/headless/src'
const EXEMPT = new Set(['icon'])

/** Every `.ts` under a tier, specs excluded. */
const sources = (root) => {
  const found = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) {
        walk(path)
      } else if (entry.endsWith('.ts') && !entry.includes('.spec.')) {
        found.push(path)
      }
    }
  }
  walk(root)
  return found
}

const withoutComments = (text) =>
  text
    .replaceAll(/\/\*[\s\S]*?\*\//g, (match) => ' '.repeat(match.length))
    .replaceAll(/\/\/[^\n]*/g, (match) => ' '.repeat(match.length))

/* Where each tag is declared, so a part's family is its folder and not its
   name. Same rule `check:composed` settled on, and for the same reason. */
const families = new Map()
for (const file of sources(TIER)) {
  const declared = /@customElement\(['"]helix-base-([a-z0-9-]+)['"]\)/.exec(
    readFileSync(file, 'utf8'),
  )
  if (declared) {
    families.set(`helix-${declared[1]}`, file.split('/').at(-3))
  }
}

/** The character ranges of every `protected render<Something>()` body. */
const seams = (text) => {
  const ranges = []
  for (const match of text.matchAll(/\bprotected\s+(?:override\s+)?render[A-Z]\w*\s*\(/g)) {
    /* Past the parameter list before looking for the body.
     *
     * Taking the first `{` after the name finds the type literal in
     * `renderTag(option: { text: string })`, so the range covered the
     * signature and stopped, and the method's own body counted as outside
     * itself. It reported a component that had done exactly the right thing. */
    let index = match.index + match[0].length - 1
    let parens = 0
    for (; index < text.length; index += 1) {
      if (text[index] === '(') {
        parens += 1
      } else if (text[index] === ')') {
        parens -= 1
        if (parens === 0) {
          break
        }
      }
    }
    index = text.indexOf('{', index)
    if (index === -1) {
      continue
    }
    let depth = 0
    const start = index
    for (; index < text.length; index += 1) {
      if (text[index] === '{') {
        depth += 1
      } else if (text[index] === '}') {
        depth -= 1
        if (depth === 0) {
          break
        }
      }
    }
    ranges.push([start, index])
  }
  return ranges
}

const problems = []
for (const file of sources(TIER)) {
  const own = file.split('/').at(-3)
  const text = withoutComments(readFileSync(file, 'utf8'))
  const ranges = seams(text)
  const reported = new Set()

  for (const match of text.matchAll(/<(helix-[a-z0-9-]+)/g)) {
    const tag = match[1]
    const family = families.get(tag)
    if (family === undefined || family === own || EXEMPT.has(family)) {
      continue
    }
    const inside = ranges.some(([from, to]) => match.index > from && match.index < to)
    if (!inside && !reported.has(tag)) {
      reported.add(tag)
      problems.push(
        `${file}: renders <${tag}> inline. Put it behind a \`protected render…()\` method, ` +
          'so the styled tier can render something else there without reimplementing `render`.',
      )
    }
  }
}

if (problems.length > 0) {
  console.error(`Composition with no seam (${problems.length}):\n\n  ${problems.join('\n  ')}\n`)
  process.exit(1)
}

const composing = new Set(
  sources(TIER)
    .filter((file) => {
      const own = file.split('/').at(-3)
      const text = withoutComments(readFileSync(file, 'utf8'))
      return [...text.matchAll(/<(helix-[a-z0-9-]+)/g)].some((match) => {
        const family = families.get(match[1])
        return family !== undefined && family !== own && !EXEMPT.has(family)
      })
    })
    .map((file) => file.split('/').at(-3)),
)
console.log(
  `seams: ${composing.size} families compose another, every one behind a method the styled tier can override`,
)
