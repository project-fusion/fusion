#!/usr/bin/env bun
import { spawnSync } from 'node:child_process'
/**
 * Every route has a document, and every document has a route.
 *
 * **This is what stops the markdown surface decaying into a stale parallel
 * site**, which is the failure mode of every documentation-for-models project
 * that keeps two lists. The registry in `site/ui/content/routes/routes.ts` is the one
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
 * Run with `bun run check:routes`, after `bun run catalog`.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PUBLIC = join(ROOT, 'site/ui/public')

/** The shortest a document can be and still say anything. */
const FLOOR = 40

const problems = []

const { routes } = await import('../../site/ui/content/routes/routes.ts')
const all = routes()

if (all.length === 0) {
  console.error('routes: the registry is empty, which is a check that counts nothing')
  process.exit(1)
}

/* **The two halves read the registry from different places, and a stale build
   makes that look like a content problem.**
   
   `routes()` is app code, so it imports `@helix-io/docs` and gets `dist`.
   `build-catalog.mjs` is tooling, so it reads `src` directly, the way every
   generator here reads source. Both are right, and between a content edit and
   the next build they disagree: the catalog writes a document for a page the
   route registry has never heard of, and the message for that is "a document no
   route points at", which sends a reader looking through content for a file
   that is not the problem. It cost a detour once already.
   
   Cheaper to say so. The content directory is the truth either way. */
const authored = new Set(
  readdirSync(join(ROOT, 'helix/docs/content'))
    .filter((entry) => entry.endsWith('.mdx'))
    .map((entry) => entry.replace(/\.mdx$/, '')),
)
const built = new Set(
  all.filter((route) => route.path.startsWith('/helix/docs/')).map((route) => route.path.slice(12)),
)
const drifted = [
  ...[...authored].filter((slug) => !built.has(slug)).map((slug) => `+${slug}`),
  ...[...built].filter((slug) => !authored.has(slug)).map((slug) => `-${slug}`),
]
if (drifted.length > 0) {
  console.error(
    `routes: helix/docs/dist is stale against its content (${drifted.join(' ')}).\n` +
      '  The route registry reads the built package and the catalog reads source.\n' +
      '  Run `bun run build`, then `bun run catalog`.',
  )
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
  if (body.includes('—')) {
    problems.push(`${route.path}: its document contains an em dash`)
  }
}

/** Every `.md` under `public`, which is the generator's whole output. */
const written = []
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const absolute = join(dir, entry)
    if (statSync(absolute).isDirectory()) {
      walk(absolute)
      continue
    }
    if (entry.endsWith('.md')) {
      written.push(relative(PUBLIC, absolute))
    }
  }
}
walk(PUBLIC)

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

/* Every address this site has ever served, and whether it still resolves.
 *
 * **A slug is the name of a file, so it is stable by default**: retitling a
 * post edits frontmatter and the address does not move. What can still move it
 * is a `git mv`, which is a deliberate act and is exactly what this checks.
 *
 * The record is `docs/insights/published.json`, written by this check the first
 * time it runs and appended to as pages appear. It is not a source of identity
 * (the file name is) and nothing reads it at runtime: it is a memory of what
 * has been published, which is the one thing a filesystem cannot tell you,
 * because a deleted file leaves nothing behind to notice.
 *
 * **A path that leaves has to have somewhere to go.** `next.config.ts` already
 * carries the machinery, permanent and wildcarded, from when `/design` became
 * `/helix`. A rename without a redirect is a link that was published and now
 * 404s, and `llms.txt` means a machine may hold it too. */
const PUBLISHED = join(ROOT, 'docs/insights/published.json')
const CONFIG = join(ROOT, 'site/ui/next.config.ts')

const published = existsSync(PUBLISHED)
  ? JSON.parse(readFileSync(PUBLISHED, 'utf8'))
  : { paths: [] }
const live = new Set(all.map((route) => route.path))

/* Sources rather than destinations: a redirect answers for the address that
   left, and the wildcard forms answer for everything beneath one. */
const redirected = [...readFileSync(CONFIG, 'utf8').matchAll(/source:\s*'([^']+)'/g)].map(
  (match) => match[1],
)
const answers = (path) =>
  redirected.some(
    (source) =>
      source === path ||
      (source.includes(':path*') && path.startsWith(source.replace('/:path*', '/'))),
  )

for (const path of published.paths) {
  if (!live.has(path) && !answers(path)) {
    problems.push(
      `${path}: was published and no longer resolves. Add a redirect in next.config.ts, or restore it`,
    )
  }
}

if (problems.length > 0) {
  console.error(`routes: ${problems.length} problem${problems.length === 1 ? '' : 's'}`)
  for (const problem of problems) {
    console.error(`  ${problem}`)
  }
  process.exit(1)
}

/* Recorded only when everything passed, so a failing run never writes a path
   into the record it is about to be judged against.
   
   **And never a page nobody has committed.** A draft sitting untracked in a
   content folder is a route while it is on disk, and this recorded one, so
   removing the draft looked exactly like deleting a published page and demanded
   a redirect for an address that was never served. Publishing is a thing git
   knows about and the filesystem does not. */
const untracked = new Set(
  spawnSync(
    'git',
    ['ls-files', '--others', '--exclude-standard', 'helix/docs/content', 'docs/insights/content'],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  )
    .stdout.split('\n')
    .filter(Boolean)
    .map((file) => file.replace(/^.*\//, '').replace(/\.mdx$/, '')),
)

if (problems.length === 0) {
  const committed = [...live].filter((path) => !untracked.has(path.split('/').at(-1) ?? ''))
  const merged = [...new Set([...published.paths, ...committed])].sort()
  if (merged.join() !== published.paths.join()) {
    writeFileSync(PUBLISHED, `${JSON.stringify({ paths: merged }, undefined, 2)}\n`)
  }
}

const kinds = all.reduce((counts, route) => {
  counts[route.kind] = (counts[route.kind] ?? 0) + 1
  return counts
}, {})

/* How many prose pages still serve the stub.
 *
 * Zero as of the commit that serialized the insight essays. The count stays
 * because the next page added is the one that will need it.
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
