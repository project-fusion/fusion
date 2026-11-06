import type { ViewSaveDetail } from './details.js'

/**
 * A reader asked to save the table's view, with Save view.
 *
 * Cancelable: cancel it to keep the view yourself, in your own store, and
 * nothing is kept in the browser. Left alone, with `view-key` set, the view
 * is kept in browser storage and drawn as a preset.
 *
 * @followedBy helix-view-save
 */
export class HelixBeforeViewSaveEvent extends CustomEvent<ViewSaveDetail> {
  static readonly eventName = 'helix-before-view-save'

  constructor(detail: ViewSaveDetail) {
    super(HelixBeforeViewSaveEvent.eventName, {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
    })
  }
}
