import type { CopyDetail } from './details.js'

/**
 * Something was copied to the clipboard.
 *
 * Not cancelable, and deliberately: it is announced after the write, because a
 * clipboard write is a permission the platform may refuse and there is nothing
 * useful to report until it has either happened or not.
 */
export class HelixCopyEvent extends CustomEvent<CopyDetail> {
  static readonly eventName = 'helix-copy'

  constructor(detail: CopyDetail) {
    super(HelixCopyEvent.eventName, {
      bubbles: true,
      composed: true,
      detail,
    })
  }
}
