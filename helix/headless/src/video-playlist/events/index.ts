/*
 * The video-playlist events: one class each, typed on `addEventListener` for the
 * video-playlist element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixEndEvent } from './end.js'

export { HelixEndEvent }

const registry = {
  HelixEndEvent,
} as const

type Registry = typeof registry

type VideoPlaylistEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends VideoPlaylistEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
