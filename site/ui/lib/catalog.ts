import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { catalog, type ExampleSource, type Family, findInCatalog } from '@helix-io/docs'

/**
 * The component catalog, read from the manifests and from disk.
 *
 * **Reading is all that is left here.** The shaping moved to
 * `@helix-io/docs`, because a manifest-to-catalog reader is Helix knowledge
 * that was living in a marketing app, and once both this page and the `.md`
 * route need it, leaving it here means one of them imports across a domain
 * boundary to get at it. What a site owns is where the files are.
 *
 * Server-only, and evaluated during the build, so every page is static.
 */
export type {
  ApiMember,
  Element,
  EventDoc,
  Example,
  Family,
  PropertyDoc,
} from '@helix-io/docs'

const REPO = join(process.cwd(), '..', '..')

const MANIFESTS = [
  'helix/web/custom-elements.json',
  'helix/headless/custom-elements.json',
  'helix/sandbox/custom-elements.json',
]

/** Where the example files sit, one folder per family. */
const EXAMPLES = 'helix/web/src'

const readManifest = (path: string) => {
  const file = join(REPO, path)
  if (!existsSync(file)) {
    return { modules: [] }
  }
  return JSON.parse(readFileSync(file, 'utf8'))
}

/** Every example file on disk, as the payload the catalog names and orders. */
const readExamples = (): ExampleSource[] => {
  const root = join(REPO, EXAMPLES)
  if (!existsSync(root)) {
    return []
  }
  const found: ExampleSource[] = []
  for (const family of readdirSync(root, { withFileTypes: true })) {
    const dir = join(root, family.name, '.examples')
    if (!family.isDirectory() || !existsSync(dir)) {
      continue
    }
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.html')) {
        continue
      }
      const slug = file.replace(/\.html$/, '')
      const stylesheet = join(dir, `${slug}.css`)
      found.push({
        css: existsSync(stylesheet) ? readFileSync(stylesheet, 'utf8').trim() : '',
        family: family.name,
        html: readFileSync(join(dir, file), 'utf8').trim(),
        slug,
      })
    }
  }
  return found
}

let cached: Family[] | undefined

/**
 * Every family, read fresh in development.
 *
 * `.examples/*.html` and the manifests are read with `fs`, not imported, so
 * nothing puts them in the module graph and nothing invalidates a value
 * computed once at import time. Adding an example then showed nothing until the
 * dev server was restarted.
 *
 * Production still computes this once. Every page is static there, so the
 * sources cannot change under a running server, and the cache is what keeps the
 * manifests from being parsed for each page of the build.
 */
export const getFamilies = (): Family[] => {
  if (cached && process.env.NODE_ENV === 'production') {
    return cached
  }
  cached = catalog(MANIFESTS.map(readManifest), readExamples())
  return cached
}

export const findFamily = (slug: string): Family | undefined => findInCatalog(getFamilies(), slug)
