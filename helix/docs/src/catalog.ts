/**
 * The component catalog: manifests and example markup, as one shape a reader
 * can render.
 *
 * **Pure, and it lives here for the same reason `reference()` does.** Reading
 * the manifests and the `.examples/*.html` files off disk is the caller's job,
 * because a content package that touched the filesystem would trace itself
 * into every consumer's server bundle.
 *
 * Two sources and no third: the manifests describe the API, and the example
 * files hold the markup. Nothing about a component is written down here, which
 * is what keeps a site from drifting away from the library it documents.
 */
import type { HelixDeclaration, HelixManifest, HelixMember } from '@fusion.dev/helix-cem'
import { displayName, startCase, tierOf } from './naming.js'
import { place } from './reference.js'

/**
 * The canonical example's slug, named once because three places ask for it.
 *
 * The tier pairing, the first-position pin and the label all read it. A fact
 * three places hold is a fact that drifts.
 */
const CANONICAL = 'preview'

/* The headless twin's slug, and the suffix every other one carries. */
const HEADLESS = 'headless'

/** The package each tier publishes, which every import line starts with. */
const PACKAGE = { headless: '@fusion.dev/helix-headless', styled: '@fusion.dev/helix' } as const
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
  cssStates: ApiMember[]
  description: string
  /**
   * The entry that registers the element, under the tier's package: the
   * family's own, such as `filter-input`, or one of its own where the family's
   * leaves it out, such as `filter-input/menu`.
   */
  entry: string
  events: EventDoc[]
  label: string
  methods: ApiMember[]
  /** Role within the family. `Root` for its primary element. */
  part: string
  properties: PropertyDoc[]
  slots: ApiMember[]
  /**
   * What a page imports to register the element: the tier's package and the
   * entry, such as `@fusion.dev/helix/option`.
   */
  specifier: string
  summary: string
  tagName: string
  tier: 'headless' | 'styled'
  /**
   * The properties whose text a page translates with `registerWords`, under the
   * key `words` names: `placeholder` and `emptyText` on Select. From `@words`.
   */
  words: string[]
}

export interface Example {
  /** The example's own stylesheet, or empty where it needs none. */
  css: string
  /** One line from the example's `@summary` comment, or empty where unwritten. */
  description: string
  html: string
  /**
   * The import lines that register every element the example writes, its own
   * family's first: an example copied with these runs, and an example copied
   * without them draws unknown elements wherever it writes another family's
   * tag, such as Flex around a Button or Option inside Select.
   */
  imports: string[]
  label: string
  /**
   * The frame layout this example asks for, where it asks for one.
   *
   * Absent on almost every example, which is the design rather than an
   * oversight: the reference picks `centered` and only the exceptions say
   * otherwise, so what is written down is the handful of facts that differ
   * rather than a table of defaults kept by hand. A consumer that has no
   * layouts can ignore it.
   */
  layout?: string
  /**
   * The least height the preview pane should give this example, in pixels.
   *
   * Present on the six overlay families and nowhere else. Height is derived
   * from what the frame drew, so a declared one is a fact that can go stale;
   * these are the examples where there is nothing to derive, because what they
   * open is `position: fixed` and excluded from measurement by design.
   */
  min?: number
  slug: string
  /**
   * The same example authored in TSX, which is a file and never a conversion.
   *
   * **Both syntaxes are authored, neither derived.** A derived example is a
   * function of its twin rather than a thing anybody wrote, and converting the
   * HTML mechanically does not work: an example carrying a `<script>` becomes
   * a JSX fragment with a `<script>` in it, which is a syntax error rather
   * than a bad example.
   *
   * `helix component`'s `examples-paired` holds the two files to each other and
   * `check:spec:visual-parity` holds the two pictures to each other.
   */
  tsx: string
  /**
   * Which tier the example shows, read from what it renders.
   *
   * Off the markup rather than off the filename, the same test `helix component`'s `tokens`
   * uses to know a headless example's stylesheet may write raw values: an
   * example is a headless one when it renders a `helix-headless-` element.
   * Both tiers call theirs `preview.html`, the package directory carrying the
   * tier, so the name cannot answer and this is the only fact available.
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
  /**
   * The entries of other families whose elements a page writes inside this
   * one, such as `option` for Select: the family does not register them, so
   * the page imports them beside it. The reference's usage lists them under
   * the family's own entries.
   *
   * Read from the import lines the family's descriptions show, where each
   * container says what to import beside it. See "A container does not
   * register another family's children" in `helix/CONVENTIONS.md`.
   */
  imports: string[]
  label: string
  since: string
  slug: string
  /** The family's source directory, relative to the repository root. */
  source: string
  status: string
  summary: string
  /**
   * The import block for each tier the family has: the family's entry, each
   * entry of its own a part has, then each other family whose elements a page
   * writes inside this one. The reference page's Usage shows it, and the `.md`
   * prints it, so an agent reading either imports the same lines.
   */
  usage: { headless: string[]; styled: string[] }
}

/**
 * One example as it sits on disk, before this decides what to call it.
 *
 * An example is up to two files, `<slug>.html` and an optional `<slug>.css`.
 * The HTML is the list: a stylesheet on its own is not an example, and
 * `helix component`'s `examples` fails on one whose markup is missing rather than showing a
 * sandbox with a stylesheet and nothing to style.
 *
 * The pair is what the sandbox already shows, `index.html` beside `styles.css`,
 * so the second file is the one the reader is looking at rather than a build
 * step. Never an inline `style` attribute instead: it is unreachable from a
 * stylesheet, cannot express a hover or a media query, and teaches a reader to
 * write the one thing the library exists to avoid.
 */
export interface ExampleSource {
  css: string
  /** Family folder the example was found in. */
  family: string
  html: string
  /** File name without its extension: `preview`, `headless`, `cards.headless`. */
  slug: string
  /** The authored TSX beside the HTML, never a conversion of it. */
  tsx: string
}

/**
 * Drops `undefined` from a union.
 *
 * Every reflected property is optional, because the default state of a Helix
 * component is the absent attribute: a reflected default would put an attribute
 * on the host that a React consumer's server markup never had. That makes the
 * declared type `'primary' | 'neutral' | undefined`, and the `undefined` is an
 * implementation detail of how the default is expressed rather than a value
 * anyone sets.
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
 * Fields rather than attributes: an attribute carries no default in the
 * manifest, so a table built from attributes can say a component takes a
 * property and never what it does when you leave it alone.
 */
const properties = (rows: HelixMember[] | undefined): PropertyDoc[] =>
  (rows ?? [])
    /* Instance fields only. A static is the class's, not an element's, and the
       two that reach here are the platform's rather than ours:
       `shadowRootOptions` is Lit's and `formAssociated` is the flag the browser
       reads to decide a control participates in a form. Thirty-five rows across
       the library, none of them anything a consumer sets on a tag. */
    /* `@internal` needs nothing here: the analyzer drops a member carrying it
       before the manifest is written. */
    .filter((row) => row.kind === 'field' && isPublic(row) && row.static !== true)
    .map((row) => ({
      /* `undefined` is not a default, it is the absence of one, and the
         analyzer records the initializer verbatim. Printed, the column reads
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
 * An annotation comment: a leading `@` inside an HTML comment, and its line.
 *
 * **Only comments that begin with `@`.** An example is allowed one comment
 * about its own scaffolding, and those are written for the reader:
 * `<!-- Preview frame: the submit is swallowed. -->` exists so nobody copies
 * `onsubmit="event.preventDefault()"` into production. Stripping every comment
 * would take that note with it. The sigil is what separates a line addressed to
 * this documentation system from a line addressed to a person.
 */
const ANNOTATION = /^[^\S\n]*<!--\s*@[\s\S]*?-->[^\S\n]*\n?/gm

/**
 * The example's markup as a reader should receive it.
 *
 * `@summary` is metadata about the example rather than part of it: the cem
 * plugin lifts it into the manifest and the reference prints it as the
 * description, so left in place it makes the copy button hand back a comment
 * describing the thing you just copied.
 *
 * Stripped here rather than at the reader, because every consumer of the
 * catalog wants the same thing and a site that trimmed it in its own renderer
 * would leave the sandbox and any other consumer showing it.
 */
const withoutAnnotations = (html: string): string => html.replace(ANNOTATION, '').trimStart()

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
  /* Keyed on slug the same way the descriptions are, and for the same reason:
     the manifest half and the on-disk half are matched rather than zipped, so
     the two cannot drift into each other's order. */
  const layouts = new Map(
    (declared?.examples ?? []).map((entry) => [entry.slug ?? '', entry.layout ?? '']),
  )
  const minimums = new Map(
    (declared?.examples ?? []).map((entry) => [entry.slug ?? '', entry.min ?? 0]),
  )
  return (
    sources
      .filter((source) => source.family === slug)
      /* `preview` first, then alphabetical, with each headless twin directly
         behind the example it mirrors.

         By slug, never by filename. Comparing `compact-counts.html` against
         `compact.html` puts the longer name first, `-` preceding `.`, which is
         a list ordered by a file extension no reader ever sees.

         **Pair on the mirrored name, not on the raw slug.** Sorting on the raw
         slug puts the twin wherever the tier's name happens to fall in the
         alphabet, which is only ever right by luck. The tabs have to show the
         same list on both tiers, and `mirrored` below is that relationship: sort
         on it and the position follows from the pairing. */
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
         the twin of `preview`, and `<name>.headless` of `<name>`. This is the
         one place that has to know the pairing, because a headless example is
         not named for itself. */
        /* Read once and narrowed here rather than spread from the map
           directly: `get` answers `string | undefined`, and under
           `exactOptionalPropertyTypes` an optional property will not take the
           `undefined`. */
        const layout = layouts.get(source.slug)
        const min = minimums.get(source.slug)
        const mirrored =
          source.slug === HEADLESS ? CANONICAL : source.slug.replace(HEADLESS_SUFFIX, '')
        return {
          css: source.css,
          description: described.get(source.slug) ?? '',
          html: withoutAnnotations(source.html),
          /* Written once the whole catalog is read, by `catalog`. */
          imports: [],
          /* **The label is the file's name, with no special case.** `startCase`
           gives "Preview" for the canonical example on its own.

           **A headless example takes the name of the one it mirrors**, so the two
           tiers show the same list rather than a list that changes its labels
           when a reader changes a preference. Only one of a pair is ever on
           screen, the tier deciding which, so a differing name would be the only
           thing suggesting they are different examples. */
          label: startCase(mirrored),
          ...(layout ? { layout } : {}),
          ...(min ? { min } : {}),
          slug: source.slug,
          tier: (source.html.includes('<helix-headless-') ? 'headless' : 'styled') as
            | 'headless'
            | 'styled',
          tsx: source.tsx,
        }
      })
  )
}

/**
 * The entry each module is imported through, by its path without the
 * extension: the shortest `index.ts` that re-exports it, so a part the
 * family's entry registers is read as the family's, and one only its own
 * entry registers, such as `filter-input/menu`, as that entry.
 */
const entriesOf = (manifest: HelixManifest): Map<string, string> => {
  const entries = new Map<string, string>()
  for (const module of manifest.modules ?? []) {
    const entry = /^src\/(.+)\/index\.ts$/.exec(module.path ?? '')?.[1]
    if (!entry) {
      continue
    }
    for (const exported of module.exports ?? []) {
      const from = exported.declaration?.module?.replace(/\.[jt]s$/, '')
      const held = from === undefined ? undefined : entries.get(from)
      if (from !== undefined && (held === undefined || entry.length < held.length)) {
        entries.set(from, entry)
      }
    }
  }
  return entries
}

/**
 * Every family across the given manifests, alphabetical, each with its elements
 * and examples.
 *
 * The family a declaration belongs to comes from where its file is rather than
 * from its tag name, which is the same reasoning `place()` carries for the
 * reference: `helix-button-group` is one family and `helix-tab` is a part
 * of another, and nothing in the name says which.
 */
export const catalog = (manifests: HelixManifest[], examples: ExampleSource[] = []): Family[] => {
  const byFamily = new Map<string, HelixDeclaration[]>()
  /* Where each element is imported from, which the reference's usage shows. */
  const entryOf = new Map<HelixDeclaration, string>()
  for (const manifest of manifests) {
    const entries = entriesOf(manifest)
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
        entryOf.set(declaration, entries.get((module.path ?? '').replace(/\.[jt]s$/, '')) ?? family)
      }
    }
  }

  const families = [...byFamily.entries()]
    .map(([slug, entries]) => {
      /* The family's own description comes from its styled root: the element
         whose tag is the family name, rather than a part of it. */
      const root =
        entries.find((entry) => entry.tagName === `helix-${slug}`) ??
        (entries[0] as HelixDeclaration)

      /* **Aliases come from both roots, and every other field from the styled
         one.** An alias is a word somebody searches for, a fact about the
         family rather than about a tier, and fourteen families declare theirs
         on the headless root alone, measured 17 Sep 2026: read off the styled
         root, those fourteen published none, and `heatmap` lost the only route
         to "contribution graph". The rest stay on the styled root on purpose, since a
         description or a category read twice would be two answers to one
         question; the two roots are held to the same alias list by
         `helix component`'s `aliases`, so this union can never hide a
         disagreement. */
      const named = (tag: string): HelixDeclaration | undefined =>
        entries.find((entry) => entry.tagName === tag)
      /* Styled first, then headless, deduplicated: where both declare, the
         order a reader already sees is the styled root's. */
      const roots = [named(`helix-${slug}`), named(`helix-${HEADLESS}-${slug}`)].filter(
        (entry) => entry !== undefined,
      )

      return {
        aliases: [...new Set(roots.flatMap((entry) => entry.helix?.aliases ?? []))],
        category: root.helix?.category ?? '',
        documentation: root.helix?.documentation ?? '',
        elements: entries
          .map((entry) => ({
            attributes: members(entry.attributes),
            cssParts: members(entry.cssParts),
            cssProperties: members(entry.cssProperties),
            cssStates: members(entry.cssStates),
            description: entry.description ?? '',
            entry: entryOf.get(entry) ?? slug,
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
            specifier: `${PACKAGE[tierOf(entry.tagName as string)]}/${entryOf.get(entry) ?? slug}`,
            summary: entry.summary ?? '',
            tagName: entry.tagName as string,
            tier: tierOf(entry.tagName as string),
            words: (entry.members ?? [])
              .filter((member) => member.helix?.words === true && isPublic(member))
              .map((member) => member.name ?? ''),
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
        imports: importsOf(slug, entries),
        label: startCase(slug),
        since: root.helix?.since ?? '',
        slug,
        source: root.helix?.source ?? '',
        status: root.helix?.status ?? '',
        summary: root.summary ?? '',
        usage: { headless: [], styled: [] },
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))

  /* The import lines need every family's elements, so they are written once
     the whole catalog is read: an example in Select writes Flex and Option,
     and Select's own declarations cannot say where those come from. */
  const specifiers = new Map(
    families.flatMap((family) =>
      family.elements.map((element) => [element.tagName, element.specifier] as const),
    ),
  )
  return families.map((family) => ({
    ...family,
    examples: family.examples.map((example) => ({
      ...example,
      imports: importLines(example.html, family.slug, specifiers),
    })),
    usage: {
      headless: usageOf(family, 'headless'),
      styled: usageOf(family, 'styled'),
    },
  }))
}

/**
 * The import lines an example needs: one per entry that registers an element
 * it writes, the family's own entry first and the rest in order.
 */
const importLines = (html: string, slug: string, specifiers: Map<string, string>): string[] => {
  const needed = new Set<string>()
  for (const [, tag] of html.matchAll(/<(helix-[a-z0-9-]+)/g)) {
    const specifier = specifiers.get(tag ?? '')
    if (specifier) {
      needed.add(specifier)
    }
  }
  const own = (specifier: string): boolean =>
    specifier.endsWith(`/${slug}`) || specifier.includes(`/${slug}/`)
  return [...needed]
    .sort((a, b) => Number(own(b)) - Number(own(a)) || a.localeCompare(b))
    .map((specifier) => `import '${specifier}'`)
}

/**
 * A tier's import block for the family: its entry, each entry of its own a
 * part has, with the part it registers, then each other family whose elements
 * a page writes inside it. Empty for a tier the family is not in.
 *
 * **The part's own entry is listed** because `FilterMenu` registers only
 * through `filter-input/menu`, and a page that copied the family's line alone
 * wrote a picker that opened nothing. **The other families are listed**
 * because Select does not register Option: copied without it, the options
 * were unknown elements and the select offered nothing.
 */
export const usageOf = (
  family: Pick<Family, 'elements' | 'imports' | 'slug'>,
  tier: 'headless' | 'styled',
): string[] => {
  if (!family.elements.some((element) => element.tier === tier)) {
    return []
  }
  const pkg = PACKAGE[tier]
  const parts = family.elements
    .filter((element) => element.tier === tier && !element.specifier.endsWith(`/${family.slug}`))
    .map((element) => `import '${element.specifier}' // ${element.label}`)
  return [
    `import '${pkg}/${family.slug}'`,
    ...new Set(parts),
    ...family.imports.map((entry) => `import '${pkg}/${entry}' // ${startCase(entry)}`),
  ]
}

/**
 * The entries of other families a family's descriptions import beside its own:
 * an `import '@fusion.dev/helix/option'` line in Select's names `option`. An
 * entry of the family's own, such as `filter-input/menu`, is a part's and is
 * listed with the part.
 */
const importsOf = (slug: string, declarations: readonly HelixDeclaration[]): string[] =>
  [
    ...new Set(
      declarations.flatMap((declaration) =>
        [...(declaration.description ?? '').matchAll(/import '@fusion\.dev\/helix\/([a-z-]+)'/g)]
          .map((match) => match[1] ?? '')
          .filter((entry) => entry !== '' && entry !== slug),
      ),
    ),
  ].sort()

/** The family of a given slug, from an already-built catalog. */
export const findInCatalog = (families: Family[], slug: string): Family | undefined =>
  families.find((family) => family.slug === slug)
