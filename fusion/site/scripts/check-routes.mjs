#!/usr/bin/env bun
/**
 * Every route has a document, and every document has a route.
 *
 * **This is what stops the markdown surface decaying into a stale parallel
 * site**, which is the failure mode of every documentation-for-models project
 * that keeps two lists. The registry in `fusion/site/content/routes/routes.ts` is the one
 * list, the sitemap and `llms.txt` and the generator all read it, and this
 * holds the files it produced to what it says exists.
 *
 * Three directions, and the third is the one a person would not think to look
 * for:
 *
 * - **A route with no `.md`** is a link in `llms.txt` that 404s.
 * - **An `.md` with no route** is a file nothing links to, left behind by a
 *   page that was removed or a family that was renamed.
 * - **An `.md` that exists and says nothing** is the worst of the three,
 *   because both of the checks above pass over it. A generator that stopped
 *   producing content writes empty files rather than none.
 *
 * **Be honest about the limit.** This verifies that a document exists, is well
 * formed and belongs to a route. It cannot verify that it agrees with the page,
 * and in one place it deliberately does not: a component's `.md` carries the
 * examples the HTML page withholds. Generating both from one source is what
 * prevents drift; this only catches the cases where a source stopped being
 * wired up at all.
 *
 * Run with `turbo run routes`, which runs `turbo run catalog` first. It writes
 * nothing, so `--check` is accepted and changes nothing.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

const PUBLIC = join(ROOT, 'fusion/site/public')

/** The shortest a document can be and still say anything. */
const FLOOR = 40

const problems = []

const { routes } = await import('../content/routes/routes.ts')
const all = routes()

if (all.length === 0) {
  console.error('routes: the registry is empty, which is a check that counts nothing')
  process.exit(1)
}

/** Where a route's document is, relative to `public`. */
const documentOf = (path) => (path === '/' ? 'index.md' : `${path.slice(1)}.md`)

const expected = new Set()
for (const route of all) {
  const file = documentOf(route.path)
  expected.add(file)

  const absolute = join(PUBLIC, file)
  if (!existsSync(absolute)) {
    problems.push(`${route.path}: has no document at public/${file}`)
    continue
  }

  const body = readFileSync(absolute, 'utf8')
  if (body.trim().length < FLOOR) {
    problems.push(`${route.path}: its document is ${body.trim().length} bytes, which says nothing`)
  }
  if (!body.startsWith('---\n')) {
    problems.push(`${route.path}: its document has no frontmatter block`)
  } else if (!/^---\n[\s\S]*?\n---\n/.test(body)) {
    problems.push(`${route.path}: its frontmatter block is not closed`)
  }
  if (body.includes('\u2014')) {
    problems.push(`${route.path}: its document contains an em dash`)
  }
}

/** Every `.md` under `public`, which is the generator's whole output. */
const written = readdirSync(PUBLIC, { recursive: true }).filter((entry) => entry.endsWith('.md'))

for (const file of written) {
  if (!expected.has(file)) {
    problems.push(`public/${file}: is a document no route points at`)
  }
}

/* The component `.json` beside each `.md`, which nothing above would notice the
   absence of: it is not a route and not markdown, and the family page is what
   reads it. */
const components = all.filter((route) => route.kind === 'component')
for (const route of components) {
  const json = join(PUBLIC, `${route.path.slice(1)}.json`)
  if (!existsSync(json)) {
    problems.push(`${route.path}: has a document and no JSON beside it`)
  }
}

const kinds = all.reduce((counts, route) => {
  counts[route.kind] = (counts[route.kind] ?? 0) + 1
  return counts
}, {})

/* How many prose pages still serve the stub.
 *
 * **Counted rather than failed on**, because a stub is the honest state of a
 * page whose copy has not moved into a typed module yet, and failing on it
 * would only pressure someone into writing the parallel prose this arrangement
 * exists to prevent. What a count does is stop the remaining work from going
 * quiet: a number that does not fall is a piece of work nobody is doing, and
 * that is visible here rather than in somebody's memory. */
const stubs = all.filter((route) => {
  if (route.kind !== 'page' && route.kind !== 'insight') {
    return false
  }
  const file = join(PUBLIC, documentOf(route.path))
  return existsSync(file) && readFileSync(file, 'utf8').includes('renders from a typed module')
})

console.log(
  `routes: ${all.length} routes, every one with a document that says something ` +
    `(${Object.entries(kinds)
      .sort()
      .map(([kind, count]) => `${count} ${kind}`)
      .join(', ')})`,
)
if (stubs.length > 0) {
  console.log(
    `  ${stubs.length} of those are still a stub, their copy not yet in a module: ` +
      stubs
        .map((route) => route.path)
        .sort()
        .join(', '),
  )
}
