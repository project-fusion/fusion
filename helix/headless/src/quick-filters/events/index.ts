/*
 * The Quick Filters events: one class each, typed on `addEventListener` and
 * registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixBeforeViewSaveEvent } from './before-view-save.js'
import { HelixViewSaveEvent } from './view-save.js'

export type { ViewSaveDetail } from './details.js'
export { HelixBeforeViewSaveEvent, HelixViewSaveEvent }

const registry = {
  HelixBeforeViewSaveEvent,
  HelixViewSaveEvent,
} as const

type Registry = typeof registry

type QuickFiltersEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends QuickFiltersEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
