import type { DeviceScrollDetail } from './details.js'

/**
 * A wheel or a trackpad scrolled over Device Screen. Scroll the device in
 * response.
 *
 * The distance is in device units and keeps the wheel's sense, so a positive
 * `deltaY` asks for what is further down. A source that scrolls by swiping
 * moves a finger the other way. Not cancelable: the frame has already kept the
 * scroll from the page.
 */
export class HelixDeviceScrollEvent extends CustomEvent<DeviceScrollDetail> {
  static readonly eventName = 'helix-device-scroll'

  constructor(detail: DeviceScrollDetail) {
    super(HelixDeviceScrollEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
