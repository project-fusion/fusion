import type { ExportDetail } from './details.js'

/**
 * A reader asked for a file of the table's rows, or a script called
 * `download`.
 *
 * Cancelable: cancel it to make the file on your server, from the view and
 * the choices in `detail`, as a table in `server` mode has to, since it holds
 * one page. Left alone, the table makes the file and the browser saves it.
 *
 * @followedBy helix-export
 */
export class HelixBeforeExportEvent extends CustomEvent<ExportDetail> {
  static readonly eventName = 'helix-before-export'

  constructor(detail: ExportDetail) {
    super(HelixBeforeExportEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
