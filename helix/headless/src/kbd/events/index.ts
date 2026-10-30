/*
 * The kbd events: one class each, typed on `addEventListener` for the
 * kbd element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixShortcutEvent } from './shortcut.js'

export type { ShortcutDetail } from './details.js'
export { HelixShortcutEvent }

const registry = {
  HelixShortcutEvent,
} as const

type Registry = typeof registry

type KbdEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends KbdEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
