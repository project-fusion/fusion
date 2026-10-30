/*
 * The strands events: one class each, typed on `addEventListener` for the
 * strands element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixStrandsFallbackEvent } from './strands-fallback.js'

export type { StrandsFallbackDetail } from './details.js'
export { HelixStrandsFallbackEvent }

const registry = {
  HelixStrandsFallbackEvent,
} as const

type Registry = typeof registry

type StrandsEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends StrandsEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
