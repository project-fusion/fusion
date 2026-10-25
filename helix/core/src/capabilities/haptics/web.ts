import type { Haptics } from './contract.generated.js'

/**
 * Plays nothing, by design.
 *
 * **The web has no touch to match the kinds a host asks for.** Its one call,
 * `navigator.vibrate`, runs the device's motor for a number of milliseconds.
 * It has no light tick for a row passing another, Safari on iOS does not
 * implement it, and on a desktop there is no motor to run. A buzz on some
 * phones and nothing on the rest would make one interface feel different on
 * each device.
 *
 * On the web, a host shows a change in what it draws and says it to a screen
 * reader through the announce capability.
 */
export const webHaptics: Haptics = {
  play: () => undefined,
}
