import type { DeviceTouchDetail } from './details.js'

/**
 * A finger landed on Device Screen, moved, lifted, or was taken away. Touch
 * the device in response.
 *
 * **For a source that takes each touch as it happens**, which is what a drag,
 * a long press that turns into a drag, and a pinch need. One event per finger
 * per step, so a pinch sends two at a time with different `id`s. A source that
 * only taps and swipes listens for `helix-device-tap` and `helix-device-swipe`
 * instead. Not cancelable: nothing in Helix acts on it.
 */
export class HelixDeviceTouchEvent extends CustomEvent<DeviceTouchDetail> {
  static readonly eventName = 'helix-device-touch'

  constructor(detail: DeviceTouchDetail) {
    super(HelixDeviceTouchEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
