import type { Plugin } from '@custom-elements-manifest/analyzer'

export type { Plugin }

/**
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
  }
  kind?: string
  privacy?: string
}

/** An event enriched with the React prop name generated for it. */
export interface HelixEvent extends Documented {
  /** Generated React prop, e.g. `open-change` becomes `onOpenChange`. */
  reactProp?: string
}

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
  category?:
    | 'actions'
    | 'content'
    | 'feedback'
    | 'forms'
    | 'layout'
    | 'navigation'
    | 'overlays'
    | 'tooling'

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
