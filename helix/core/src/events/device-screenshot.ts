/**
 * A screenshot of the device was asked for, from Device Screen's screenshot
 * button or from `screenshot()`. Take one in response.
 *
 * **A request with nothing attached.** The device's own screenshot is sharper
 * than any frame of a stream, so the page takes it the way its source allows.
 * `capture()` on the frame returns the picture on screen, for a page with no
 * better way. Not cancelable: nothing in Helix takes the screenshot.
 */
export class HelixDeviceScreenshotEvent extends Event {
  static readonly eventName = 'helix-device-screenshot'

  constructor() {
    super(HelixDeviceScreenshotEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
    })
  }
}
