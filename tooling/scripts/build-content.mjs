#!/usr/bin/env bun
/**
 * Inlines the site's MDX into a module, and derives the registries from its
 * frontmatter.
 *
 * `@fusion-io/site-content` is a folder of `.mdx` files and a typed registry,
 * shaped like the two documentation packages. The site compiles those files to
 * React and serves the same bytes as `/thesis.md`, and it must do both without
 * touching the filesystem: a path this app cannot statically scope traces the
 * whole repository into the server bundle, which Turbopack warns about on every
 * build and which took two commits to get rid of.
 *
 * So the files become a `Record<string, string>` here, the same arrangement
 * `pages.generated.ts` and `catalog.generated.json` already use. Committed, and
 * `--check` fails when it and the content disagree.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatted } from './lib/formatted.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CONTENT = join(ROOT, 'site/content/content')
const OUT = join(ROOT, 'site/content/src/sources.generated.ts')
const PAGES = join(ROOT, 'site/content/src/pages.generated.ts')

/**
 * The frontmatter of one file, as strings.
 *
 * Hand-parsed for the reason `build-docs.mjs` gives: the whole grammar is
 * `key: value` at the top level, and a YAML dependency to read nine of those is
 * one a content package would carry for nothing.
 */
const frontmatter = (slug, source) => {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(source)
  if (!match) {
    throw new Error(`${slug}: has no frontmatter block`)
  }
  const fields = {}
  for (const line of match[1].split('\n')) {
    const pair = /^([a-zA-Z]+): (.*)$/.exec(line)
    if (!pair) {
      throw new Error(`${slug}: frontmatter line is not \`key: value\`: ${line}`)
    }
    fields[pair[1]] = pair[2].replace(/^'(.*)'$/, '$1').replace(/''/g, "'")
  }
  return fields
}

/**
 * Reading time, counted rather than authored.
 *
 * The field used to say it was authored because "the bodies are JSX, so
 * counting their words would mean walking a React tree at build time to save an
 * integer". They are markdown now, so the reason is gone and so is the number
 * nobody was maintaining. 200 words a minute, floor of one.
 */
const minutesOf = (body) => Math.max(1, Math.round(body.trim().split(/\s+/).length / 200))

/** A string literal. The formatter decides which quote it ends up in. */
const quoted = (value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

const slugs = readdirSync(CONTENT)
  .filter((file) => file.endsWith('.mdx'))
  .map((file) => file.replace(/\.mdx$/, ''))
  .sort()

const entries = slugs.map((slug) => {
  const source = readFileSync(join(CONTENT, `${slug}.mdx`), 'utf8')
  /* A template literal rather than a quoted string: this is prose with
     newlines in it, and the alternative is one line of `\n` escapes nobody can
     read in a diff. Backticks and `${` are the only things to escape. */
  const escaped = source.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
  /* Quoted only where it has to be. The formatter strips quotes from a key
     that is already a valid identifier, and a generated file it would rewrite
     is one that fails `biome ci` over bytes nobody typed. */
  const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(slug) ? slug : `'${slug}'`
  return `  ${key}: \`${escaped}\`,`
})

const generated = `/**
 * Every page's MDX, inlined by \`bun run content\`. Do not edit: the files in
 * \`content/\` are the source, and \`bun run check:content\` fails when this
 * module and they disagree.
 */
export const sitePageSources: Record<string, string> = {
${entries.join('\n')}
}
`

/* The registries, derived from the same frontmatter.
 *
 * **The file name is the identifier.** A post's slug is what its file is
 * called, so creating one is naming a file, two posts cannot silently share a
 * URL, and retitling is editing frontmatter rather than moving an address. A
 * deliberate rename is a `git mv`, which is visible in review and is where
 * `check:routes` asks for a redirect.
 *
 * Two lists come out: the pages of the site, and the essays. They differ only
 * in which fields a card needs, and both are the frontmatter rather than a
 * second copy of it. */
const pages = []
const essays = []
for (const slug of slugs) {
  const source = readFileSync(join(CONTENT, `${slug}.mdx`), 'utf8')
  const meta = frontmatter(slug, source)
  const body = source.split('---\n').slice(2).join('---\n')
  const entry = { ...meta, slug }
  if (meta.topic !== undefined) {
    essays.push({ ...entry, minutes: minutesOf(body) })
  } else {
    pages.push(entry)
  }
}

/* Emitted plainly, then handed to the formatter. Nothing here tries to predict
   where a line breaks or which quote a string takes. */
const literal = (entry, keys) =>
  [
    '  {',
    ...keys
      .filter((key) => entry[key] !== undefined && entry[key] !== '')
      .map((key) =>
        key === 'minutes'
          ? `    ${key}: ${entry[key]},`
          : `    ${key}: ${quoted(String(entry[key]))},`,
      ),
    '  },',
  ].join('\n')

const PAGE_KEYS = ['appends', 'description', 'kicker', 'lede', 'path', 'slug', 'title']
const ESSAY_KEYS = [
  'author',
  'date',
  'description',
  'image',
  'imageAlt',
  'imageCredit',
  'kind',
  'minutes',
  'path',
  'slug',
  'title',
  'topic',
]

const registries = `/**
 * The site's pages and essays, derived from the frontmatter of each file by
 * \`bun run content\`. Do not edit: the files in \`content/\` are the source, and
 * \`bun run check:content\` fails when this module and they disagree.
 *
 * **The slug is the file name.** Nothing here assigns one.
 */
import type { SiteEssay, SitePage } from './index.js'

export const generatedPages: SitePage[] = [
${pages.map((entry) => literal(entry, PAGE_KEYS)).join('\n')}
]

export const generatedEssays: SiteEssay[] = [
${essays
  .sort((a, b) => (a.date < b.date ? 1 : -1))
  .map((entry) => literal(entry, ESSAY_KEYS))
  .join('\n')}
]
`

if (process.argv.includes('--check')) {
  /* Named rather than compared inline, because the first version of this
     compared one file against its formatted form and the other against its raw
     one, and reported a staleness that regenerating could never fix. */
  const wantSources = formatted(generated, 'sources.generated.ts')
  const wantPages = formatted(registries, 'pages.generated.ts')
  const stale = [
    readFileSync(OUT, 'utf8') !== wantSources ? 'sources' : undefined,
    readFileSync(PAGES, 'utf8') !== wantPages ? 'pages' : undefined,
  ].filter(Boolean)
  if (stale.length > 0) {
    console.error(`content: ${stale.join(' and ')} stale. Run \`bun run content\``)
    process.exit(1)
  }
  console.log(
    `content: ${slugs.length} files, ${pages.length} pages and ${essays.length} essays, all derived from their own frontmatter`,
  )
} else {
  writeFileSync(OUT, formatted(generated, 'sources.generated.ts'))
  writeFileSync(PAGES, formatted(registries, 'pages.generated.ts'))
  console.log(
    `content: ${slugs.length} files inlined, ${pages.length} pages and ${essays.length} essays derived`,
  )
}
