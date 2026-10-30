/*
 * The combobox events: one class each, typed on `addEventListener` for the
 * combobox element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixCreateEvent } from './create.js'

export type { CreateDetail } from './details.js'
export { HelixCreateEvent }

const registry = {
  HelixCreateEvent,
} as const

type Registry = typeof registry

type ComboboxEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends ComboboxEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
