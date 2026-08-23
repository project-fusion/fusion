#!/usr/bin/env bun
/**
 * Collects the manifests and the example files into one catalog the site
 * imports rather than reads.
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
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { catalog } from '../../helix/docs/src/catalog.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'site/ui/lib/catalog.generated.json')

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

const elements = families.reduce((total, family) => total + family.elements.length, 0)
console.log(
  `catalog: ${families.length} families, ${elements} elements, ${examples.length} examples`,
)
