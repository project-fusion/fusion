/*
 * The button events: one class each, typed on `addEventListener` for the
 * button element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixPressEvent } from './press.js'

export type { PressDetail } from './details.js'
export { HelixPressEvent }

const registry = {
  HelixPressEvent,
} as const

type Registry = typeof registry

type ButtonEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends ButtonEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
