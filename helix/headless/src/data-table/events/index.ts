/*
 * The Data Table events: one class each, typed on `addEventListener` for the
 * table and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixBeforeColumnToggleEvent } from './before-column-toggle.js'
import { HelixBeforeFollowEvent } from './before-follow.js'
import { HelixBeforeViewChangeEvent } from './before-view-change.js'
import { HelixColumnToggleEvent } from './column-toggle.js'
import { HelixFollowEvent } from './follow.js'
import { HelixViewChangeEvent } from './view-change.js'

export type { ColumnToggleDetail, FollowDetail, ViewChangeDetail } from './details.js'
export {
  HelixBeforeColumnToggleEvent,
  HelixBeforeFollowEvent,
  HelixBeforeViewChangeEvent,
  HelixColumnToggleEvent,
  HelixFollowEvent,
  HelixViewChangeEvent,
}

const registry = {
  HelixBeforeColumnToggleEvent,
  HelixBeforeFollowEvent,
  HelixBeforeViewChangeEvent,
  HelixColumnToggleEvent,
  HelixFollowEvent,
  HelixViewChangeEvent,
} as const

type Registry = typeof registry

type DataTableEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends DataTableEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
