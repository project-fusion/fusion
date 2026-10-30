/*
 * The map events: one class each, typed on `addEventListener` for the
 * map element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixMapClusterEvent } from './map-cluster.js'
import { HelixMapPanEvent } from './map-pan.js'
import { HelixMapPartChangeEvent } from './map-part-change.js'
import { HelixMapReadyEvent } from './map-ready.js'
import { HelixMapRotateEvent } from './map-rotate.js'
import { HelixMapTiltEvent } from './map-tilt.js'
import { HelixMapZoomEvent } from './map-zoom.js'

export type {
  MapClusterDetail,
  MapPanDetail,
  MapPartChangeDetail,
  MapRotateDetail,
  MapTiltDetail,
  MapZoomDetail,
} from './details.js'
export {
  HelixMapClusterEvent,
  HelixMapPanEvent,
  HelixMapPartChangeEvent,
  HelixMapReadyEvent,
  HelixMapRotateEvent,
  HelixMapTiltEvent,
  HelixMapZoomEvent,
}

const registry = {
  HelixMapClusterEvent,
  HelixMapPanEvent,
  HelixMapPartChangeEvent,
  HelixMapReadyEvent,
  HelixMapRotateEvent,
  HelixMapTiltEvent,
  HelixMapZoomEvent,
} as const

type Registry = typeof registry

type MapEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends MapEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
