#!/usr/bin/env node
/**
 * Derives the Helix docs registry from the frontmatter of the pages themselves.
 *
 * **The frontmatter wins**, and title and description are not written a second
 * time in `src/registry.ts`. It is what a `.md` consumer receives, so a registry
 * that disagreed with it would be right only for readers of the rendered site.
 * Adding a page is now one file.
 *
 * The output is committed and `--check` fails when it and the content disagree,
 * the same arrangement `build-reference.mjs` and `build-tokens.mjs` already
 * use. A content package must not read the filesystem at runtime: a site
 * importing one that did would trace the whole package into its server bundle,
 * which is a warning `fusion/site` has today for exactly this reason.
 *
 * **Validation lives here rather than in a separate check**, because an invalid
 * registry should be impossible to generate rather than possible to generate
 * and then caught. A bad `parent`, a duplicate `order`, two pinned pages in one
 * section: all of them fail the build, so the committed file is only ever a
 * valid one.
 *
 * Run with `turbo run docs`, or `turbo run docs -- --check` for the check.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatted } from '@fusion.dev/scripts/formatted'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const CONTENT = join(ROOT, 'helix/docs/content')
const OUT = join(ROOT, 'helix/docs/src/pages.generated.ts')
const SOURCES = join(ROOT, 'helix/docs/src/sources.generated.ts')
const REGISTRY = join(ROOT, 'helix/styles/tokens.json')
const PRIMITIVES = join(ROOT, 'helix/styles/src/primitives.css')

/**
 * The token tables the Foundations pages carry, filled from the registry.
 *
 * **Written into the file rather than rendered by a component.** A
 * `<Tokens category="color" />` would be childless, which this same script
 * refuses two hundred lines below, and for the reason that applies exactly
 * here: the content would exist only in the rendered page and
 * `/helix/docs/color.md` would have a hole where the table was. A generated
 * region in the file is complete markdown on both surfaces and cannot drift,
 * which is the arrangement `tokens.css` already uses.
 *
 * The marker is a link reference definition that nothing links to, which is
 * markdown's own way of writing a comment: it renders as nothing, in the page
 * and in the document alike. Verified through the real MDX pipeline rather than
 * assumed, because `{/* *``/}` would have been the MDX-native way and leaves its
 * braces in the `.md`.
 */
const OPEN = /^\[\/\/\]: # \(tokens:([a-z-]+)\)$/

/**
 * A token's value with the primitives resolved out of it.
 *
 * A Foundations page showing `var(--_helix-scale-2)` is showing a reader the one
 * layer they are told never to touch, and telling them nothing: the point of the
 * table is what the token is worth. Resolved, `--helix-space-xs` reads as a
 * length and `--helix-color-background` as the two colors it actually is.
 */
const resolve = (value, primitives, depth = 0) => {
  if (depth > 6) {
    return value
  }
  /* The stylesheet wraps a long value across lines, and the whitespace comes
     through with it: `color-mix( in oklab, …` is what the source looks like and
     not what a reader wants in a cell. */
  const tidy = value.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s+/g, ' ')
  const next = tidy.replace(
    /var\((--_helix-[a-z0-9-]+)(?:,\s*([^()]*))?\)/g,
    (whole, name, fallback) => (primitives.has(name) ? primitives.get(name) : (fallback ?? whole)),
  )
  return next === tidy ? tidy : resolve(next, primitives, depth + 1)
}
const SECTIONS = join(ROOT, 'helix/docs/src/sections.ts')

const check = process.argv.includes('--check')

/** Every failure found, reported together rather than one run at a time. */
const problems = []
const fail = (slug, message) => problems.push(`${slug}: ${message}`)

/**
 * The frontmatter of one page, as strings.
 *
 * Hand-parsed rather than pulled from a YAML library. The whole grammar here is
 * `key: value` at the top level, a dependency to parse nine of those is a
 * dependency a published content package would carry, and the parser refusing
 * anything it does not understand is what keeps the grammar that small.
 */
const frontmatter = (slug, source) => {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(source)
  if (!match) {
    fail(slug, 'has no frontmatter block')
    return undefined
  }
  const fields = {}
  for (const line of match[1].split('\n')) {
    const pair = /^([a-z]+): (.*)$/.exec(line)
    if (!pair) {
      fail(slug, `frontmatter line is not \`key: value\`: ${line}`)
      continue
    }
    fields[pair[1]] = pair[2].replace(/^'(.*)'$/, '$1')
  }
  const keys = Object.keys(fields)
  const sorted = [...keys].sort()
  if (keys.join() !== sorted.join()) {
    fail(slug, `frontmatter keys are ${keys.join(', ')}, want ${sorted.join(', ')}`)
  }
  return fields
}

/** The section titles `sections.ts` declares, and which of them are paths. */
const declaredSections = () => {
  const source = readFileSync(SECTIONS, 'utf8')
  const block = /export const docSections: DocSection\[\] = \[([\s\S]*?)\n\]/.exec(source)
  if (!block) {
    throw new Error('sections.ts does not declare `docSections` in the shape this reads')
  }
  return [...block[1].matchAll(/\{([^}]*)\}/g)].map((entry) => ({
    path: /path: true/.test(entry[1]),
    title: /title: '([^']*)'/.exec(entry[1])?.[1] ?? '',
  }))
}

const sections = declaredSections()
const sectionTitles = new Set(sections.map((section) => section.title))

/* The registry, and the primitive map the values resolve against. Both are read
   once rather than per page, which would parse the same two files every time. */
const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'))
/** Every token name, for the check that a page does not invent one. */
const tokenNames = new Set(registry.tokens.map((token) => token.name))

const primitives = new Map(
  [...readFileSync(PRIMITIVES, 'utf8').matchAll(/^\s*(--_helix-[a-z0-9-]+):\s*([^;]+);/gm)].map(
    ([, name, value]) => [name, value.replace(/\s+/g, ' ').trim()],
  ),
)

/**
 * One category or named group, as the markdown table a page carries.
 *
 * A group is resolved first, because the two the registry has are the two the
 * prose refers to by name: the surface ladder is a sequence and the separation
 * policy spans two categories, and neither is a thing a category or a prefix
 * can select.
 */
const table = (name) => {
  const group = registry.groups[name]
  const rows = group
    ? group.map((token) => {
        const found = registry.tokens.find((entry) => entry.name === `--helix-${token}`)
        if (!found) {
          throw new Error(`the ${name} group names --helix-${token}, which is not a token`)
        }
        return found
      })
    : registry.tokens.filter((token) => token.category === name)
  if (rows.length === 0) {
    throw new Error(`tokens:${name} names neither a category nor a group the registry has`)
  }
  /* A third column when the category is described, and none when it is not.
     Half a column is a table with holes in it, and the registry's own rule is
     that a category is described or it is not. */
  const described = rows.every((token) => token.description)
  /* **A color is shown, and every other kind is written.**
   *
   * A color's declaration is its derivation and not its answer: a
   * `light-dark(oklch(...), oklch(...))` wrapped over six lines asks a reader
   * to evaluate a color function in their head, on a page where only one arm
   * of the `light-dark()` even applies. A swatch answers it at a glance, and
   * answers it *live*: it reads the token, so it follows the reader's own color
   * mode and any theme over it, which no string in a table can do.
   *
   * Only color. A space, a radius and a duration are already one short token
   * long, and a swatch of `0.75rem` would be a worse answer than the text.
   *
   * The derivation is not lost, it moves to where it is explained: `theming`
   * has the seed model, and that is the page a reader is on when the shape of
   * the value is the question.
   *
   * **A `data-` attribute rather than a class, and the reason is not taste.**
   * The documentation prose is styled through a CSS module, so a class written
   * here as a literal would be compared against a hashed one and match nothing:
   * valid markup, a rule that exists, and no swatch, with no error anywhere.
   * That is the failure `#241` found in the gallery filter, where
   * `.familyGrid` was written out against `gallery-module__uieGra__familyGrid`.
   * An attribute is not rewritten, so what is generated here is what the
   * stylesheet can name, and `site.css` keys on `data-` for exactly this reason
   * everywhere else. */
  const color = rows.every((token) => token.category === 'color')
  const heading = color ? 'Sample' : 'Value'
  const cell = (token) =>
    color
      ? `<span data-token-swatch style={{ background: 'var(${token.name})' }} />`
      : `\`${resolve(token.value, primitives)}\``
  return [
    described ? `| Token | ${heading} | For |` : `| Token | ${heading} |`,
    described ? '| --- | --- | --- |' : '| --- | --- |',
    ...rows.map((token) =>
      described
        ? `| \`${token.name}\` | ${cell(token)} | ${token.description} |`
        : `| \`${token.name}\` | ${cell(token)} |`,
    ),
  ].join('\n')
}

/**
 * A page with its generated regions filled.
 *
 * Everything between a `tokens:<category>` marker and the `/tokens` that closes
 * it is replaced. The markers stay, so the region is visible to whoever edits
 * the file and the next run knows where to write.
 */
const filled = (source) => {
  const lines = source.split('\n')
  const out = []
  let inside = false
  for (const line of lines) {
    const open = OPEN.exec(line)
    if (open) {
      out.push(line, '', table(open[1]), '')
      inside = true
      continue
    }
    if (line === '[//]: # (/tokens)') {
      out.push(line)
      inside = false
      continue
    }
    if (!inside) {
      out.push(line)
    }
  }
  if (inside) {
    throw new Error('a `tokens:` region is never closed by `[//]: # (/tokens)`')
  }
  return out.join('\n')
}

const slugs = readdirSync(CONTENT)
  .filter((file) => file.endsWith('.mdx'))
  .map((file) => file.replace(/\.mdx$/, ''))
  .sort()

const pages = []
const refilled = []
for (const slug of slugs) {
  const onDisk = readFileSync(join(CONTENT, `${slug}.mdx`), 'utf8')

  /* Filled before anything else reads it, so the em dash rule, the childless
     component rule and the inlined sources all see the page a reader will.

     A marker naming something the registry does not have throws, and a throw
     out of here is a stack trace where every other problem in this script is a
     sentence. Caught and reported like the rest of them. */
  let source = onDisk
  try {
    source = filled(onDisk)
  } catch (error) {
    fail(slug, error instanceof Error ? error.message : String(error))
    continue
  }
  if (source !== onDisk) {
    refilled.push(slug)
  }

  /* The rule is stated in AGENTS.md and nothing else enforces it in prose. It
     is checked here rather than in a sweep of its own because this is the one
     script that already reads every page. */
  if (source.includes('—')) {
    fail(slug, 'contains an em dash, which this repository does not use')
  }

  /* Every token a page names has to exist.
   *
   * It covers prose, which is more than generating the tables does: a table can
   * be filled from the registry and a paragraph beside it can still name
   * something that does not exist.
   *
   * `--helix-seed-*` is exempt because `derive()` emits it at runtime and it
   * appears in no stylesheet, which is the same split `check:css:seeds` exists for.
   * A trailing hyphen is a wildcard a sentence wrote, as in
   * `--helix-color-series-*`. */
  for (const [, named] of source.matchAll(/(--helix-[a-z0-9-]+)/g)) {
    if (named.startsWith('--helix-seed-') || named.endsWith('-')) {
      continue
    }
    if (!tokenNames.has(named)) {
      fail(slug, `names \`${named}\`, which is not a token`)
    }
  }

  /* A component in content is allowed, and a childless one is not.
   *
   * **The docs `.md` is the MDX source, served as it is**, which is lossless
   * today because no page here has live JSX in it. The question that decides
   * whether it stays lossless is not whether a component is complicated, it is
   * whether its text is inside it.
   *
   * `<Callout tone="warning">The thing to know</Callout>` degrades on its own:
   * a reader, human or otherwise, gets the sentence and an obvious wrapper, and
   * loses only the styling. `<Verticals />` degrades to nothing at all, because
   * the content was never in the file: the `.md` gets a tag and a hole where
   * the substance was, and nothing about the file says so.
   *
   * So the rule is narrower than "every component needs a markdown renderer",
   * which is the most fragile idea in the protocol. A component that carries its own children passes through. One that does
   * not has to be given a renderer or taken out. */
  for (const [, tag] of source.matchAll(/<([A-Z][A-Za-z0-9]*)[^>]*\/>/g)) {
    fail(slug, `renders <${tag} /> with no children, which is a hole in its \`.md\``)
  }

  const fields = frontmatter(slug, source)
  if (!fields) {
    continue
  }
  for (const required of ['description', 'section', 'title']) {
    if (!fields[required]) {
      fail(slug, `frontmatter has no \`${required}\``)
    }
  }
  if (fields.section && !sectionTitles.has(fields.section)) {
    fail(slug, `is in section "${fields.section}", which sections.ts does not declare`)
  }
  if (fields.pinned !== undefined && fields.pinned !== 'true') {
    fail(slug, '`pinned` is written when true and absent otherwise')
  }
  if (fields.trailing !== undefined && fields.trailing !== 'true') {
    fail(slug, '`trailing` is written when true and absent otherwise')
  }
  /* It ranks a page against its siblings, and a page with no siblings has no
     rank to take. Every trailing page today is a child of Installation. */
  if (fields.trailing === 'true' && fields.parent === undefined) {
    fail(slug, 'is `trailing` with no `parent`, and a top-level page has nothing to trail')
  }
  if (fields.order !== undefined && !/^[0-9]+$/.test(fields.order)) {
    fail(slug, `\`order\` is not a number: ${fields.order}`)
  }
  pages.push({
    description: fields.description ?? '',
    order: fields.order === undefined ? undefined : Number(fields.order),
    parent: fields.parent,
    pinned: fields.pinned === 'true',
    section: fields.section ?? '',
    slug,
    title: fields.title ?? '',
    trailing: fields.trailing === 'true',
  })
}

const bySlug = new Map(pages.map((page) => [page.slug, page]))

for (const page of pages) {
  if (page.parent === undefined) {
    continue
  }
  const parent = bySlug.get(page.parent)
  if (!parent) {
    fail(page.slug, `\`parent\` is "${page.parent}", which is not a page`)
  } else if (parent.parent !== undefined) {
    /* One level, because Installation is the only page that needs a child and a
       general tree invites four-deep navigation nobody asked for. */
    fail(page.slug, `\`parent\` is "${page.parent}", which is itself a child`)
  } else if (parent.section !== page.section) {
    fail(page.slug, `is in "${page.section}" but its parent is in "${parent.section}"`)
  }
}

for (const section of sections) {
  const own = pages.filter((page) => page.section === section.title && page.parent === undefined)
  if (own.length === 0) {
    problems.push(`${section.title}: is declared with no pages in it`)
    continue
  }
  if (section.path) {
    const missing = own.filter((page) => page.order === undefined)
    for (const page of missing) {
      fail(page.slug, `is in "${section.title}", a path, and carries no \`order\``)
    }
    const orders = own.map((page) => page.order).filter((order) => order !== undefined)
    if (new Set(orders).size !== orders.length) {
      problems.push(`${section.title}: two pages share an \`order\``)
    }
    continue
  }
  for (const page of own.filter((entry) => entry.order !== undefined)) {
    fail(page.slug, `carries an \`order\`, but "${section.title}" sorts alphabetically`)
  }
  const pinned = own.filter((page) => page.pinned)
  if (pinned.length > 1) {
    problems.push(
      `${section.title}: ${pinned.map((page) => page.slug).join(' and ')} are both pinned, and a section has one entry page`,
    )
  }
}

if (problems.length > 0) {
  console.error(`docs: ${problems.length} problem${problems.length === 1 ? '' : 's'}`)
  for (const problem of problems) {
    console.error(`  ${problem}`)
  }
  process.exit(1)
}

/** A string literal. The formatter decides which quote it ends up in. */
const quoted = (value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

/** A page, as the source lines that reproduce it. */
const literal = (page) =>
  [
    '  {',
    `    description: ${quoted(page.description)},`,
    page.order === undefined ? undefined : `    order: ${page.order},`,
    page.parent === undefined ? undefined : `    parent: ${quoted(page.parent)},`,
    page.pinned ? '    pinned: true,' : undefined,
    `    section: ${quoted(page.section)},`,
    `    slug: ${quoted(page.slug)},`,
    `    title: ${quoted(page.title)},`,
    page.trailing ? '    trailing: true,' : undefined,
    '  },',
  ]
    .filter((line) => line !== undefined)
    .join('\n')

const generated = `/**
 * Every page this package documents, derived from the frontmatter of each MDX
 * file by \`turbo run docs\`. Do not edit: \`turbo run docs -- --check\` fails when this
 * file and the content disagree, and the content is the source.
 */
import type { DocPage } from './registry.js'

export const docPages: DocPage[] = [
${pages.map(literal).join('\n')}
]
`

/* Written back, because the file is the source of both surfaces: the page
   renders it and `/helix/docs/<slug>.md` serves it. A table that existed only
   in a generated module would leave the document with a hole in it, which is
   the whole reason these are regions in the file rather than a component. */
if (!check && refilled.length > 0) {
  for (const slug of refilled) {
    writeFileSync(
      join(CONTENT, `${slug}.mdx`),
      filled(readFileSync(join(CONTENT, `${slug}.mdx`), 'utf8')),
    )
  }
}

/* The MDX itself, inlined for the same reason `@fusion.dev/insights` inlines
   its own: a page that reads the file at request time is the filesystem access
   that traced this repository into a server bundle, and a content package must
   not be the thing that puts it back. */
const sources = `/**
 * Every page's MDX, inlined by \`turbo run docs\`. Do not edit: the files in
 * \`content/\` are the source, and \`turbo run docs -- --check\` fails when this module
 * and they disagree.
 */
export const docSources: Record<string, string> = {
${slugs
  .map((slug) => {
    const body = filled(readFileSync(join(CONTENT, `${slug}.mdx`), 'utf8'))
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$\{/g, '\\${')
    const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(slug) ? slug : `'${slug}'`
    return `  ${key}: \`${body}\`,`
  })
  .join('\n')}
}
`

if (check) {
  const existing = readFileSync(OUT, 'utf8')
  if (refilled.length > 0) {
    console.error(`docs: a token table is stale in ${refilled.join(', ')}. Run \`turbo run docs\``)
    process.exit(1)
  }
  if (
    existing !== formatted(generated, 'pages.generated.ts') ||
    readFileSync(SOURCES, 'utf8') !== formatted(sources, 'sources.generated.ts')
  ) {
    console.error('docs: pages.generated.ts is stale. Run `turbo run docs`')
    process.exit(1)
  }
  console.log(
    `docs: ${pages.length} pages across ${sections.length} sections, every one derived from its own frontmatter`,
  )
} else {
  writeFileSync(OUT, formatted(generated, 'pages.generated.ts'))
  writeFileSync(SOURCES, formatted(sources, 'sources.generated.ts'))
  console.log(`docs: wrote ${pages.length} pages across ${sections.length} sections`)
}
