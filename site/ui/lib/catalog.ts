import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { displayName, startCase, tierOf } from './naming'

/**
 * The component catalog, read from the manifests and from disk.
 *
 * Server-only, and evaluated during the build, so every page is static. Two
 * sources and no third: the manifests describe the API, and `.examples/*.html`
 * files beside each component hold the examples. Nothing about a component is
 * written down in this app, which is what keeps the site from drifting away
 * from the library it documents.
 */

const REPO = join(process.cwd(), '..', '..')

export interface ApiMember {
  description: string
  name: string
  type: string
}

export interface EventDoc {
  description: string
  name: string
  reactProp: string
  type: string
}

export interface Element {
  attributes: ApiMember[]
  cssParts: ApiMember[]
  cssProperties: ApiMember[]
  description: string
  events: EventDoc[]
  label: string
  slots: ApiMember[]
  summary: string
  tagName: string
  tier: 'headless' | 'styled'
}

export interface Example {
  html: string
  label: string
  slug: string
}

export interface Family {
  aliases: string[]
  documentation: string
  elements: Element[]
  examples: Example[]
  label: string
  since: string
  slug: string
  status: string
  summary: string
}

interface RawNamed {
  description?: string
  name?: string
  reactProp?: string
  type?: { text?: string }
}

interface RawDeclaration {
  attributes?: RawNamed[]
  cssParts?: RawNamed[]
  cssProperties?: RawNamed[]
  description?: string
  events?: RawNamed[]
  helix?: { aliases?: string[]; documentation?: string; since?: string; status?: string }
  modulePath?: string
  slots?: RawNamed[]
  summary?: string
  tagName?: string
}

/**
 * Drops `undefined` from a union.
 *
 * Every reflected property is optional, because the default state of a Helix
 * component is the absent attribute: a reflected default would put an attribute
 * on the host that a React consumer's server markup never had. That makes the
 * declared type `'primary' | 'neutral' | undefined`, and the `undefined` is an
 * implementation detail of how the default is expressed rather than a value
 * anyone sets. The table reads better without it, and the attribute being
 * omissible is already what "attribute" means.
 */
const withoutUndefined = (text: string): string =>
  text
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part !== 'undefined')
    .join(' | ')

const members = (rows: RawNamed[] | undefined): ApiMember[] =>
  (rows ?? []).map((row) => ({
    description: row.description ?? '',
    name: row.name ?? '',
    type: withoutUndefined(row.type?.text ?? ''),
  }))

const readManifest = (path: string): RawDeclaration[] => {
  const file = join(REPO, path)
  if (!existsSync(file)) {
    return []
  }
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as {
    modules: Array<{ declarations?: RawDeclaration[] }>
  }
  return parsed.modules.flatMap((mod) => mod.declarations ?? []).filter((entry) => entry.tagName)
}

const MANIFESTS = [
  'helix/web/custom-elements.json',
  'helix/headless/custom-elements.json',
  'helix/sandbox/custom-elements.json',
]

/** Examples live beside the styled component, keyed by family folder. */
const examplesOf = (slug: string): Example[] => {
  const dir = join(REPO, 'helix/web/src', slug, '.examples')
  if (!existsSync(dir)) {
    return []
  }
  return readdirSync(dir)
    .filter((file) => file.endsWith('.html'))
    .sort((a, b) => (a === 'default.html' ? -1 : b === 'default.html' ? 1 : a.localeCompare(b)))
    .map((file) => {
      const slugged = file.replace(/\.html$/, '')
      return {
        html: readFileSync(join(dir, file), 'utf8').trim(),
        // The canonical example reads as "Preview": it is the component's
        // headline, not a named variant sitting beside the others.
        label: slugged === 'default' ? 'Preview' : startCase(slugged),
        slug: slugged,
      }
    })
}

/** Every family, alphabetical, each with its elements and examples. */
const build = (): Family[] => {
  const byFamily = new Map<string, RawDeclaration[]>()
  for (const declaration of MANIFESTS.flatMap(readManifest)) {
    const family = /^src\/([^/]+)\//.exec(declaration.modulePath ?? '')?.[1]
    if (!family) {
      continue
    }
    byFamily.set(family, [...(byFamily.get(family) ?? []), declaration])
  }

  return [...byFamily.entries()]
    .map(([slug, entries]) => {
      // The family's own description comes from its styled root: the element
      // whose tag is the family name, rather than a part of it.
      const root =
        entries.find((entry) => entry.tagName === `helix-${slug}`) ?? (entries[0] as RawDeclaration)

      return {
        aliases: root.helix?.aliases ?? [],
        documentation: root.helix?.documentation ?? '',
        elements: entries
          .map((entry) => ({
            attributes: members(entry.attributes),
            cssParts: members(entry.cssParts),
            cssProperties: members(entry.cssProperties),
            description: entry.description ?? '',
            events: (entry.events ?? []).map((event) => ({
              description: event.description ?? '',
              name: event.name ?? '',
              reactProp: event.reactProp ?? `on${event.name ?? ''}`,
              type: event.type?.text ?? '',
            })),
            label: displayName(entry.tagName as string),
            slots: members(entry.slots),
            summary: entry.summary ?? '',
            tagName: entry.tagName as string,
            tier: tierOf(entry.tagName as string),
          }))
          // Styled first, then headless. Alphabetical order would put the
          // headless tier on top, which is the one most readers never reach for.
          .sort(
            (a, b) =>
              Number(a.tier === 'headless') - Number(b.tier === 'headless') ||
              a.tagName.localeCompare(b.tagName),
          ),
        examples: examplesOf(slug),
        label: startCase(slug),
        since: root.helix?.since ?? '',
        slug,
        status: root.helix?.status ?? '',
        summary: root.summary ?? '',
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
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
  cached = build()
  return cached
}

export const findFamily = (slug: string): Family | undefined =>
  getFamilies().find((family) => family.slug === slug)
