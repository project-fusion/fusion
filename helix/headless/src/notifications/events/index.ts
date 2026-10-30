/*
 * The notifications events: one class each, typed on `addEventListener` for the
 * notifications element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixBeforeReadEvent } from './before-read.js'
import { HelixReadEvent } from './read.js'

export type { ReadDetail } from './details.js'
export { HelixBeforeReadEvent, HelixReadEvent }

const registry = {
  HelixBeforeReadEvent,
  HelixReadEvent,
} as const

type Registry = typeof registry

type NotificationsEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends NotificationsEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
