/**
 * A step that runs over a finished manifest.
 *
 * **Only the one hook, because only one is left.** This was the analyzer's
 * `Plugin`, which has four phases and hands each one TypeScript's AST. The
 * phases that read source went with the analyzer: `helix manifest build` does
 * that work in Rust, as ordinary code rather than as plugins, because there is
 * no plugin system in it and the analyzer had one only because it is a
 * framework. What remains reads the manifest once it is written and does
 * something with it, which is to lint it or to write typings from it, and the
 * shape it was called with is kept so the typings generators this repository
 * does not own keep working unchanged.
 */
export interface Plugin {
  name: string
  packageLinkPhase?: (params: { context: HelixContext; customElementsManifest: unknown }) => void
}

/*
 * Manifest types are declared structurally here rather than imported from
 * `custom-elements-manifest/schema`.
 *
 * The analyzer bundles its own copy of the schema package, so importing a
 * second copy produces two nominally distinct `Package` types that
 * `exactOptionalPropertyTypes` refuses to unify, even though they are
 * identical. Owning loose structural types keeps this package compatible with
 * whichever copy a consumer resolves, and decouples it from the schema's
 * version entirely.
 *
 * Only the fields Helix actually reads or writes are modeled. Everything else
 * passes through untouched.
 */

/** Anything in the manifest that carries a human description. */
export interface Documented {
  description?: string
  name: string
  /** Declared type, where the entry has one. Slots and parts do not. */
  type?: TypeText
}

/**
 * A type as the manifest records it: rendered source text, not a structure.
 *
 * The analyzer writes what was written, so a union arrives as
 * `'single' | 'single-collapsible' | undefined` and nothing downstream has to
 * reconstruct it.
 */
export interface TypeText {
  text?: string
}

/**
 * Where a member came from, when it was not declared on the element itself.
 *
 * The analyzer resolves inheritance across packages, so a styled component
 * carries every member its headless base contributes with the base named here.
 * That is what lets a reference document the styled tier alone without losing
 * anything, and what fills the "From" column.
 */
export interface InheritedFrom {
  module?: string
  name: string
}

/**
 * An observed attribute, and the property it is the attribute of.
 *
 * `fieldName` is the join: an attribute and its property are one thing with two
 * names, and pairing them by string similarity would guess wrong on the first
 * component whose attribute is not the kebab-case of its field.
 */
export interface HelixAttribute extends Documented {
  fieldName?: string
  inheritedFrom?: InheritedFrom
}

/**
 * A published custom property, and the component it is answered on behalf of.
 *
 * `inheritedFrom` is set by `helix-borrowed-styles` for a hook a component
 * answers because it borrowed another's stylesheet whole, which is a
 * relationship the analyzer has no field for: not inheritance, not a mixin and
 * not a part. The name still belongs to the lender, so recording it as the
 * borrower's own would be a rename nobody performed.
 */
export interface HelixCssProperty extends Documented {
  inheritedFrom?: InheritedFrom
}

export interface HelixMember extends Documented {
  /** Helix's own fields, namespaced the way the declaration's are. */
  helix?: {
    /**
     * Where the platform feature this is built on is specified.
     *
     * Set from `@see <url> <label>` by `helix-references`. Present only on a
     * member whose behavior comes from something a reader may not have met.
     */
    references?: { label: string; url: string }[]
  }
  /** Initial value, as source text. Absent where there is no default. */
  default?: string
  inheritedFrom?: InheritedFrom
  kind?: string
  /** Declared parameters, for a method. A signature says what to pass. */
  parameters?: Array<{ name?: string; type?: TypeText }>
  privacy?: string
  /** Whether it is a getter, so a reader is not invited to set it. */
  readonly?: boolean
  return?: { type?: TypeText }
  /** A static belongs to the class, not to an element a consumer writes. */
  static?: boolean
}

/** An event enriched with the React prop name generated for it. */
export interface HelixEvent extends Documented {
  inheritedFrom?: InheritedFrom
  /** Generated React prop, e.g. `open-change` becomes `onOpenChange`. */
  reactProp?: string
}

/**
 * What a component is for, and the one axis the catalog groups on.
 *
 * A closed set, checked the same way `@status` is: a typo lands a component in
 * no category rather than failing, and a category of one is invisible until
 * someone counts.
 *
 * **Declared, never inferred.** A category is a fact about a component, so it
 * belongs on the component, in the manifest, beside `@status`. Grouping the
 * gallery by which art file a family's drawing happened to live in put
 * twenty-nine of sixty-five in a bucket that did not describe them.
 *
 * **No category may mean "none of the others".** `content` did, holding 27 of
 * 88 families, so a reader filtering by it was filtering by nothing. A category
 * that survives a split as the name for whatever did not fit is the same drawer
 * with fewer things in it. The ceiling on any future one is that it has to be
 * nameable.
 *
 * **A small category is not a wrong one.** A category earns its name by what
 * filtering on it returns, not by how many families it holds, and three that
 * annotate something else is a truer answer than three folded into a word that
 * covers the library.
 */
export const CATEGORIES = [
  'actions',
  'charts',
  'data',
  'feedback',
  'forms',
  'layout',
  'markers',
  'media',
  'navigation',
  'overlays',
  'tooling',
  'typography',
] as const

/** One of the categories a component may declare. */
export type Category = (typeof CATEGORIES)[number]

/**
 * Which families a family is read beside, and owes a consistent answer to.
 *
 * **A second grouping, because `category` cannot be this and measurement says
 * so.** The nine chart-adjacent families span three categories: `charts` holds
 * the six that draw, `feedback` holds `meter` and `progress`, and `overlays`
 * holds `tooltip`. So a rule keyed on category would never compare a meter
 * against a bar chart.
 *
 * **Multi-valued, because the interesting members belong to two things at
 * once.** `tooltip` is genuinely an overlay and genuinely something a chart
 * draws, and a family that can only be in one group forces that choice to be
 * made wrongly. So this is shaped like `aliases` rather than like `category`.
 *
 * **What it is for** is the visual axes: a legend whose swatches are solid while
 * the bars it keys are outlined is a legend that does not match its own chart,
 * and that is a fault no check could see while the only grouping was purpose.
 * `helix component`'s `axes` reads it.
 *
 * Closed, the way `CATEGORIES` and the statuses are, so a typo lands a family
 * in a group of one rather than being trusted.
 */
export const GROUPS = ['charts'] as const

/** One of the groups a component may declare itself part of. */
export type Group = (typeof GROUPS)[number]

/**
 * Fields Helix adds to the manifest beyond the CEM spec.
 *
 * The spec permits extra properties. Namespacing them under `helix` keeps them
 * distinguishable from anything a future spec version adds, and makes it
 * obvious to a downstream consumer which fields are ours.
 */
export interface HelixMetadata {
  /** Other names people search for. Tag is also a Chip. */
  aliases?: string[]

  /**
   * What the component is for, and the one axis the catalog groups on.
   *
   * A closed set the metadata plugin checks, so an unknown word is dropped
   * rather than becoming a category of one.
   */
  category?: Category

  /** Which families this one is read beside, for the axes it owes them. */
  groups?: Group[]

  /** URL of the component's documentation page. */
  documentation?: string

  /**
   * The family's examples, from the `.examples` folder beside its source.
   *
   * The list and the prose, not the markup: the HTML and CSS stay on disk for
   * the sandbox to load, because they are large and every consumer of this
   * manifest would parse them whether or not it renders one.
   *
   * Only on the root declaration. An example belongs to the family rather than
   * to any one element in it.
   */
  examples?: { description?: string; layout?: string; min?: number; slug: string }[]

  /** Version the component was introduced in. */
  since?: string

  /**
   * Where the family's source directory lives, relative to the repository root.
   *
   * A path and not a URL. Documentation will be versioned, so the ref belongs
   * to whoever renders the link: bake one in here and an archived version of
   * the docs points at today's source. Only on the root declaration.
   */
  source?: string

  /**
   * Stability contract. `experimental` may change without a major version;
   * `stable` is bound by semver; `deprecated` names its replacement.
   */
  status?: 'deprecated' | 'experimental' | 'stable'

  /**
   * Composition family this component belongs to, from its directory.
   * `Tabs.Root` and `Tabs.Tab` share the group `Tabs`.
   */
  group?: string

  /**
   * Role within the group. `Root` for the family's primary element.
   */
  part?: string

  /**
   * Which layer of the design system the declaration belongs to. `core` holds
   * element primitives and mixins, which are not components but must be
   * analyzed so dependents can inherit from them.
   */
  tier?: 'core' | 'headless' | 'styled'
}

/**
 * A Helix component declaration.
 *
 * `customElement` and `tagName` are optional because the headless tier
 * deliberately carries no `@customElement` decorator (consumers register it
 * themselves), so its declarations would be invisible to anything keyed on
 * that flag.
 */
export interface HelixDeclaration extends Documented {
  attributes?: HelixAttribute[]
  cssParts?: Documented[]
  cssProperties?: HelixCssProperty[]
  cssStates?: Documented[]
  customElement?: boolean
  events?: HelixEvent[]
  helix?: HelixMetadata
  kind?: string
  members?: HelixMember[]
  slots?: Documented[]
  summary?: string
  /** Immediate base class, used to walk to the component root. */
  superclass?: { name: string; package?: string }
  tagName?: string
}

export interface HelixModule {
  declarations?: HelixDeclaration[]
  path?: string
}

export interface HelixManifest {
  modules?: HelixModule[]
}

/**
 * What a step over the manifest is given beside it.
 *
 * The manifests of the packages this one is built against. Nothing here reads
 * it any more, `convention-lint` having been the one step that did, to walk a
 * class up to `HelixElement`; it is kept because the typings generators this
 * repository does not own are called in the analyzer's shape, which has it.
 */
export interface HelixContext {
  thirdPartyCEMs?: HelixManifest[]
}
