/*
 * The device-screen events: one class each, typed on `addEventListener` for the
 * device-screen element and registered with core's list of names.
 */
import { registerEventNames } from '@fusion.dev/helix-core'
import { HelixDeviceButtonEvent } from './device-button.js'
import { HelixDeviceKeyEvent } from './device-key.js'
import { HelixDeviceScreenshotEvent } from './device-screenshot.js'
import { HelixDeviceScrollEvent } from './device-scroll.js'
import { HelixDeviceSwipeEvent } from './device-swipe.js'
import { HelixDeviceTapEvent } from './device-tap.js'
import { HelixDeviceTextEvent } from './device-text.js'
import { HelixDeviceTouchEvent } from './device-touch.js'

export type {
  DeviceButton,
  DeviceButtonDetail,
  DeviceKeyDetail,
  DeviceScrollDetail,
  DeviceSwipeDetail,
  DeviceTapDetail,
  DeviceTextDetail,
  DeviceTouchDetail,
} from './details.js'
export {
  HelixDeviceButtonEvent,
  HelixDeviceKeyEvent,
  HelixDeviceScreenshotEvent,
  HelixDeviceScrollEvent,
  HelixDeviceSwipeEvent,
  HelixDeviceTapEvent,
  HelixDeviceTextEvent,
  HelixDeviceTouchEvent,
}

const registry = {
  HelixDeviceButtonEvent,
  HelixDeviceKeyEvent,
  HelixDeviceScreenshotEvent,
  HelixDeviceScrollEvent,
  HelixDeviceSwipeEvent,
  HelixDeviceTapEvent,
  HelixDeviceTextEvent,
  HelixDeviceTouchEvent,
} as const

type Registry = typeof registry

type DeviceScreenEventMap = {
  [K in keyof Registry as Registry[K]['eventName']]: InstanceType<Registry[K]>
}

declare global {
  interface HTMLElementEventMap extends DeviceScreenEventMap {}
}

registerEventNames(Object.values(registry).map((one) => one.eventName))
