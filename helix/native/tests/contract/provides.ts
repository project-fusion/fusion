/**
 * Helix's runtime held to the runtime contract, by the typecheck alone.
 *
 * **Each line fails to compile where Helix's runtime stops meeting the
 * contract**, so a change to either is a change to both. The names are the
 * ones Helix's `helix.family.json` gives in `runtime`.
 */
import {
  behaviorFor,
  type ElementEvent,
  element,
  type FieldHandle,
  type FieldHandleContract,
  type HelixEvent,
  HelixRoot,
  type HelixRootProps,
  type LayerHostProps,
  type NativeRuntime,
  type PlatformElementEvent,
  type PlatformEvent,
  webOnly,
} from '@fusion.dev/helix-native'

/** What Helix's machines hand the element that draws them. */
type Behavior = ReturnType<ReturnType<typeof behaviorFor>>

/** The values each native component module imports. */
export const provided = { behaviorFor, element, webOnly } satisfies NativeRuntime<Behavior>

/** `true` where `A` can stand where `B` is read. */
type Meets<A, B> = [A] extends [B] ? true : false

type Detail = { readonly value: string }
type Target = { readonly value: string }

/** The event type, which `runtime.eventType` names. */
export const events: Meets<HelixEvent<Detail, Target>, ElementEvent<Detail, Target>> = true

/** The platform's own events. */
export const platformEvents: Meets<
  PlatformEvent<Detail, Target>,
  PlatformElementEvent<Detail, Target>
> = true

/** A form control's handle. */
export const handles: Meets<FieldHandle, FieldHandleContract> = true

/** The layer host, which `runtime.layerHost` names, takes what the contract gives it. */
export const host: Meets<LayerHostProps, HelixRootProps> = true

/** The layer host is a component. */
export const root: (props: HelixRootProps) => unknown = HelixRoot
