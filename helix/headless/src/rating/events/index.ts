/*
 * The rating events: one class each, typed on `addEventListener` for the
 * rating element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixPreviewEvent } from './preview.js'

export { HelixPreviewEvent }

const registry = {
  HelixPreviewEvent,
} as const

type Registry = typeof registry

type RatingEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends RatingEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
