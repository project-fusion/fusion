import type { ExportDetail } from './details.js'

/**
 * The table made a file of its rows, and the browser is saving it.
 *
 * The notification after `helix-before-export`, sent when nobody refused it.
 * Not cancelable: the decision was the request's.
 */
export class HelixExportEvent extends CustomEvent<ExportDetail> {
  static readonly eventName = 'helix-export'

  constructor(detail: ExportDetail) {
    super(HelixExportEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
