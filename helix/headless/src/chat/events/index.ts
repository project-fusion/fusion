/*
 * The chat events: one class each, typed on `addEventListener` for the
 * chat element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixHistoryEvent } from './history.js'
import { HelixSendEvent } from './send.js'
import { HelixStopEvent } from './stop.js'
import { HelixTypingEvent } from './typing.js'

export type { SendDetail, TypingDetail } from './details.js'
export { HelixHistoryEvent, HelixSendEvent, HelixStopEvent, HelixTypingEvent }

const registry = {
  HelixHistoryEvent,
  HelixSendEvent,
  HelixStopEvent,
  HelixTypingEvent,
} as const

type Registry = typeof registry

type ChatEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends ChatEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
