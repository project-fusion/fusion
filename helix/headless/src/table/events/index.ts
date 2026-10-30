/*
 * The table events: one class each, typed on `addEventListener` for the
 * table element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixBeforeExpandEvent } from './before-expand.js'

export { HelixBeforeExpandEvent }

const registry = {
  HelixBeforeExpandEvent,
} as const

type Registry = typeof registry

type TableEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends TableEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
