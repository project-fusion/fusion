import type { DeviceKeyDetail } from './details.js'

/**
 * A key went down or came up while Device Screen had focus. Press or release
 * it on the device in response.
 *
 * **Every key is sent twice, down and up, as a hardware keyboard sends it.**
 * The device's own input method turns the presses into text, so a language
 * that composes characters composes them on the device. `code` names the
 * physical key, for a source that injects key codes, and `key` names what the
 * press produced, for a source that types text. Not cancelable: the frame has
 * already kept the press from the page.
 */
export class HelixDeviceKeyEvent extends CustomEvent<DeviceKeyDetail> {
  static readonly eventName = 'helix-device-key'

  constructor(detail: DeviceKeyDetail) {
    super(HelixDeviceKeyEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
