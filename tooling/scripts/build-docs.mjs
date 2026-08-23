#!/usr/bin/env node
/**
 * Derives the Helix docs registry from the frontmatter of the pages themselves.
 *
 * **Title and description used to exist twice**, once in `src/registry.ts` and
 * once in each file's frontmatter, with nothing holding the two together. Only
 * three of the nine pages had frontmatter at all, so the copy that was supposed
 * to be authoritative did not exist for two thirds of the library and nobody
 * noticed, which is the shape of the failure rather than an accident of it.
 *
 * **The frontmatter wins.** It is what a `.md` consumer receives, so a registry
 * that disagreed with it would be right only for readers of the rendered site.
 * Adding a page is now one file.
 *
 * The output is committed and `--check` fails when it and the content disagree,
 * the same arrangement `build-reference.mjs` and `build-tokens.mjs` already
 * use. A content package must not read the filesystem at runtime: a site
 * importing one that did would trace the whole package into its server bundle,
 * which is a warning `site/ui` has today for exactly this reason.
 *
 * **Validation lives here rather than in a separate check**, because an invalid
 * registry should be impossible to generate rather than possible to generate
 * and then caught. A bad `parent`, a duplicate `order`, two pinned pages in one
 * section: all of them fail the build, so the committed file is only ever a
 * valid one.
 *
 * Run with `bun run docs`, or `bun run check:docs` for the check.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CONTENT = join(ROOT, 'helix/docs/content')
const OUT = join(ROOT, 'helix/docs/src/pages.generated.ts')
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

const slugs = readdirSync(CONTENT)
  .filter((file) => file.endsWith('.mdx'))
  .map((file) => file.replace(/\.mdx$/, ''))
  .sort()

const pages = []
for (const slug of slugs) {
  const source = readFileSync(join(CONTENT, `${slug}.mdx`), 'utf8')

  /* The rule is stated in CLAUDE.md and nothing else enforces it in prose. It
     is checked here rather than in a sweep of its own because this is the one
     script that already reads every page. */
  if (source.includes('—')) {
    fail(slug, 'contains an em dash, which this repository does not use')
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

/**
 * A string as this repository writes one: single quotes, per `biome.json`.
 * `JSON.stringify` would emit double and the formatter would rewrite the
 * generated file on its next run, which is a file that fails `--check` the
 * moment anyone runs `bun run check`.
 */
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
    '  },',
  ]
    .filter((line) => line !== undefined)
    .join('\n')

const generated = `/**
 * Every page this package documents, derived from the frontmatter of each MDX
 * file by \`bun run docs\`. Do not edit: \`bun run check:docs\` fails when this
 * file and the content disagree, and the content is the source.
 */
import type { DocPage } from './registry.js'

export const docPages: DocPage[] = [
${pages.map(literal).join('\n')}
]
`

if (check) {
  const existing = readFileSync(OUT, 'utf8')
  if (existing !== generated) {
    console.error('docs: pages.generated.ts is stale. Run `bun run docs`')
    process.exit(1)
  }
  console.log(
    `docs: ${pages.length} pages across ${sections.length} sections, every one derived from its own frontmatter`,
  )
} else {
  writeFileSync(OUT, generated)
  console.log(`docs: wrote ${pages.length} pages across ${sections.length} sections`)
}
