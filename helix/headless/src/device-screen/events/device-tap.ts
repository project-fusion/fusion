import type { DeviceTapDetail } from './details.js'

/**
 * One finger touched Device Screen and lifted near where it landed. Tap the
 * device in response.
 *
 * **For a source that takes whole gestures**, as `helix-device-swipe` is. A
 * long press is a tap with a long `duration`, which a source holds for that
 * long. Not cancelable: nothing in Helix acts on it.
 */
export class HelixDeviceTapEvent extends CustomEvent<DeviceTapDetail> {
  static readonly eventName = 'helix-device-tap'

  constructor(detail: DeviceTapDetail) {
    super(HelixDeviceTapEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
