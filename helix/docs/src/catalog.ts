/**
 * The component catalog: manifests and example markup, as one shape a reader
 * can render.
 *
 * **Pure, and it lives here for the same reason `reference()` does.** This is
 * Helix knowledge, and it used to sit in a marketing app: once both an HTML
 * page and a `.md` route need it, leaving it there means one of them imports
 * across a domain boundary to get at it. Reading the manifests and the
 * `.examples/*.html` files off disk is the caller's job, because a content
 * package that touched the filesystem would trace itself into every consumer's
 * server bundle.
 *
 * Two sources and no third: the manifests describe the API, and the example
 * files hold the markup. Nothing about a component is written down here, which
 * is what keeps a site from drifting away from the library it documents.
 */
import type { HelixDeclaration, HelixManifest, HelixMember } from '@helix-io/cem'
import { displayName, startCase, tierOf } from './naming.js'
import { place } from './reference.js'

/* The headless twin's slug, and the suffix every other one carries. Named
   because the sort and the label both ask, and a tier that has been renamed
   once can be renamed again. */
/**
 * The canonical example's slug, named once because three places knew it.
 *
 * The tier pairing, the first-position pin and the label all had it written
 * out, and renaming `default` to `preview` broke each of them separately: the
 * pin because the old name sorted early by accident, the pairing because a twin
 * mirrors this one, the label because it reads from the name. A fact three
 * places hold is a fact that drifts, which the comment on the sort below
 * already records happening once when the tier was called `base`.
 */
const CANONICAL = 'preview'

const HEADLESS = 'headless'
const HEADLESS_SUFFIX = /\.headless$/

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
   * uses to know a headless example's stylesheet may write raw values: an
   * example is a headless one when it renders a `helix-headless-` element.
   * When this was written the file was called `headless.html` and the name
   * could have answered, which is why the comment argued against relying on
   * it. Both tiers call theirs `preview.html` now, the package directory
   * carrying the tier, so the name cannot answer and this is the only fact
   * available. The word `base` was the tier's old name and is gone with it.
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

/**
 * One example as it sits on disk, before this decides what to call it.
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
export interface ExampleSource {
  css: string
  /** Family folder the example was found in. */
  family: string
  html: string
  /** File name without its extension: `default`, `base`, `cards.base`. */
  slug: string
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
const isPublic = (row: HelixMember): boolean =>
  row.privacy === undefined || row.privacy === 'public'

/**
 * Properties, with the default each one falls back to.
 *
 * Fields rather than attributes, which is the change this page needed: an
 * attribute carries no default in the manifest, so the old table could say a
 * component took `appearance` and never what it did when you left it alone.
 */
const properties = (rows: HelixMember[] | undefined): PropertyDoc[] =>
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
const methods = (rows: HelixMember[] | undefined): ApiMember[] =>
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

const members = (
  rows: { description?: string; name?: string; type?: { text?: string } }[] | undefined,
): ApiMember[] =>
  (rows ?? []).map((row) => ({
    description: row.description ?? '',
    name: row.name ?? '',
    type: withoutUndefined(row.type?.text ?? ''),
  }))

/**
 * The examples of one family, named and ordered.
 *
 * The prose comes from the manifest and the markup from the caller. The
 * composition plugin reads the same folder and records what each example is;
 * the payload stays on disk because it is large and the manifest is parsed by
 * everything. Keyed by slug so the two halves cannot drift into each other's
 * order.
 */
const examplesOf = (
  slug: string,
  declared: HelixDeclaration['helix'],
  sources: ExampleSource[],
): Example[] => {
  const described = new Map(
    (declared?.examples ?? []).map((entry) => [entry.slug ?? '', entry.description ?? '']),
  )
  return (
    sources
      .filter((source) => source.family === slug)
      /* `default` first, then alphabetical, with each headless twin directly
         behind the example it mirrors.

         By slug, not by filename. This used to compare `compact-counts.html`
         against `compact.html`, where `-` precedes `.` and so the longer name
         sorted first, which is a list ordered by a file extension no reader
         ever sees. The extension is not part of an example's identity:
         `compact` and `compact-counts` are what the tabs say, and `compact`
         comes first.

         **Pairing on the mirrored name, because sorting on the raw slug only
         ever worked by luck.** The twin used to be called `base`, and `base`
         sorts before every family's other examples, so it landed under
         `default` and looked deliberate. Renaming the tier to `headless` moved
         it to the end of the list and broke two specs that had been reading
         that accident as the rule. What the pairing is for is that the tabs
         show the same list on both tiers, which is what `mirrored` below is
         computing anyway: sort on it and the position is a consequence of the
         relationship rather than of where the tier's name falls in the
         alphabet. */
      .sort((a, b) => {
        const pairOf = (slug: string) =>
          slug === HEADLESS ? CANONICAL : slug.replace(HEADLESS_SUFFIX, '')
        const twin = (slug: string) => (slug === HEADLESS || HEADLESS_SUFFIX.test(slug) ? 1 : 0)
        const left = pairOf(a.slug)
        const right = pairOf(b.slug)
        if (left !== right) {
          return left === CANONICAL ? -1 : right === CANONICAL ? 1 : left.localeCompare(right)
        }
        return twin(a.slug) - twin(b.slug)
      })
      .map((source) => {
        /* Which styled example this one is the headless twin of. `headless` is
         the twin of `preview`, and `<name>.headless` of `<name>`. Both names
         have moved: the tier was `base` and the canonical example was
         `default`, and this line is the one place that has to know the pairing
         because a headless example is not named for itself. */
        const mirrored =
          source.slug === HEADLESS ? CANONICAL : source.slug.replace(HEADLESS_SUFFIX, '')
        return {
          css: source.css,
          description: described.get(source.slug) ?? '',
          html: source.html,
          /* **The label is the file's name, with no special case left.** The
           canonical example was called `default` and read as "Preview", a
           translation that existed only because the name did not say what the
           file was: it is the component's headline, not a named variant sitting
           beside the others. Renamed, `startCase` gives "Preview" on its own.

           **A headless example takes the name of the one it mirrors**, so the two
           tiers show the same list rather than a list that changes its labels
           when a reader changes a preference. Only one of a pair is ever on
           screen, the tier deciding which, so a differing name would be the only
           thing suggesting they are different examples. */
          label: startCase(mirrored),
          slug: source.slug,
          tier: (source.html.includes('<helix-headless-') ? 'headless' : 'styled') as
            | 'headless'
            | 'styled',
        }
      })
  )
}

/**
 * Every family across the given manifests, alphabetical, each with its elements
 * and examples.
 *
 * The family a declaration belongs to comes from where its file is rather than
 * from its tag name, which is the same reasoning `place()` carries for the
 * reference: `helix-button-group` is one family and `helix-tabs-tab` is a part
 * of another, and nothing in the name says which.
 */
export const catalog = (manifests: HelixManifest[], examples: ExampleSource[] = []): Family[] => {
  const byFamily = new Map<string, HelixDeclaration[]>()
  for (const manifest of manifests) {
    for (const module of manifest.modules ?? []) {
      for (const declaration of module.declarations ?? []) {
        if (!declaration.tagName) {
          continue
        }
        const { family } = place(module.path)
        if (!family) {
          continue
        }
        byFamily.set(family, [...(byFamily.get(family) ?? []), declaration])
      }
    }
  }

  return [...byFamily.entries()]
    .map(([slug, entries]) => {
      /* The family's own description comes from its styled root: the element
         whose tag is the family name, rather than a part of it. */
      const root =
        entries.find((entry) => entry.tagName === `helix-${slug}`) ??
        (entries[0] as HelixDeclaration)

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
          /* Styled first, then headless. Alphabetical order would put the
             headless tier on top, which is the one most readers never reach
             for. */
          .sort(
            (a, b) =>
              Number(a.tier === 'headless') - Number(b.tier === 'headless') ||
              a.tagName.localeCompare(b.tagName),
          ),
        examples: examplesOf(slug, root.helix, examples),
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

/** The family of a given slug, from an already-built catalog. */
export const findInCatalog = (families: Family[], slug: string): Family | undefined =>
  families.find((family) => family.slug === slug)
