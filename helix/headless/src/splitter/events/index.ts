/*
 * The splitter events: one class each, typed on `addEventListener` for the
 * splitter element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixBeforeCollapseEvent } from './before-collapse.js'
import { HelixCollapseEvent } from './collapse.js'

export { HelixBeforeCollapseEvent, HelixCollapseEvent }

const registry = {
  HelixBeforeCollapseEvent,
  HelixCollapseEvent,
} as const

type Registry = typeof registry

type SplitterEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends SplitterEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
