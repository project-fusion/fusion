/*
 * The Data Table events: one class each, typed on `addEventListener` for the
 * table and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixBeforeColumnToggleEvent } from './before-column-toggle.js'
import { HelixBeforeFollowEvent } from './before-follow.js'
import { HelixColumnToggleEvent } from './column-toggle.js'
import { HelixFollowEvent } from './follow.js'

export type { ColumnToggleDetail, FollowDetail } from './details.js'
export {
  HelixBeforeColumnToggleEvent,
  HelixBeforeFollowEvent,
  HelixColumnToggleEvent,
  HelixFollowEvent,
}

const registry = {
  HelixBeforeColumnToggleEvent,
  HelixBeforeFollowEvent,
  HelixColumnToggleEvent,
  HelixFollowEvent,
} as const

type Registry = typeof registry

type DataTableEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends DataTableEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
