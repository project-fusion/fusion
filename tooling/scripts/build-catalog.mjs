#!/usr/bin/env bun
/**
 * Collects the manifests and the example files into the catalog the site
 * imports, and writes the whole markdown surface as static files.
 *
 * **This exists to close a build warning, and the warning was right.** The site
 * used to reach out of its own project with `join(process.cwd(), '..', '..')`
 * to find the manifests and `helix/styled/src/<family>/.examples`. Turbopack
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
 * of the examples that can go stale. `fusion/site` runs this before `next build`
 * and before `next dev`, the same way it already runs the frame and the specs.
 *
 * **The cost is dev freshness**, which the reader this replaces was careful
 * about: it read the examples with `fs` precisely so that adding one showed up
 * without restarting. Editing an example now means re-running this, which
 * `bun run watch` does. That is the trade the warning asks for, and it is
 * worth naming rather than discovering.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { catalog } from '../../helix/docs/src/catalog.ts'
import { reference } from '../../helix/docs/src/reference.ts'
import { SOURCE } from './lib/workspace.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'fusion/site/content/catalog/catalog.generated.json')
const PUBLIC = join(ROOT, 'fusion/site/public')

/**
 * The manifests the reference is built from: the two published packages.
 *
 * **`helix/sandbox` is not among them, and the omission is the point.**
 * `@fusion.dev/helix-sandbox` is `private: true`, the editor and spec runner that build
 * this repository. Reading its manifest put `helix-sandbox-editor` in the
 * reference as a family of its own, called Editor, with no examples and a nav
 * entry pointing at a component nobody can install, and slipped
 * `helix-sandbox-specs` into the Sandbox family's element table beside six that
 * do ship.
 *
 * A reference documents what a reader can take. The line to draw is whether a
 * package publishes, and `check:pkg:publishable` already holds that flag, so this
 * reads a list of publishing packages rather than filtering tag names
 * downstream: a name filter would have to be updated every time the private
 * package grew an element, and would be silent when it was not.
 */
const MANIFESTS = ['helix/styled/custom-elements.json', 'helix/headless/custom-elements.json']

/**
 * Where the example files sit, one folder per family, in both tiers.
 *
 * **The headless half was never read.** This scanned `helix/styled/src` alone,
 * so every example reached the catalog as `styled` and the tier switch on a
 * reference page had nothing to switch to: a reader choosing Base got the
 * headless *tables* and the styled *example*, which is the one combination that
 * teaches something untrue. `catalog()` has handled both tiers since it was
 * written and its spec asserts a headless example at index one; it was simply
 * never given any.
 *
 * Order matters and styled is first. The canonical example is the family's
 * headline and `catalog()` takes the first it is handed, so a reader with no
 * preference set sees the tier almost everyone consumes.
 */
const EXAMPLES = [SOURCE.styled, SOURCE.headless].map((tier) => join(ROOT, tier))

const manifests = MANIFESTS.map((path) => {
  const file = join(ROOT, path)
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { modules: [] }
})

const examples = []
for (const source of EXAMPLES) {
  if (!existsSync(source)) {
    continue
  }
  for (const family of readdirSync(source, { withFileTypes: true })) {
    const dir = join(source, family.name, '.examples')
    if (!family.isDirectory() || !existsSync(dir)) {
      continue
    }
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.html')) {
        continue
      }
      const slug = file.replace(/\.html$/, '')
      const stylesheet = join(dir, `${slug}.css`)
      /* Read, never converted. `check:prose:examples-paired` is what guarantees the
         file is there, so an empty string here means that check is not running
         rather than that the example has no React form. */
      const authored = join(dir, `${slug}.tsx`)
      examples.push({
        css: existsSync(stylesheet) ? readFileSync(stylesheet, 'utf8').trim() : '',
        family: family.name,
        html: readFileSync(join(dir, file), 'utf8').trim(),
        slug,
        tsx: existsSync(authored) ? readFileSync(authored, 'utf8').trim() : '',
      })
    }
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

/* The prose documents, cleared by file rather than by folder.
 *
 * Those two directories hold nothing but generated markdown, so removing them
 * whole is safe. These do not: `public/` is the site's asset root and
 * `public/insights/` holds the pictures the cards use. Deleting either would
 * take real files with it.
 *
 * Clearing at all is not tidiness. Without it a deleted page leaves its `.md`
 * behind, still served, still linked from nothing, and `check:gen:routes` reports
 * it as a document no route points at. Found exactly that way. */
for (const dir of [PUBLIC, join(PUBLIC, 'insights')]) {
  if (!existsSync(dir)) {
    continue
  }
  for (const entry of readdirSync(dir)) {
    if (entry.endsWith('.md')) {
      rmSync(join(dir, entry))
    }
  }
}

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
const { routes } = await import('../../fusion/site/content/routes/routes.ts')
const { renderCopy, copyFor } = await import(
  '../../fusion/site/utils/copy-markdown/copy-markdown.ts'
)
const { findSitePage, sitePageSources } = await import('../../fusion/docs/insights/src/index.ts')
const { SERVICES } = await import('../../fusion/site/content/services/services.ts')
let prose = 0

for (const route of routes()) {
  if (route.kind === 'component' || route.kind === 'doc') {
    continue
  }
  const file = route.path === '/' ? 'index.md' : `${route.path.slice(1)}.md`
  mkdirSync(dirname(join(PUBLIC, file)), { recursive: true })

  /* A page whose prose is MDX serves the file. Nothing is rendered, nothing is
     serialized, and there is no second copy to keep in step: the document a
     reader gets is the document the writer wrote. */
  const slug = route.path.split('/').at(-1) ?? ''
  const written = findSitePage(route.path) ?? (sitePageSources[slug] ? { slug } : undefined)
  if (written) {
    /* The file, and then whatever registry the page says belongs in its
       document. `/services` is the only one: its three offers are a price list
       several pages read, so they stay in `services.ts` and the document is the
       prose plus a table of them. Not a third way of producing markdown, but
       the two that already exist, one after the other. */
    const appended =
      written.appends === 'services'
        ? [
            '',
            '## What we take on',
            '',
            '| Offer | Duration | Price | What it leaves you |',
            '| --- | --- | --- | --- |',
            ...SERVICES.map(
              (service) =>
                `| ${service.name} | ${service.duration} | ${service.price} | ${service.outcome} |`,
            ),
            '',
          ].join('\n')
        : ''
    writeFileSync(join(PUBLIC, file), `${sitePageSources[written.slug] ?? ''}${appended}`)
    prose += 1
    continue
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
