import { pickWithInput } from '../files/web.js'
import type { Camera } from './contract.generated.js'
import { camera, setCamera } from './index.js'
import { serverCamera } from './server.js'

/**
 * Takes a photo, or chooses photos, through a file input that asks for an
 * image, so the browser draws its own camera and library.
 *
 * **A capture asks for the camera that faces away from the reader** with the
 * input's `capture`. A phone's browser opens its camera, and a browser
 * without one opens its file chooser, limited to images. No camera stream is
 * drawn by the page, so the page asks for no camera permission of its own.
 *
 * **Call it from a press.** A browser opens its chooser only during a
 * reader's own gesture.
 */
export const webCamera: Camera = {
  capture: () => pickWithInput({ accept: ['image/*'], capture: 'environment', multiple: false }),
  choose: (multiple) => pickWithInput({ accept: ['image/*'], multiple }),
}

/**
 * Sets the browser's camera as the capability where nothing has set one
 * yet, and leaves a fake or an app's own in place. Off a page, the server's
 * stays.
 */
export const installWebCamera = (): void => {
  if (camera() === serverCamera && typeof document !== 'undefined') {
    setCamera(webCamera)
  }
}
