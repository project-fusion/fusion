/*
 * The meter events: one class each, typed on `addEventListener` for the
 * meter element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixBandEvent } from './band.js'

export type { BandDetail } from './details.js'
export { HelixBandEvent }

const registry = {
  HelixBandEvent,
} as const

type Registry = typeof registry

type MeterEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends MeterEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
