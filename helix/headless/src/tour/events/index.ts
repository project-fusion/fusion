/*
 * The tour events: one class each, typed on `addEventListener` for the
 * tour element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixTourAskEvent } from './tour-ask.js'
import { HelixTourStatusEvent } from './tour-status.js'

export type { TourAskDetail, TourStatusDetail } from './details.js'
export { HelixTourAskEvent, HelixTourStatusEvent }

const registry = {
  HelixTourAskEvent,
  HelixTourStatusEvent,
} as const

type Registry = typeof registry

type TourEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends TourEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
