import type { DeviceTextDetail } from './details.js'

/**
 * Text was pasted into Device Screen. Type it on the device in response.
 *
 * **Pasted text has no key presses of its own**, so it arrives whole, in one
 * event. Command or Control with V pastes in every mode, `forward-shortcuts`
 * included. Not cancelable: the frame has
 * already kept the paste from the page.
 */
export class HelixDeviceTextEvent extends CustomEvent<DeviceTextDetail> {
  static readonly eventName = 'helix-device-text'

  constructor(detail: DeviceTextDetail) {
    super(HelixDeviceTextEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
