import type { PlotTurnDetail } from './details.js'

/** The reader asked a 3D plot to turn by key: steps across and up, which the renderer turns by. */
export class HelixPlotTurnEvent extends CustomEvent<PlotTurnDetail> {
  static readonly eventName = 'helix-plot-turn'

  constructor(detail: PlotTurnDetail) {
    super(HelixPlotTurnEvent.eventName, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
  }
}
