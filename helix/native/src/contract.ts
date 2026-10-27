/**
 * The runtime contract: what the output of the family compiler needs from the
 * runtime a design system draws with.
 *
 * **A design system names its runtime in its `helix.family.json`.** Its
 * `runtime.native` is the module each native component imports, and Helix's
 * own runtime, `@fusion.dev/helix-native`, is the default. A design system
 * can build on Helix's runtime, or write a runtime of its own that exports
 * what this module types.
 *
 * **This module is types alone.** It imports nothing at run time, so a
 * runtime of another design system can depend on it with `import type` and
 * carry nothing of Helix's into its bundle. `tests/contract/provides.ts`
 * holds Helix's runtime to it.
 *
 * **On the web the compiler writes stylesheets and no code**, so the web's
 * half of the contract is what the element that adopts a stylesheet draws,
 * which a type cannot hold. `helix/neutral/DESIGN-SYSTEMS.md` lists it:
 * the form's tag, each prop reflected as its attribute, each custom state set
 * in its `ElementInternals`, the form's tree in its shadow root, and each
 * event under the design system's event prefix. Helix's elements meet it by
 * extending `HelixElement` in `@fusion.dev/helix-core`.
 */
import type { ComponentType, ReactNode } from 'react'
import type { Family } from './style/form'

export type { Family }

/** What a native component takes: its props, its regions, and its handlers. */
export type ComponentProps = Readonly<Record<string, unknown>>

/**
 * The hook an element's machines run in, as `behaviorFor` makes it. What it
 * returns is the runtime's own: `element` is the one that reads it.
 */
export type UseBehavior<Behavior> = (family: Family, props: ComponentProps) => Behavior

/**
 * What a native component module imports by value from the runtime. Each
 * module calls one of these once for each element, as the module is loaded.
 */
export interface NativeRuntime<Behavior = unknown> {
  /**
   * The hook that runs the machines the form's `machines` names, each bound
   * as the form says. A machine the runtime does not draw binds nothing.
   */
  readonly behaviorFor: (family: Family) => UseBehavior<Behavior>
  /**
   * The component that draws an element from its form: its part tree, the
   * rules of its style table that hold, and the behavior `useBehavior`
   * returns.
   */
  readonly element: (
    family: Family,
    useBehavior?: UseBehavior<Behavior>,
  ) => ComponentType<ComponentProps>
  /** The component of an element only the web has, which draws nothing. */
  readonly webOnly: (family: Family) => ComponentType<ComponentProps>
}

/**
 * The event a native handler hears, in the web event's shape. The runtime
 * exports it under the name `runtime.eventType` gives, `HelixEvent` for
 * Helix's runtime, and each module re-exports it.
 */
export interface ElementEvent<
  Detail extends object = Readonly<Record<string, unknown>>,
  Target extends object = Record<never, never>,
> {
  /** Whether a handler refused the event. */
  readonly defaultPrevented: boolean
  /** What the event carries, by the field names the web's detail has. */
  readonly detail: Detail
  /** The element that sent the event, by what a web handler reads from `event.target`. */
  readonly target: Target
  /** The same as `target`, as `event.currentTarget` is on the web. */
  readonly currentTarget: Target
  /** Refuses the event, as the web's `preventDefault()` does. */
  preventDefault(): void
}

/**
 * An event the web sends as the platform's own, which carries its detail's
 * fields on itself as well. The runtime exports it as `PlatformEvent`.
 */
export type PlatformElementEvent<
  Detail extends object = Readonly<Record<string, unknown>>,
  Target extends object = Record<never, never>,
> = ElementEvent<Detail, Target> & Readonly<Detail>

/**
 * A form control's handle, which its `ref` holds. The runtime exports it as
 * `FieldHandle`.
 */
export interface FieldHandleContract {
  /** Shows what is wrong with the answer, and returns whether it is acceptable. */
  readonly validate: () => boolean
}

/** Each token's value as the native theme takes it, by its name without its prefix. */
export type TokenValues = Readonly<Record<string, number | string>>

/**
 * What the component an app wraps itself in takes, which `runtime.layerHost`
 * names: `HelixRoot` for Helix's runtime. It draws each layer an element
 * opens, and the theme the elements draw with, which `tokens` lays a design
 * system's own values over.
 */
export interface LayerHostProps {
  readonly children?: ReactNode
  readonly tokens?: { readonly dark?: TokenValues; readonly light?: TokenValues }
}
