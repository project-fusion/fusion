import type { ResizeDetail } from './details.js'

/**
 * Fired when something reports how much room its content actually needs.
 *
 * **A measurement crossing a boundary the measurer is on the far side of.** A
 * sandboxed preview is its own document: nothing outside it can read the height
 * of what it drew, because the frame is opaque and a box sized from the outside
 * only ever reports the box. So the document measures itself and says so, and
 * this is what it says it with.
 *
 * A number rather than a box, because the width is the container's to decide and
 * only the block size follows the content. A consumer that wants to act on it
 * clamps it: what arrives is what was drawn, which for an empty example is
 * nearly nothing and for a long one is more than a page.
 */

export class HelixResizeEvent extends CustomEvent<ResizeDetail> {
  static readonly eventName = 'helix-resize'

  constructor(detail: ResizeDetail) {
    super(HelixResizeEvent.eventName, {
      bubbles: true,
      /* Not cancelable. A measurement is not a proposal: the content is that
         tall whether or not anybody wants it to be, and neither dispatcher,
         `Heatmap` nor `Sandbox.Preview`, reads the result. Accepting
         `preventDefault()` and ignoring it is worse than refusing the call, a
         consumer having every reason to believe they had stopped something. */
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
