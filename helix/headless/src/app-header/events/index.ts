/*
 * The app-header events: one class each, typed on `addEventListener` for the
 * app-header element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixScrolledEvent } from './scrolled.js'

export type { ScrolledDetail } from './details.js'
export { HelixScrolledEvent }

const registry = {
  HelixScrolledEvent,
} as const

type Registry = typeof registry

type AppHeaderEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends AppHeaderEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
