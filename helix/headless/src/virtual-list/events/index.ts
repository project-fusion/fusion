/*
 * The virtual-list events: one class each, typed on `addEventListener` for the
 * virtual-list element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixRangeChangeEvent } from './range-change.js'

export type { RangeDetail } from './details.js'
export { HelixRangeChangeEvent }

const registry = {
  HelixRangeChangeEvent,
} as const

type Registry = typeof registry

type VirtualListEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends VirtualListEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
