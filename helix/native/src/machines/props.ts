import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import { givesInto } from './gives'

/** A prop's name as React spells it: `pending-label` is `pendingLabel`. */
export const camel = (name: string): string =>
  name.replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase())

/**
 * Platform events named as two words run together, as React spells them. The
 * same list as `REACT_CASING` in `@fusion.dev/helix-core`, so a handler is
 * `onScrollEnd` on both platforms.
 */
const JOINED: Readonly<Record<string, string>> = {
  canplay: 'onCanPlay',
  canplaythrough: 'onCanPlayThrough',
  durationchange: 'onDurationChange',
  loadeddata: 'onLoadedData',
  loadedmetadata: 'onLoadedMetadata',
  loadstart: 'onLoadStart',
  ratechange: 'onRateChange',
  scrollend: 'onScrollEnd',
  timeupdate: 'onTimeUpdate',
  volumechange: 'onVolumeChange',
}

/** The handler a consumer hears an event through: `before-reorder` is `onBeforeReorder`. */
export const handlerOf = (event: string): string =>
  JOINED[event] ?? `on${event.charAt(0).toUpperCase()}${camel(event).slice(1)}`

/** What the element's prop says: what the consumer gave it, or else its default. */
export const given = (family: Family, props: Props, name: string | undefined): unknown => {
  if (name === undefined) {
    return undefined
  }
  const set = props[camel(name)]
  return set === undefined ? family.api?.props.find((prop) => prop.name === name)?.default : set
}

/**
 * An event as a native handler hears it, in the web event's shape: what it
 * carries under `detail`, the element that sent it under `target`, and a way
 * to refuse it. A handler that reads `event.detail` or `event.target.value`
 * reads the same fields on both platforms.
 */
export interface HelixEvent<
  Detail extends object = Readonly<Record<string, unknown>>,
  Target extends object = Record<never, never>,
> {
  /** Whether a handler refused the event. */
  readonly defaultPrevented: boolean
  /** What the event carries, by the field names the web's detail has. */
  readonly detail: Detail
  /**
   * The element that sent the event, by what a web handler reads from
   * `event.target`: its `value`, where the element has one, whether it is
   * `checked`, where it turns on and off, and `naturalWidth` and
   * `naturalHeight`, where it loads a picture.
   */
  readonly target: Target
  /**
   * The same as `target`, as a web handler on the element that sent the
   * event reads it from `event.currentTarget`.
   */
  readonly currentTarget: Target
  /** Refuses the event, as the web's `preventDefault()` does. */
  preventDefault(): void
}

/**
 * What an event's `target` carries of the element that sent it: its `value`,
 * whether it is `checked`, where it turns on and off, and a picture's natural
 * size, where it loads one.
 */
export type Sender = Readonly<{
  checked?: boolean
  naturalHeight?: number
  naturalWidth?: number
  value?: string
}>

/** What an event's `target` carries where the element that sent it has no value. */
const NOBODY: Sender = {}

/**
 * What `target` carries of an element `family` draws whose value is
 * `value`: the value, where the element has a `value` prop a phone has.
 */
export const senderOf = (family: Family, value: unknown): Sender =>
  family.api?.props.some((prop) => prop.name === 'value' && prop.platform === undefined) === true
    ? { value: typeof value === 'string' ? value : String(value ?? '') }
    : NOBODY

/**
 * The fields of `detail` that `family`'s form says `event` carries on a
 * phone, or every field where the form does not name the event.
 */
const declared = (
  family: Family,
  event: string,
  detail: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> => {
  const names = family.api?.events.find((one) => one.name === event)?.detail
  return names === undefined
    ? detail
    : Object.fromEntries(names.filter((name) => name in detail).map((name) => [name, detail[name]]))
}

/**
 * An event the web sends as the platform's own, as `toggle` is a
 * `ToggleEvent`, which carries its detail's fields on itself as well as
 * under `detail`, so a handler reads `event.newState` on both platforms.
 */
export type PlatformEvent<
  Detail extends object = Readonly<Record<string, unknown>>,
  Target extends object = Record<never, never>,
> = HelixEvent<Detail, Target> & Readonly<Detail>

/**
 * An event carrying `detail` and `target`, which a handler may refuse. A
 * `bare` one, the platform's own event on the web, carries the detail's
 * fields on itself too, as a `ToggleEvent` carries `newState`.
 */
export const sent = (
  detail: Readonly<Record<string, unknown>>,
  target: Sender,
  bare = false,
): HelixEvent => {
  const event = {
    ...(bare ? detail : {}),
    currentTarget: target,
    defaultPrevented: false,
    detail,
    preventDefault: () => {
      event.defaultPrevented = true
    },
    target,
  }
  return event
}

/**
 * Tells the consumer `event`, an event of `family`, through the handler its
 * name gives, and hands back the event it heard, which a later refusal can
 * still refuse, as a checkbox group refuses a box's request. The event
 * carries the fields of `detail` the form names, and `target`, what it
 * carries of the element that sent it.
 */
export const told = (
  family: Family,
  props: Props,
  event: string,
  detail: Readonly<Record<string, unknown>>,
  target: Sender = NOBODY,
): HelixEvent => {
  const bare = family.api?.events.find((one) => one.name === event)?.bare === true
  const heard = sent(declared(family, event, givesInto(family, props, event, detail)), target, bare)
  const listener = props[handlerOf(event)]
  if (typeof listener === 'function') {
    listener(heard)
  }
  return heard
}

/**
 * Tells the consumer `event`, as `told` does, and answers whether the
 * consumer let it stand: `false` where the handler refused it.
 */
export const tell = (
  family: Family,
  props: Props,
  event: string,
  detail: Readonly<Record<string, unknown>>,
  target: Sender = NOBODY,
): boolean => !told(family, props, event, detail, target).defaultPrevented

/**
 * The notification that follows the request `event` once it stands, where
 * `family` sends one: the plain verb after `before-<verb>`, as `select`
 * follows a menu row's `before-select`, and none where the family declares
 * none, as a tab sends no `select` after its `before-select`. The web
 * element sends the two as one grammar: the request may be refused, and the
 * notification says the change stood.
 */
export const followUpOf = (family: Family, event: string): string | undefined => {
  if (!event.startsWith('before-')) {
    return undefined
  }
  const plain = event.slice('before-'.length)
  const declared = family.api?.events.find((one) => one.name === plain)
  return declared === undefined || declared.cancelable ? undefined : plain
}

/**
 * The events a machine's binding names, in the order they are sent: one,
 * several, or none.
 */
export const eventsOf = (use: MachineUse, name: string): readonly string[] => {
  const bound = use.bind[name] as Readonly<Record<string, unknown>> | undefined
  const many = bound?.events
  if (Array.isArray(many)) {
    return many.filter((event): event is string => typeof event === 'string')
  }
  return typeof bound?.event === 'string' ? [bound.event] : []
}

/** What a machine's binding names, where it names one of `kind`. */
export const boundTo = (
  use: MachineUse,
  name: string,
  kind: 'derive' | 'event' | 'held' | 'key' | 'part' | 'prop' | 'region' | 'state',
): string | undefined => {
  const bound = use.bind[name] as Readonly<Record<string, string>> | undefined
  return bound?.[kind]
}
