import type { Plugin } from '@custom-elements-manifest/analyzer'

export type { Plugin }

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
 * Only the fields Helix actually reads or writes are modelled. Everything else
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

export interface HelixMember extends Documented {
  /** Helix's own fields, namespaced the way the declaration's are. */
  helix?: {
    /**
     * Events that answer this property, where it is controlled.
     *
     * Set from `@controlled` by `helix-controlled`. Present only on a property
     * a consumer can take ownership of by declaring it.
     */
    controlled?: string[]
    /**
     * Where the platform feature this is built on is specified.
     *
     * Set from `@see <url> <label>` by `helix-references`. Present only on a
     * member whose behaviour comes from something a reader may not have met.
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
 * **This exists because the alternative was inferring it.** The gallery grouped
 * families by which of five art files their drawing happened to live in, and
 * those files are split for authoring convenience: one of them is named for the
 * ten components the drawing system was worked out on, which is a fact about
 * the order they were made in. Twenty-nine of sixty-five sat in a bucket that
 * did not describe them. A category is a fact about a component, so it belongs
 * on the component, in the manifest, beside `@status`.
 *
 * **`charts` was split out of `content` on 23 Aug 2026, and the count is the
 * argument.** `content` held 27 of 88 families and meant "none of the other
 * seven", which is a drawer rather than a category: six drew a reading, four
 * displayed data, six were media, six typographic and three markers. A reader
 * filtering by it was filtering by nothing. The six that draw are the clearest
 * cluster in it and the one another component can be wrong about, since a
 * legend whose swatches disagree with the chart they key is a visible fault.
 * Whether the rest of `content` splits further is open.
 *
 * **The list and the type are one declaration, because they were two.** The
 * array lived in `metadata.ts` and the union was written out here, so adding a
 * category meant editing both. `charts` went into one of them and `analyze`
 * failed on a word that had just been made legal, which is the argument for
 * deriving one from the other rather than a story about a typo.
 */
export const CATEGORIES = [
  'actions',
  'charts',
  'content',
  'feedback',
  'forms',
  'layout',
  'navigation',
  'overlays',
  'tooling',
] as const

/** One of the categories a component may declare. */
export type Category = (typeof CATEGORIES)[number]

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
  examples?: { description?: string; slug: string }[]

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
   * `Card.Root` and `Card.Header` share the group `Card`.
   */
  group?: string

  /**
   * Role within the group. `Root` for the family's primary element.
   */
  part?: string

  /**
   * Which layer of the design system the declaration belongs to. The React
   * wrapper generator wraps only `styled`. `core` holds element primitives and
   * mixins, which are not components but must be analyzed so dependents can
   * inherit from them.
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
  cssProperties?: Documented[]
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

/** Plugin context, narrowed to the part Helix reads. */
export interface HelixContext {
  /** Manifests of dependencies, collected when `dependencies: true`. */
  thirdPartyCEMs?: HelixManifest[]
}

/** The class every Helix component descends from. */
export const COMPONENT_ROOT = 'HelixElement'

/** A problem found by a validating plugin. */
export interface Violation {
  message: string
  module: string
  rule: string
  subject: string
}

/** True only for declarations that register themselves as a custom element. */
export const isCustomElement = (declaration: HelixDeclaration): boolean =>
  declaration.kind === 'class' && declaration.customElement === true

/** Indexes every class declaration by name across a set of manifests. */
export const classIndex = (manifests: HelixManifest[]): Map<string, HelixDeclaration> => {
  const index = new Map<string, HelixDeclaration>()
  for (const manifest of manifests) {
    for (const module of manifest.modules ?? []) {
      for (const declaration of module.declarations ?? []) {
        if (declaration.kind === 'class' && !index.has(declaration.name)) {
          index.set(declaration.name, declaration)
        }
      }
    }
  }
  return index
}

/**
 * True when a declaration is `root` or descends from it.
 *
 * Walks the `superclass` chain, which crosses package boundaries as long as the
 * dependency's manifest is in the index. Terminates on cycles, which a
 * hand-edited manifest could contain.
 */
export const descendsFrom = (
  declaration: HelixDeclaration,
  index: Map<string, HelixDeclaration>,
  root: string = COMPONENT_ROOT,
): boolean => {
  const seen = new Set<string>()
  let current: HelixDeclaration | undefined = declaration

  while (current && !seen.has(current.name)) {
    if (current.name === root) {
      return true
    }
    seen.add(current.name)
    const parent: string | undefined = current.superclass?.name
    current = parent === undefined ? undefined : index.get(parent)
  }

  return false
}

/**
 * Every Helix component in a manifest, paired with its module.
 *
 * A component is any class descending from `HelixElement`, registered or not.
 * That covers the headless tier, which carries no `@customElement` decorator,
 * while excluding utility classes and the `declare class` interfaces that back
 * mixins. Keying on "is a class" instead would lint and stamp every exported
 * class in the package, which is correct only until someone exports one that is
 * not a component.
 *
 * Pass `context` so the superclass chain can be resolved across packages;
 * without it, a component whose base lives in a dependency looks unrelated to
 * `HelixElement` and is skipped.
 */
export const eachComponent = function* (
  manifest: HelixManifest,
  context?: HelixContext,
): Generator<{ declaration: HelixDeclaration; module: HelixModule }> {
  const index = classIndex([manifest, ...(context?.thirdPartyCEMs ?? [])])

  for (const module of manifest.modules ?? []) {
    for (const declaration of module.declarations ?? []) {
      if (declaration.kind === 'class' && descendsFrom(declaration, index)) {
        yield { declaration, module }
      }
    }
  }
}
