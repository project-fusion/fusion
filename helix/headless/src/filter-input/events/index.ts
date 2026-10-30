/*
 * The filter-input events: one class each, typed on `addEventListener` for the
 * filter-input element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixBeforeFacetEvent } from './before-facet.js'
import { HelixFacetEvent } from './facet.js'

export type { FacetDetail } from './details.js'
export { HelixBeforeFacetEvent, HelixFacetEvent }

const registry = {
  HelixBeforeFacetEvent,
  HelixFacetEvent,
} as const

type Registry = typeof registry

type FilterInputEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends FilterInputEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
