/*
 * The Data Table events: one class each, typed on `addEventListener` for the
 * table and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixBeforeCellCommitEvent } from './before-cell-commit.js'
import { HelixBeforeCellEditEvent } from './before-cell-edit.js'
import { HelixBeforeColumnToggleEvent } from './before-column-toggle.js'
import { HelixBeforeExportEvent } from './before-export.js'
import { HelixBeforeFollowEvent } from './before-follow.js'
import { HelixBeforeViewChangeEvent } from './before-view-change.js'
import { HelixCellCommitEvent } from './cell-commit.js'
import { HelixCellEditEvent } from './cell-edit.js'
import { HelixColumnToggleEvent } from './column-toggle.js'
import { HelixExportEvent } from './export.js'
import { HelixFollowEvent } from './follow.js'
import { HelixViewChangeEvent } from './view-change.js'

export type {
  CellCommitDetail,
  CellEditDetail,
  ColumnToggleDetail,
  ExportDetail,
  FollowDetail,
  ViewChangeDetail,
} from './details.js'
export {
  HelixBeforeCellCommitEvent,
  HelixBeforeCellEditEvent,
  HelixBeforeColumnToggleEvent,
  HelixBeforeExportEvent,
  HelixBeforeFollowEvent,
  HelixBeforeViewChangeEvent,
  HelixCellCommitEvent,
  HelixCellEditEvent,
  HelixColumnToggleEvent,
  HelixExportEvent,
  HelixFollowEvent,
  HelixViewChangeEvent,
}

const registry = {
  HelixBeforeCellCommitEvent,
  HelixBeforeCellEditEvent,
  HelixBeforeColumnToggleEvent,
  HelixBeforeExportEvent,
  HelixBeforeFollowEvent,
  HelixBeforeViewChangeEvent,
  HelixCellCommitEvent,
  HelixCellEditEvent,
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
