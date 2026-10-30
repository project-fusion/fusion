/*
 * The graph events: one class each, typed on `addEventListener` for the
 * graph element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixBeforeGraphFilterEvent } from './before-graph-filter.js'
import { HelixGraphFilterEvent } from './graph-filter.js'
import { HelixGraphLayoutEvent } from './graph-layout.js'
import { HelixGraphPanEvent } from './graph-pan.js'
import { HelixGraphPartChangeEvent } from './graph-part-change.js'
import { HelixGraphReadyEvent } from './graph-ready.js'
import { HelixGraphSignalEvent } from './graph-signal.js'
import { HelixGraphZoomEvent } from './graph-zoom.js'

export type {
  GraphFilterDetail,
  GraphLayoutDetail,
  GraphPartChangeDetail,
  GraphSignalDetail,
} from './details.js'
export {
  HelixBeforeGraphFilterEvent,
  HelixGraphFilterEvent,
  HelixGraphLayoutEvent,
  HelixGraphPanEvent,
  HelixGraphPartChangeEvent,
  HelixGraphReadyEvent,
  HelixGraphSignalEvent,
  HelixGraphZoomEvent,
}

const registry = {
  HelixBeforeGraphFilterEvent,
  HelixGraphFilterEvent,
  HelixGraphLayoutEvent,
  HelixGraphPanEvent,
  HelixGraphPartChangeEvent,
  HelixGraphReadyEvent,
  HelixGraphSignalEvent,
  HelixGraphZoomEvent,
} as const

type Registry = typeof registry

type GraphEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends GraphEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
