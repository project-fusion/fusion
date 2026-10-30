/*
 * What the device-screen events carry: the shape of each one's `detail`.
 *
 * Types only, so this module is empty at runtime.
 */

/** A hardware button Device Screen draws, named for what it does on the device. */
export type DeviceButton =
  | 'back'
  | 'home'
  | 'power'
  | 'recents'
  | 'rotate-left'
  | 'rotate-right'
  | 'volume-down'
  | 'volume-up'

/** Detail carried by `helix-device-button`. */
export interface DeviceButtonDetail {
  /** Which button was pressed. */
  button: DeviceButton
  /**
   * How long the button was held, in milliseconds. `0` for a press from a key
   * or a script, which has no length.
   */
  duration: number
}

/** Detail carried by `helix-device-key`. */
export interface DeviceKeyDetail {
  /** Whether Alt, or Option on a Mac, was held. */
  altKey: boolean
  /** The physical key, as `KeyboardEvent.code` names it: `KeyA`, `Enter`, `ArrowLeft`. */
  code: string
  /** Whether Control was held. */
  ctrlKey: boolean
  /** What the press produced, as `KeyboardEvent.key` names it: `a`, `A`, `Enter`. */
  key: string
  /** Whether Command on a Mac, or the Windows key, was held. */
  metaKey: boolean
  /** Whether the key went down or came up. */
  phase: 'down' | 'up'
  /** Whether the press is the key repeating while it is held. */
  repeat: boolean
  /** Whether Shift was held. */
  shiftKey: boolean
}

/** Detail carried by `helix-device-scroll`. */
export interface DeviceScrollDetail {
  /** How far across, in device units, in the wheel's sense: positive scrolls toward the right. */
  deltaX: number
  /** How far down, in device units, in the wheel's sense: positive scrolls toward the bottom. */
  deltaY: number
  /** The screen's height in the units the point is measured in. */
  height: number
  /** The screen's width in the units the point is measured in. */
  width: number
  /** Where the pointer is, across from the screen's left edge. */
  x: number
  /** Where the pointer is, down from the screen's top edge. */
  y: number
}

/** Detail carried by `helix-device-swipe`. */
export interface DeviceSwipeDetail {
  /** How long the finger was down, in milliseconds. */
  duration: number
  /** Where the touch began, across from the screen's left edge. */
  fromX: number
  /** Where the touch began, down from the screen's top edge. */
  fromY: number
  /** The screen's height in the units the points are measured in. */
  height: number
  /** Where the touch ended, across from the screen's left edge. */
  toX: number
  /** Where the touch ended, down from the screen's top edge. */
  toY: number
  /** The screen's width in the units the points are measured in. */
  width: number
}

/** Detail carried by `helix-device-tap`. */
export interface DeviceTapDetail {
  /** How long the finger was down, in milliseconds. A long press is a long tap. */
  duration: number
  /** The screen's height in the units the point is measured in. */
  height: number
  /** The screen's width in the units the point is measured in. */
  width: number
  /** Where the tap was, across from the screen's left edge. */
  x: number
  /** Where the tap was, down from the screen's top edge. */
  y: number
}

/** Detail carried by `helix-device-text`. */
export interface DeviceTextDetail {
  /** The text, as plain text. */
  text: string
}

/** Detail carried by `helix-device-touch`. */
export interface DeviceTouchDetail {
  /** The screen's height in the units the point is measured in. */
  height: number
  /**
   * Which finger, counting from `0`. A finger keeps its number until it lifts,
   * and the lowest free number goes to the next finger down.
   */
  id: number
  /**
   * Where the touch is in its life: `down` as the finger lands, `move` as it
   * moves, `up` as it lifts, and `cancel` when the browser takes the touch
   * away, which ends it without a lift.
   */
  phase: 'cancel' | 'down' | 'move' | 'up'
  /** The screen's width in the units the point is measured in. */
  width: number
  /** Where the finger is, across from the screen's left edge. */
  x: number
  /** Where the finger is, down from the screen's top edge. */
  y: number
}
