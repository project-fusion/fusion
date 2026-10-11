import type { DeviceSwipeDetail } from './details.js'

/**
 * One finger moved across Device Screen and lifted. Swipe the device in
 * response.
 *
 * **For a source that takes whole gestures**, such as a command that swipes
 * from one point to another over a length of time. A source that takes each
 * touch as it happens listens for `helix-device-touch` instead, and a page
 * that listened for both would move the device twice. A touch with more than
 * one finger sends no swipe. Not cancelable: nothing in Helix acts on it.
 */
export class HelixDeviceSwipeEvent extends CustomEvent<DeviceSwipeDetail> {
  static readonly eventName = 'helix-device-swipe'

  constructor(detail: DeviceSwipeDetail) {
    super(HelixDeviceSwipeEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
