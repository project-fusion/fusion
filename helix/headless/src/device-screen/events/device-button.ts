import type { DeviceButtonDetail } from './details.js'

/**
 * A hardware button on the device was pressed, from Device Screen's controls
 * or from `press()`. Press it on the device in response.
 *
 * **Sent once, as the button comes back up, with how long it was held.** A
 * source that presses a button for a length of time, such as holding the side
 * button for Siri, reads `duration`, and one that only presses reads nothing
 * else. Not cancelable: nothing in Helix acts on the press.
 */
export class HelixDeviceButtonEvent extends CustomEvent<DeviceButtonDetail> {
  static readonly eventName = 'helix-device-button'

  constructor(detail: DeviceButtonDetail) {
    super(HelixDeviceButtonEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
