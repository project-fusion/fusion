/*
 * The aura events: one class each, typed on `addEventListener` for the
 * aura element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixAuraFallbackEvent } from './aura-fallback.js'

export type { AuraFallbackDetail } from './details.js'
export { HelixAuraFallbackEvent }

const registry = {
  HelixAuraFallbackEvent,
} as const

type Registry = typeof registry

type AuraEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends AuraEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
