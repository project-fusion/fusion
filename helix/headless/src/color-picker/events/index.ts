/*
 * The color-picker events: one class each, typed on `addEventListener` for the
 * color-picker element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixSampleEndEvent } from './sample-end.js'
import { HelixSampleStartEvent } from './sample-start.js'

export { HelixSampleEndEvent, HelixSampleStartEvent }

const registry = {
  HelixSampleEndEvent,
  HelixSampleStartEvent,
} as const

type Registry = typeof registry

type ColorPickerEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends ColorPickerEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
