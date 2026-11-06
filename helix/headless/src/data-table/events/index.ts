/*
 * The Data Table events: one class each, typed on `addEventListener` for the
 * table and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixBeforeColumnToggleEvent } from './before-column-toggle.js'
import { HelixBeforeExportEvent } from './before-export.js'
import { HelixBeforeFollowEvent } from './before-follow.js'
import { HelixBeforeViewChangeEvent } from './before-view-change.js'
import { HelixColumnToggleEvent } from './column-toggle.js'
import { HelixExportEvent } from './export.js'
import { HelixFollowEvent } from './follow.js'
import { HelixViewChangeEvent } from './view-change.js'

export type { ColumnToggleDetail, ExportDetail, FollowDetail, ViewChangeDetail } from './details.js'
export {
  HelixBeforeColumnToggleEvent,
  HelixBeforeExportEvent,
  HelixBeforeFollowEvent,
  HelixBeforeViewChangeEvent,
  HelixColumnToggleEvent,
  HelixExportEvent,
  HelixFollowEvent,
  HelixViewChangeEvent,
}

const registry = {
  HelixBeforeColumnToggleEvent,
  HelixBeforeExportEvent,
  HelixBeforeFollowEvent,
  HelixBeforeViewChangeEvent,
  HelixColumnToggleEvent,
  HelixExportEvent,
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
