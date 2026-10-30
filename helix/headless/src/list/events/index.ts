/*
 * The list events: one class each, typed on `addEventListener` for the
 * list element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixActionEvent } from './action.js'

export { HelixActionEvent }

const registry = {
  HelixActionEvent,
} as const

type Registry = typeof registry

type ListEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends ListEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
