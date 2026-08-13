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
  tagName?: string
}

export interface HelixModule {
  declarations?: HelixDeclaration[]
  path?: string
}

export interface HelixManifest {
  modules?: HelixModule[]
}

/** A problem found by a validating plugin. */
export interface Violation {
  message: string
  module: string
  rule: string
  subject: string
}

/** True for any class declaration, registered or not. */
export const isComponent = (declaration: HelixDeclaration): boolean => declaration.kind === 'class'

/** True only for declarations that register themselves as a custom element. */
export const isCustomElement = (declaration: HelixDeclaration): boolean =>
  isComponent(declaration) && declaration.customElement === true

/**
 * Every Helix component in a manifest, paired with its module.
 *
 * Yields unregistered classes too, which is what lets the headless tier be
 * analyzed, documented, and linted on the same footing as the styled tier.
 */
export const eachComponent = function* (
  manifest: HelixManifest,
): Generator<{ declaration: HelixDeclaration; module: HelixModule }> {
  for (const module of manifest.modules ?? []) {
    for (const declaration of module.declarations ?? []) {
      if (isComponent(declaration)) {
        yield { declaration, module }
      }
    }
  }
}
