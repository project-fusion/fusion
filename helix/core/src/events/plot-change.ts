import type { PlotChangeDetail } from './details.js'

/**
 * A plot's points or the point the keys rest on changed, which the connector
 * hears and the renderer is told. It stays on the plot, being the family's
 * own bookkeeping rather than news for a page.
 */
export class HelixPlotChangeEvent extends CustomEvent<PlotChangeDetail> {
  static readonly eventName = 'helix-plot-change'

  constructor(detail: PlotChangeDetail) {
    super(HelixPlotChangeEvent.eventName, {
      bubbles: false,
      cancelable: false,
      composed: false,
      detail,
    })
  }
}
