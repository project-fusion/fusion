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
  /**
   * Where the platform feature this is built on is specified, if it is one.
   *
   * Optional here and required on `PropertyDoc`, because a property always has
   * the field even when it is empty and a slot or a part is built on nothing.
   * It is on the member rather than only on the property so the Read table can
   * carry a mark: `form` and `labels` are read-only and are the two members in
   * the library that most need one.
   */
  references?: { label: string; url: string }[]
  type: string
}

/**
 * A property, which carries a default where an attribute does not.
 *
 * Separate from `ApiMember` rather than an optional field on it, because a slot
 * and a CSS part have no default and a column of empty cells is a table saying
 * the data is missing rather than that the concept does not apply.
 */
export interface PropertyDoc {
  default: string
  description: string
  name: string
  /** Whether it is a getter, so a reader is not invited to set it. */
  readonly: boolean
  /** Where the platform feature this is built on is specified. */
  references: { label: string; url: string }[]
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
  methods: ApiMember[]
  /** Role within the family. `Root` for its primary element. */
  part: string
  properties: PropertyDoc[]
  slots: ApiMember[]
  summary: string
  tagName: string
  tier: 'headless' | 'styled'
}

export interface Example {
  /** The example's own stylesheet, or empty where it needs none. */
  css: string
  /** One line from the example's `@summary` comment, or empty where unwritten. */
  description: string
  html: string
  label: string
  slug: string
  /**
   * Which tier the example shows, read from what it renders.
   *
   * Off the markup rather than off the filename, the same test `check:tokens`
   * uses to know a base example's stylesheet may write raw values: an example
   * is a base one when it renders a `helix-base-` element. A `base.html`
   * convention would be a second place to remember, and this is the fact.
   */
  tier: 'headless' | 'styled'
}

export interface Family {
  aliases: string[]
  /** What the component is for, from `@category`. The gallery groups on it. */
  category: string
  documentation: string
  elements: Element[]
  examples: Example[]
  label: string
  since: string
  slug: string
  /** The family's source directory, relative to the repository root. */
  source: string
  status: string
  summary: string
}

interface RawNamed {
  default?: string
  description?: string
  kind?: string
  name?: string
  parameters?: { name?: string; type?: { text?: string } }[]
  helix?: { references?: { label: string; url: string }[] }
  privacy?: string
  reactProp?: string
  readonly?: boolean
  return?: { type?: { text?: string } }
  static?: boolean
  type?: { text?: string }
}

interface RawDeclaration {
  attributes?: RawNamed[]
  cssParts?: RawNamed[]
  cssProperties?: RawNamed[]
  description?: string
  events?: RawNamed[]
  helix?: {
    aliases?: string[]
    category?: string
    documentation?: string
    examples?: { description?: string; slug?: string }[]
    part?: string
    source?: string
    since?: string
    status?: string
  }
  members?: RawNamed[]
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

/**
 * A method the platform calls, rather than one a consumer does.
 *
 * `formResetCallback` and its siblings are public because the platform has to
 * reach them, and they are 55 of the 152 public methods in the library:
 * documenting them puts a reader's own `focus()` and `show()` in a minority on
 * their own component's page. Matching the suffix rather than listing the names
 * covers the custom-element lifecycle and the form-associated one together, and
 * keeps covering them when the platform adds a third.
 */
const PLATFORM_CALLBACK = /Callback$/

/** Public only. Private and protected are the component's business. */
const isPublic = (row: RawNamed): boolean => row.privacy === undefined || row.privacy === 'public'

/**
 * Properties, with the default each one falls back to.
 *
 * Fields rather than attributes, which is the change this page needed: an
 * attribute carries no default in the manifest, so the old table could say a
 * component took `appearance` and never what it did when you left it alone.
 */
const properties = (rows: RawNamed[] | undefined): PropertyDoc[] =>
  (rows ?? [])
    /* Instance fields only. A static is the class's, not an element's, and the
       two that reach here are the platform's rather than ours:
       `shadowRootOptions` is Lit's and `formAssociated` is the flag the browser
       reads to decide a control participates in a form. Thirty-five rows across
       the library, none of them anything a consumer sets on a tag. */
    /* `@internal` needs nothing here: the analyzer drops a member carrying it
       before the manifest is written, which was worth finding out before
       building a plugin and a filter to do the same thing twice. */
    .filter((row) => row.kind === 'field' && isPublic(row) && row.static !== true)
    .map((row) => ({
      /* `undefined` is not a default, it is the absence of one, and the
         analyzer records the initialiser verbatim. Printed, the column reads
         "undefined" for every optional property, which is a table telling a
         reader a word rather than a value. Blank says the same thing and says
         it quietly. */
      default: row.default === 'undefined' ? '' : (row.default ?? ''),
      description: row.description ?? '',
      name: row.name ?? '',
      /* A getter reads as a field in the manifest and assigning to one throws,
         which is the same trap the React generator already skips these for. In
         a table they are indistinguishable from a property a reader may set:
         `AvatarGroup.avatars` sat beside its slot looking like a second way to
         pass the same thing, and there is no second way. A hundred and
         fifty-five of them. */
      readonly: row.readonly === true,
      /* From `@reference` on the property. A row for `command` can say it is
         the Invoker Commands API and point at where that is specified, which a
         description sentence can gesture at and cannot carry. */
      references: row.helix?.references ?? [],
      type: withoutUndefined(row.type?.text ?? ''),
    }))

/**
 * Methods, typed by the signature a caller writes rather than by a return type
 * alone. `(next: string) => boolean` says what to pass; `boolean` does not.
 */
const methods = (rows: RawNamed[] | undefined): ApiMember[] =>
  (rows ?? [])
    .filter(
      (row) => row.kind === 'method' && isPublic(row) && !PLATFORM_CALLBACK.test(row.name ?? ''),
    )
    .map((row) => {
      const args = (row.parameters ?? [])
        .map((arg) => `${arg.name ?? ''}: ${arg.type?.text ?? 'unknown'}`)
        .join(', ')
      return {
        description: row.description ?? '',
        name: row.name ?? '',
        type: `(${args}) => ${row.return?.type?.text ?? 'void'}`,
      }
    })

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

/**
 * Examples live beside the styled component, keyed by family folder.
 *
 * An example is up to two files, `<slug>.html` and an optional `<slug>.css`.
 * The HTML is the list: a stylesheet on its own is not an example, and
 * `check:examples` fails on one whose markup is missing rather than showing a
 * sandbox with a stylesheet and nothing to style.
 *
 * The pair is what the sandbox already shows, `index.html` beside `styles.css`,
 * so the second file is the one the reader is looking at rather than a build
 * step. It is also what replaced the `style` attributes these examples used to
 * carry: an inline style is unreachable from a stylesheet, cannot express a
 * hover or a media query, and teaches a reader to write the one thing the
 * library exists to avoid.
 */
const examplesOf = (slug: string, declared: RawDeclaration['helix']): Example[] => {
  /* The prose comes from the manifest, the markup from disk.
   *
   * The plugin reads the same folder and records what each example is; the
   * payload stays on disk because it is large and the manifest is parsed by
   * everything. Keyed by slug so the two halves cannot drift into each other's
   * order. */
  const described = new Map(
    (declared?.examples ?? []).map((entry) => [entry.slug ?? '', entry.description ?? '']),
  )
  const dir = join(REPO, 'helix/web/src', slug, '.examples')
  if (!existsSync(dir)) {
    return []
  }
  return readdirSync(dir)
    .filter((file) => file.endsWith('.html'))
    .sort((a, b) => (a === 'default.html' ? -1 : b === 'default.html' ? 1 : a.localeCompare(b)))
    .map((file) => {
      const slugged = file.replace(/\.html$/, '')
      const stylesheet = join(dir, `${slugged}.css`)
      const html = readFileSync(join(dir, file), 'utf8').trim()
      /* Which styled example this one is the headless twin of. `base` is the
         twin of `default`, and `<name>.base` of `<name>`. */
      const mirrored = slugged === 'base' ? 'default' : slugged.replace(/\.base$/, '')
      return {
        css: existsSync(stylesheet) ? readFileSync(stylesheet, 'utf8').trim() : '',
        description: described.get(slugged) ?? '',
        html,
        /* The canonical example reads as "Preview": it is the component's
           headline, not a named variant sitting beside the others.

           **A base example takes the name of the one it mirrors**, so the two
           tiers show the same list rather than a list that changes its labels
           when a reader changes a preference. `base.html` is the headless
           twin of `default.html` and reads "Preview" like it; a later
           `cards.base.html` would read "Cards". Only one of a pair is ever on
           screen, the tier deciding which, so there is nothing to disambiguate
           and a differing name would be the only thing suggesting they are
           different examples. */
        label: mirrored === 'default' ? 'Preview' : startCase(mirrored),
        slug: slugged,
        tier: (html.includes('<helix-base-') ? 'headless' : 'styled') as 'headless' | 'styled',
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
        category: root.helix?.category ?? '',
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
            methods: methods(entry.members),
            /* From the manifest, not by stripping the family name off the
               label. The composition plugin already derives this from the
               folder, and "Avatar Group" minus "Avatar" is a string operation
               that happens to work until a part's name contains the family's. */
            part: entry.helix?.part ?? '',
            properties: properties(entry.members),
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
        examples: examplesOf(slug, root.helix),
        label: startCase(slug),
        since: root.helix?.since ?? '',
        slug,
        source: root.helix?.source ?? '',
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
