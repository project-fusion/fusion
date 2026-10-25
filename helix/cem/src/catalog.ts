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
import { displayName, familyOf, startCase, tierOf } from './naming.js'
import type { HelixDeclaration, HelixManifest, HelixMember } from './types.js'

/**
 * The canonical example's slug, named once because three places ask for it.
 *
 * The tier pairing, the first-position pin and the label all read it. A fact
 * three places hold is a fact that drifts.
 */
const CANONICAL = 'preview'

/* The headless twin's slug, and the suffix every other one carries. */
const HEADLESS = 'headless'

/**
 * The package each tier publishes, for an element whose manifest names no
 * package and for the other families a description imports.
 */
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
  /** Whether a listener on an ancestor hears it, where the event's class says. */
  bubbles?: boolean | undefined
  description: string
  name: string
  reactProp: string
  type: string
}

/**
 * What an element is called on React Native, as `helix family platforms`
 * names it: the component, and the prop each property, slot, and event of the
 * web element becomes.
 */
export interface NativeElement {
  /** The component's name, the web element's class name, such as `HelixTabs`. */
  component: string
  /** Each event the component sends, by its web name, and the prop that hears it. */
  events: { name: string; prop: string }[]
  /** The web element's properties the component leaves out, such as a form's. */
  omitted: string[]
  /** The web element's properties the component takes, under the same names. */
  properties: string[]
  /** Each slot, by its web name, empty for the default, and the prop that fills it. */
  slots: { name: string; prop: string }[]
}

/**
 * What `helix family platforms` prints: each element Helix draws on React
 * Native, by its tag, and the status its family has there.
 */
export interface NativeRecord {
  'react-native'?: { elements: Record<string, NativeElement>; status: string }
}

/**
 * A family's status on each platform it ships for. `web` is the family's own
 * `status`, and `react-native` is present where the family is drawn there.
 */
export interface Platforms {
  'react-native'?: { status: string }
  web: { status: string }
}

export interface Element {
  attributes: ApiMember[]
  cssParts: ApiMember[]
  cssProperties: ApiMember[]
  cssStates: ApiMember[]
  description: string
  /**
   * The entry that registers the element, under its package: the family's
   * own, such as `filter-input`, or one of its own where the family's leaves it
   * out, such as `filter-input/menu`.
   */
  entry: string
  events: EventDoc[]
  label: string
  methods: ApiMember[]
  /**
   * The package that publishes the element, from its manifest: a tier's, or
   * another package's whose element names the family with `@family`, such as
   * `helix-sandbox-editor` from `@fusion.dev/helix-sandbox`.
   */
  package: string
  /** Role within the family. `Root` for its primary element. */
  part: string
  /**
   * What the element is called on each platform beside the web, where Helix
   * draws it there. Written by `withPlatforms`.
   */
  platforms?: { 'react-native'?: NativeElement }
  properties: PropertyDoc[]
  slots: ApiMember[]
  /**
   * What a page imports to register the element: its package and the entry,
   * such as `@fusion.dev/helix/option` or `@fusion.dev/helix-sandbox/editor`.
   */
  specifier: string
  /**
   * The element's own `@status`, which can differ from the family's: the
   * family's is its root's.
   */
  status: string
  summary: string
  tagName: string
  /**
   * The presentation tier, which the reference's Base and Styled views choose
   * between: `styled` for an element drawn with the styled tier's tokens,
   * whichever package publishes it. `helix-sandbox-editor` is `styled` and
   * ships in `@fusion.dev/helix-sandbox`, so `package` and `specifier` say
   * where it comes from.
   */
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
   * The pictures of the example that the visual check keeps as its baselines,
   * by shot: `wide`, `narrow`, and `dark`, each a file beside the example. Empty
   * where the example is not pictured. A reader compares a render of its own
   * to these.
   */
  renders: Render[]
  /**
   * The least height the preview pane should give this example, in pixels.
   *
   * Present on the six overlay families and nowhere else. Height is derived
   * from what the frame drew, so a declared one is a fact that can go stale;
   * these are the examples where there is nothing to derive, because what they
   * open is `position: fixed` and excluded from measurement by design.
   */
  min?: number
  /**
   * What the example shows on another platform, keyed by the platform, from
   * its `@react-native-summary` comment, where `description` names something
   * that platform does not have, such as the arrow keys in React Native.
   * Absent where `description` is true everywhere.
   */
  platforms?: { 'react-native'?: { description: string } }
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

/** One baseline picture of an example: the shot it is and its file name. */
export interface Render {
  file: string
  shot: string
}

/**
 * The shots a baseline file name can carry after the example's slug. The wide
 * shot has none: `preview.png` beside `preview.narrow.png` and
 * `preview.dark.png`.
 */
const SHOTS = ['dark', 'narrow']

/** The baselines among `files` that picture the example `slug`. */
export const rendersOf = (slug: string, files: readonly string[]): Render[] =>
  files
    .flatMap((file): Render[] => {
      if (file === `${slug}.png`) {
        return [{ file, shot: 'wide' }]
      }
      const shot = file.startsWith(`${slug}.`) ? file.slice(slug.length + 1, -'.png'.length) : ''
      return file.endsWith('.png') && SHOTS.includes(shot) ? [{ file, shot }] : []
    })
    .sort((a, b) => a.file.localeCompare(b.file))

export interface Family {
  aliases: string[]
  /**
   * The native elements the family stands in for, from `@replaces`: `button`,
   * or `input[type=checkbox]`. `helix scan` reports each one a page writes.
   */
  replaces: string[]
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
  /**
   * The package that holds the family's root, `helix-<slug>` or
   * `helix-headless-<slug>`, and so supplies its facts: the summary,
   * description, status, since, category, aliases, documentation, and source.
   * Empty where no package read holds the root, and the facts are empty with
   * it.
   */
  package: string
  /**
   * The family's status on each platform it ships for. Written by
   * `withPlatforms`, which every package's `api.json` passes through.
   */
  platforms?: Platforms
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
  /**
   * The picture files beside the example, which `rendersOf` reads its
   * baselines from. Absent where the caller did not list them.
   */
  pictures?: string[]
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
  const native = new Map(
    (declared?.examples ?? []).map((entry) => [
      entry.slug ?? '',
      entry.platforms?.['react-native']?.description ?? '',
    ]),
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
        const reactNative = native.get(source.slug)
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
          ...(reactNative ? { platforms: { 'react-native': { description: reactNative } } } : {}),
          renders: rendersOf(source.slug, source.pictures ?? []),
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
 * The family a declaration belongs to comes from its `@family` or from where
 * its file is, never from its tag name, which is the same reasoning `place()`
 * carries for the reference: `helix-button-group` is one family and
 * `helix-tab` is a part of another, and nothing in the name says which.
 *
 * **One family from many packages, and the same answer in any order.** Every
 * package adds its elements, and only the package holding the family's root
 * supplies the family's facts, so a part another package publishes cannot
 * restate what the family is. Nothing here depends on which manifest was read
 * first: the facts come from the root by its tag, and the elements are sorted.
 */
export const catalog = (
  manifests: HelixManifest[],
  examples: ExampleSource[] = [],
  bubbling: ReadonlyMap<string, boolean> = new Map(),
): Family[] => {
  const byFamily = new Map<string, HelixDeclaration[]>()
  /* Where each element is imported from, which the reference's usage shows. */
  const entryOf = new Map<HelixDeclaration, string>()
  /* **The package from the manifest, and the tier only where it names none.**
     A family can hold an element another package publishes, named there by
     its `@family`: `helix-sandbox-editor` is the Sandbox family's Editor, and
     a specifier read off its tier would import it from `@fusion.dev/helix`. */
  const packageOf = new Map<HelixDeclaration, string>()
  for (const manifest of manifests) {
    const entries = entriesOf(manifest)
    for (const module of manifest.modules ?? []) {
      for (const declaration of module.declarations ?? []) {
        if (!declaration.tagName) {
          continue
        }
        const family = familyOf(declaration, module.path)
        if (!family) {
          continue
        }
        byFamily.set(family, [...(byFamily.get(family) ?? []), declaration])
        entryOf.set(declaration, entries.get((module.path ?? '').replace(/\.[jt]s$/, '')) ?? family)
        if (manifest.helix?.package) {
          packageOf.set(declaration, manifest.helix.package)
        }
      }
    }
  }
  const published = (declaration: HelixDeclaration): string =>
    packageOf.get(declaration) ?? PACKAGE[tierOf(declaration.tagName ?? '')]

  const families = [...byFamily.entries()]
    .map(([slug, entries]) => {
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
      /* **The family's facts come from its root, and from no other element.**
         The first declaration read stood in where there was no styled root,
         which gave the headless tier's `api.json` a part's summary for 26
         families (measured October 10, 2026), and gave a package that adds one
         element to a family the facts of that element. Where no manifest read
         holds the root, the facts are empty. */
      const root = roots[0]

      return {
        aliases: [...new Set(roots.flatMap((entry) => entry.helix?.aliases ?? []))],
        category: root?.helix?.category ?? '',
        documentation: root?.helix?.documentation ?? '',
        elements: entries
          .map((entry) => ({
            attributes: members(entry.attributes),
            cssParts: members(entry.cssParts),
            cssProperties: members(entry.cssProperties),
            cssStates: members(entry.cssStates),
            description: entry.description ?? '',
            entry: entryOf.get(entry) ?? slug,
            events: (entry.events ?? []).map((event) => ({
              /* Whether a listener on an ancestor hears it, where the event's
                 class says. Absent where it does not, as for an event a
                 component builds by name. */
              bubbles: bubbling.get(event.name ?? ''),
              description: event.description ?? '',
              name: event.name ?? '',
              reactProp: event.reactProp ?? `on${event.name ?? ''}`,
              type: event.type?.text ?? '',
            })),
            label: displayName(entry.tagName as string),
            methods: methods(entry.members),
            package: published(entry),
            /* From the manifest, not by stripping the family name off the
               label. The composition plugin already derives this from the
               folder, and "Avatar Group" minus "Avatar" is a string operation
               that happens to work until a part's name contains the family's. */
            part: entry.helix?.part ?? '',
            properties: properties(entry.members),
            slots: members(entry.slots),
            specifier: `${published(entry)}/${entryOf.get(entry) ?? slug}`,
            status: entry.helix?.status ?? '',
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
        examples: examplesOf(slug, root?.helix, examples),
        imports: importsOf(
          slug,
          entries,
          new Set(entries.map((entry) => entryOf.get(entry) ?? slug)),
        ),
        label: startCase(slug),
        package: root ? published(root) : '',
        replaces: [...new Set(roots.flatMap((entry) => entry.helix?.replaces ?? []))],
        since: root?.helix?.since ?? '',
        slug,
        source: root?.helix?.source ?? '',
        status: root?.helix?.status ?? '',
        summary: root?.summary ?? '',
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
  /* A tag the markup writes, and one its script makes with `createElement`,
     which a page copying the example registers all the same. */
  const tags = [
    ...html.matchAll(/<(helix-[a-z0-9-]+)/g),
    ...html.matchAll(/createElement\(\s*['"](helix-[a-z0-9-]+)['"]/g),
  ]
  for (const [, tag] of tags) {
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
 *
 * **An entry of its own that only adds behavior names the attribute it turns
 * on**, `// Menu Filter, for filterable`, so a reader does not take it for an
 * import every menu needs.
 *
 * **Each line is an element's own specifier**, its package and its entry, so a
 * part another package publishes is imported from that package: the Sandbox
 * family's Editor is `@fusion.dev/helix-sandbox/editor`.
 */
export const usageOf = (
  family: Pick<Family, 'elements' | 'imports' | 'slug'>,
  tier: 'headless' | 'styled',
): string[] => {
  const shown = family.elements.filter((element) => element.tier === tier)
  if (shown.length === 0) {
    return []
  }
  const own = (element: Element): boolean => element.entry === family.slug
  const label = (entry: string): string => {
    const name = startCase(entry.replaceAll('/', '-'))
    const turnedOn = shown
      .filter(own)
      .flatMap((element) => element.attributes)
      .find((attribute) => attribute.description.includes(`/${entry}\``))
    return turnedOn ? `${name}, for ${turnedOn.name}` : name
  }
  return [
    ...new Set([
      ...shown.filter(own).map((element) => `import '${element.specifier}'`),
      ...shown
        .filter((element) => !own(element))
        .map((element) => `import '${element.specifier}' // ${element.label}`),
    ]),
    ...family.imports.map((entry) =>
      entry.startsWith('@')
        ? `import '${entry}' // ${startCase(entry.slice(entry.indexOf('/helix-') + 7).replaceAll('/', '-'))}`
        : `import '${PACKAGE[tier]}/${entry}' // ${label(entry)}`,
    ),
  ]
}

/**
 * The entries a family's descriptions import beside its own: an
 * `import '@fusion.dev/helix/option'` line in Select's names `option`. An
 * entry of the family's own that only adds behavior, such as `menu/filter`,
 * is listed too, since no element carries it. One a part has, such as
 * `filter-input/menu`, is listed with the part, so `owned` leaves it out.
 *
 * **An entry of another package is kept whole**, such as
 * `@fusion.dev/helix-sandbox/code-block`, which colors every Code Block: the
 * line is that package's in both tiers, and only a Helix tier's entry is
 * written again under the other tier's package.
 */
const importsOf = (
  slug: string,
  declarations: readonly HelixDeclaration[],
  owned: ReadonlySet<string>,
): string[] =>
  [
    ...new Set(
      declarations.flatMap((declaration) =>
        [
          ...(declaration.description ?? '').matchAll(
            /import '(@fusion\.dev\/helix(?:-[a-z]+)?)\/([a-z-]+(?:\/[a-z-]+)*)'/g,
          ),
        ]
          .map(([, pack = '', entry = '']) =>
            pack === PACKAGE.styled || pack === PACKAGE.headless ? entry : `${pack}/${entry}`,
          )
          .filter((entry) => entry !== '' && entry !== slug && !owned.has(entry)),
      ),
    ),
  ].sort()

/** The family of a given slug, from an already-built catalog. */
export const findInCatalog = (families: Family[], slug: string): Family | undefined =>
  families.find((family) => family.slug === slug)

/**
 * A family as a package publishes it that holds none of the family's roots:
 * the elements it adds and the examples it ships, under the family's slug.
 */
export interface Contribution {
  /** Marks a family this package adds elements to and does not hold the root of. */
  contributes: true
  elements: Element[]
  examples: Example[]
  label: string
  /**
   * The package that holds the family's root and supplies its facts, where
   * one this package was built against holds it.
   */
  package?: string
  slug: string
}

/**
 * The families one package publishes, from a catalog read with the packages it
 * is built against: each with only the elements the package itself publishes.
 *
 * **Whole where the package holds the root, and a contribution elsewhere.**
 * `@fusion.dev/helix-sandbox` publishes `helix-sandbox-editor` in the Sandbox
 * family, whose root `@fusion.dev/helix` holds, so its `api.json` lists the
 * editor, marks the family `contributes`, and names `@fusion.dev/helix` as the
 * package with the facts. Restating the facts there gave a reader two answers
 * about one family, and the one read from the editor was wrong.
 */
export const publishedBy = (families: Family[], name: string): (Contribution | Family)[] =>
  families.flatMap((family): (Contribution | Family)[] => {
    const elements = family.elements.filter((element) => element.package === name)
    if (elements.length === 0) {
      return []
    }
    if (family.package === name) {
      return [{ ...family, elements }]
    }
    return [
      {
        contributes: true,
        elements,
        examples: family.examples,
        label: family.label,
        ...(family.package ? { package: family.package } : {}),
        slug: family.slug,
      },
    ]
  })

/**
 * The families with each one's status on every platform, and each element
 * drawn on React Native with the names it takes there, from what
 * `helix family platforms` printed. An empty record names the web alone.
 *
 * **Only a styled element is drawn natively**, since the components ship from
 * `@fusion.dev/helix`, so a headless element with the same family is left as
 * it is. **A family contributed to by another package states no status**,
 * the package holding its root doing that.
 */
export const withPlatforms = (
  families: (Contribution | Family)[],
  native: NativeRecord,
): (Contribution | Family)[] =>
  families.map((family) => {
    const drawn = native['react-native']
    const elements = family.elements.map((element) => {
      const named = element.tier === 'styled' ? drawn?.elements[element.tagName] : undefined
      return named === undefined ? element : { ...element, platforms: { 'react-native': named } }
    })
    if ('contributes' in family) {
      return { ...family, elements }
    }
    const onPhones =
      drawn !== undefined && elements.some((element) => element.platforms !== undefined)
        ? { 'react-native': { status: drawn.status } }
        : {}
    return { ...family, elements, platforms: { ...onPhones, web: { status: family.status } } }
  })
