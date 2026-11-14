/*
 * The sandbox events: one class each, typed on `addEventListener` for the
 * sandbox element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixBeforeEditEvent } from './before-edit.js'
import { HelixBeforePanelResizeEvent } from './before-panel-resize.js'
import { HelixBeforeSplitEvent } from './before-split.js'
import { HelixCaretEvent } from './caret.js'
import { HelixConsoleEvent } from './console.js'
import { HelixEditEvent } from './edit.js'
import { HelixPanelResizeEvent } from './panel-resize.js'
import { HelixSplitEvent } from './split.js'

export type { CaretDetail, ConsoleDetail } from './details.js'
export {
  HelixBeforeEditEvent,
  HelixBeforePanelResizeEvent,
  HelixBeforeSplitEvent,
  HelixCaretEvent,
  HelixConsoleEvent,
  HelixEditEvent,
  HelixPanelResizeEvent,
  HelixSplitEvent,
}

const registry = {
  HelixBeforeEditEvent,
  HelixBeforePanelResizeEvent,
  HelixBeforeSplitEvent,
  HelixCaretEvent,
  HelixConsoleEvent,
  HelixEditEvent,
  HelixPanelResizeEvent,
  HelixSplitEvent,
} as const

type Registry = typeof registry

type SandboxEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends SandboxEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
