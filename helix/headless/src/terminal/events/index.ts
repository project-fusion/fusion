/*
 * The terminal events: one class each, typed on `addEventListener` for the
 * terminal element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixTerminalBellEvent } from './terminal-bell.js'
import { HelixTerminalInputEvent } from './terminal-input.js'
import { HelixTerminalLinkEvent } from './terminal-link.js'
import { HelixTerminalResizeEvent } from './terminal-resize.js'
import { HelixTerminalRestartEvent } from './terminal-restart.js'
import { HelixTerminalTitleEvent } from './terminal-title.js'

export type {
  TerminalInputDetail,
  TerminalLinkDetail,
  TerminalResizeDetail,
  TerminalTitleDetail,
} from './details.js'
export {
  HelixTerminalBellEvent,
  HelixTerminalInputEvent,
  HelixTerminalLinkEvent,
  HelixTerminalResizeEvent,
  HelixTerminalRestartEvent,
  HelixTerminalTitleEvent,
}

const registry = {
  HelixTerminalBellEvent,
  HelixTerminalInputEvent,
  HelixTerminalLinkEvent,
  HelixTerminalResizeEvent,
  HelixTerminalRestartEvent,
  HelixTerminalTitleEvent,
} as const

type Registry = typeof registry

type TerminalEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends TerminalEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
