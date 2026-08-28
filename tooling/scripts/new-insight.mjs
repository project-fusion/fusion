#!/usr/bin/env bun
/**
 * Starts a post: names its file from its title, and fills in the frontmatter.
 *
 * ```
 * bun run insight "Lockstep versioning, one domain at a time"
 * bun run insight "Lockstep versioning, one domain at a time" --slug lockstep-per-domain
 * ```
 *
 * **The file name is the slug, so this is the one moment it is decided.** After
 * this the title is editorial and free to change, and the address does not move
 * with it. That is the whole reason a scaffold exists rather than a rule
 * somebody remembers: derivation belongs at creation, and nowhere else.
 *
 * **A collision is refused rather than suffixed.** Two posts with the same title
 * is a signal, usually a follow-up that wants a different title or an earlier
 * post the author forgot. `lockstep-per-domain-2` is a slug nobody can read and
 * it hides the thing worth knowing, so this stops and names the existing file.
 * `--slug` is the way through, and it is also how a long title gets a short
 * address: `lockstep-per-domain` is the best of the six slugs here and it is the
 * only one that was never derived.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CONTENT = join(ROOT, 'docs/insights/content')

const args = process.argv.slice(2)
const flags = new Map()
const positional = []
for (let at = 0; at < args.length; at += 1) {
  const arg = args[at]
  if (arg.startsWith('--')) {
    flags.set(arg.slice(2), args[at + 1])
    at += 1
  } else {
    positional.push(arg)
  }
}
const flag = (name) => flags.get(name)
const title = positional[0]

if (!title) {
  console.error('Usage: bun run insight "The title" [--slug short-name] [--topic Design]')
  process.exit(1)
}

/** A title, as a file name. Lowercase, alphanumerics, single hyphens. */
const slugify = (value) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const slug = flag('slug') ?? slugify(title)
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`insight: "${slug}" is not a slug. Lowercase letters, digits and hyphens.`)
  process.exit(1)
}

const file = join(CONTENT, `${slug}.mdx`)
if (existsSync(file)) {
  console.error(
    `insight: /insights/${slug} already exists, at docs/insights/content/${slug}.mdx.\n` +
      '  Two posts cannot share an address. Change the title, or pass --slug.',
  )
  process.exit(1)
}

/* Whoever wrote the most recent post, rather than a name compiled in here.
   There is one author today, and the day there are two this guesses wrong once,
   visibly, in a file the writer is about to edit anyway. */
const authorOf = () => {
  const posts = readdirSync(CONTENT)
    .filter((entry) => entry.endsWith('.mdx'))
    .map((entry) => readFileSync(join(CONTENT, entry), 'utf8'))
    .filter((source) => /^topic: /m.test(source))
    .sort((a, b) =>
      (/^date: (.*)$/m.exec(a)?.[1] ?? '') < (/^date: (.*)$/m.exec(b)?.[1] ?? '') ? 1 : -1,
    )
  return /^author: (.*)$/m.exec(posts[0] ?? '')?.[1]
}
const author = flag('author') ?? authorOf() ?? 'Unknown'

const today = flag('date') ?? new Date().toISOString().slice(0, 10)

writeFileSync(
  file,
  [
    '---',
    `author: ${author}`,
    `date: ${today}`,
    'description: One sentence, which is the line under the title on the card and on the post.',
    'kicker: Insights',
    `kind: ${flag('kind') ?? 'Essay'}`,
    `path: /insights/${slug}`,
    `title: ${title}`,
    `topic: ${flag('topic') ?? 'Engineering'}`,
    '---',
    '',
    'The first paragraph. There is no heading above it: the title is the heading,',
    'and a document that repeats its own name before its first sentence is one',
    'nobody wrote that way on purpose.',
    '',
    '## A section',
    '',
    'Wrapped at 80 columns. No em dashes.',
    '',
  ].join('\n'),
)

console.log(`insight: docs/insights/content/${slug}.mdx`)
console.log(`  /insights/${slug}`)
console.log('  Fill in `description`, `kind` and `topic`, then `bun run gen:content`.')
