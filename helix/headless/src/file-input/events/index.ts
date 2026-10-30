/*
 * The file-input events: one class each, typed on `addEventListener` for the
 * file-input element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixRejectEvent } from './reject.js'

export type { Refusal, RefusedFile, RejectDetail } from './details.js'
export { HelixRejectEvent }

const registry = {
  HelixRejectEvent,
} as const

type Registry = typeof registry

type FileInputEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends FileInputEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
