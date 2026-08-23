#!/usr/bin/env bun
/**
 * Collects the manifests and the example files into the catalog the site
 * imports, and writes the whole markdown surface as static files.
 *
 * **This exists to close a build warning, and the warning was right.** The site
 * used to reach out of its own project with `join(process.cwd(), '..', '..')`
 * to find the manifests and `helix/web/src/<family>/.examples`. Turbopack
 * cannot statically scope a path like that, so it traced the whole repository
 * into the server bundle, public folder and all, and said so on every build:
 * "this is usually unintentional and leads to all source files being deployed
 * as part of the server code".
 *
 * Its own advice is to scope the path to a subfolder or to read only in
 * development. This does neither by doing better than both: the app imports a
 * file that is already inside it, so nothing is read at runtime at all and the
 * shaping happens once here instead of once per build of the site.
 *
 * **Generated rather than committed.** It is 2.4 MB derived entirely from files
 * that are already in the repository, so committing it would be a second copy
 * of the examples that can go stale. `site/ui` runs this before `next build`
 * and before `next dev`, the same way it already runs the frame and the specs.
 *
 * **The cost is dev freshness**, which the reader this replaces was careful
 * about: it read the examples with `fs` precisely so that adding one showed up
 * without restarting. Editing an example now means re-running this, which
 * `bun run dev:watch` does. That is the trade the warning asks for, and it is
 * worth naming rather than discovering.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { catalog } from '../../helix/docs/src/catalog.ts'
import { reference } from '../../helix/docs/src/reference.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'site/ui/lib/catalog.generated.json')
const PUBLIC = join(ROOT, 'site/ui/public')

const MANIFESTS = [
  'helix/web/custom-elements.json',
  'helix/headless/custom-elements.json',
  'helix/sandbox/custom-elements.json',
]

/** Where the example files sit, one folder per family. */
const EXAMPLES = join(ROOT, 'helix/web/src')

const manifests = MANIFESTS.map((path) => {
  const file = join(ROOT, path)
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { modules: [] }
})

const examples = []
for (const family of readdirSync(EXAMPLES, { withFileTypes: true })) {
  const dir = join(EXAMPLES, family.name, '.examples')
  if (!family.isDirectory() || !existsSync(dir)) {
    continue
  }
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.html')) {
      continue
    }
    const slug = file.replace(/\.html$/, '')
    const stylesheet = join(dir, `${slug}.css`)
    examples.push({
      css: existsSync(stylesheet) ? readFileSync(stylesheet, 'utf8').trim() : '',
      family: family.name,
      html: readFileSync(join(dir, file), 'utf8').trim(),
      slug,
    })
  }
}

const families = catalog(manifests, examples)
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, `${JSON.stringify(families)}\n`)

/* Every page's sibling `.md`, as a file in the build output.
 *
 * **Files rather than a route handler**, which is what `13-site-architecture.md`
 * means by layer 0: static text on our own domain, generated from the
 * repository. A handler would put the same bytes behind a running server, and
 * the point of this surface is that it survives one not running.
 *
 * `12-ai-native-web.md` specifies a catch-all route with
 * `generateStaticParams`, and that was built and did work. It is not what
 * shipped, for two reasons found by building it. It has to read the MDX and the
 * per-family markdown off disk at request time, which is the filesystem access
 * that took this app's whole repository into the server bundle and was just
 * removed; and a root-level catch-all swallows every unmatched URL unless it
 * calls `notFound()` for anything without the extension, which is a hazard to
 * remember rather than one to remove. Files have neither problem.
 *
 * The `.json` beside each family is the catalog entry verbatim rather than a
 * second shape of it. It is what the page renders from, so anything else would
 * be a third source for one component's API. */
const COMPONENTS = join(PUBLIC, 'helix/components')
const DOCS = join(PUBLIC, 'helix/docs')
rmSync(COMPONENTS, { force: true, recursive: true })
rmSync(DOCS, { force: true, recursive: true })
mkdirSync(COMPONENTS, { recursive: true })
mkdirSync(DOCS, { recursive: true })

const styled = manifests[0] ?? { modules: [] }
for (const family of families) {
  writeFileSync(join(COMPONENTS, `${family.slug}.json`), `${JSON.stringify(family, null, 2)}\n`)

  /* The lede is what the manifest knows and the reference does not print:
     where the family is in the library, what it answers to, how stable it is,
     and where its source lives. Deliberately not the summary, which the root
     element prints two lines further down and would otherwise say twice. */
  const facts = [
    ['Category', family.category],
    ['Status', family.status],
    ['Since', family.since],
    ['Aliases', family.aliases.join(', ')],
    ['Source', family.source],
  ].filter(([, value]) => value)

  writeFileSync(
    join(COMPONENTS, `${family.slug}.md`),
    reference(styled, {
      examples: { [family.slug]: family.examples },
      families: [family.slug],
      /* No timestamp. A generated file carrying the time it was written differs
         from itself on every run, which turns a `--check` into noise and a diff
         into a lie about what changed. The source is the provenance that
         matters, and git holds the rest. */
      frontmatter: [
        ['title', family.label],
        ['description', family.summary || `The ${family.label} component family.`],
        ['path', `/helix/components/${family.slug}`],
        ['source', `${MANIFESTS[0]}, and ${family.source}`],
      ],
      lede: facts.length > 0 ? [...facts.map(([key, value]) => `- **${key}:** ${value}`), ''] : [],
      title: family.label,
    }),
  )
}

/* The documentation pages, as the MDX the package ships.
 *
 * Served as the source rather than as a transform of it. All of these are
 * markdown with frontmatter and no live JSX, so the source is what a reader
 * wants and a conversion step would be a second thing that can be wrong. */
const { pages: docPages } = await import('../../helix/docs/src/registry.ts')
for (const page of docPages) {
  const source = readFileSync(join(ROOT, 'helix/docs/content', `${page.slug}.mdx`), 'utf8')
  writeFileSync(join(DOCS, `${page.slug}.md`), source)
}

/* The prose pages.
 *
 * A page whose copy lives in a typed module renders that module as markdown,
 * from the same object the page renders as Helix markup. Neither is the source
 * and neither can drift: there is one set of words.
 *
 * A page that has not moved its copy yet gets the title, the summary and a
 * pointer, which is honest and close to useless. That is the remaining half of
 * this work rather than a design: an `.md` that invented the prose would be the
 * stale parallel site the whole arrangement exists to prevent. */
const { routes } = await import('../../site/ui/lib/routes.ts')
const { renderCopy, copyFor } = await import('../../site/ui/lib/copy-markdown.ts')
const { insightMarkdown } = await import('../../site/ui/lib/insight-markdown.ts')
const { INSIGHTS } = await import('../../site/ui/lib/insights/index.ts')
let prose = 0

for (const route of routes()) {
  if (route.kind === 'component' || route.kind === 'doc') {
    continue
  }
  const file = route.path === '/' ? 'index.md' : `${route.path.slice(1)}.md`
  mkdirSync(dirname(join(PUBLIC, file)), { recursive: true })

  /* An insight is an essay, so its document is the essay rather than a summary
     of one. The body is a React component and this is a serialization of what
     it actually renders, which is why there is no second copy to keep in step:
     the page and the `.md` come out of one render path. */
  if (route.kind === 'insight') {
    const post = INSIGHTS.find((entry) => `/insights/${entry.slug}` === route.path)
    const essay = post && insightMarkdown(post.slug)
    if (post && essay) {
      writeFileSync(
        join(PUBLIC, file),
        [
          '---',
          `title: ${post.title}`,
          `description: ${post.summary}`,
          `path: ${route.path}`,
          `topic: ${post.topic}`,
          `kind: ${post.kind}`,
          'source: the essay component this page also renders',
          '---',
          '',
          `# ${post.title}`,
          '',
          post.summary,
          '',
          essay,
          '',
        ].join('\n'),
      )
      prose += 1
      continue
    }
  }

  const copy = copyFor(route.path)
  writeFileSync(
    join(PUBLIC, file),
    copy
      ? renderCopy(route, copy)
      : [
          '---',
          `title: ${route.title}`,
          `description: ${route.description}`,
          `path: ${route.path}`,
          '---',
          '',
          `# ${route.title}`,
          '',
          route.description,
          '',
          'This page renders from a typed module rather than from markdown.',
          `Read it at ${route.path}.`,
          '',
        ].join('\n'),
  )
  prose += 1
}

const elements = families.reduce((total, family) => total + family.elements.length, 0)
console.log(
  `catalog: ${families.length} families, ${elements} elements, ${examples.length} examples, ` +
    `${families.length * 2 + docPages.length + prose} files in public`,
)
