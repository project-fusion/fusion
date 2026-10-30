/*
 * The video events: one class each, typed on `addEventListener` for the
 * video element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixNextEvent } from './next.js'
import { HelixPreviousEvent } from './previous.js'

export type { SkipDetail } from './details.js'
export { HelixNextEvent, HelixPreviousEvent }

const registry = {
  HelixNextEvent,
  HelixPreviousEvent,
} as const

type Registry = typeof registry

type VideoEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends VideoEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
