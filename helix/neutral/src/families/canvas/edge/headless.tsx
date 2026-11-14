import { headless, oneOf, string } from '../../../render.js'

/**
 * Canvas Edge's headless tier: a connection the board draws from one card
 * to another.
 *
 * **It draws nothing itself**, on either platform. The board reads each
 * connection, works out the line it is drawn along from core's `connector`,
 * and draws it with the target that takes focus and presses, its arrowheads,
 * and its label.
 *
 * **Held to `helix-canvas-edge`.**
 */
export default headless('canvas-edge', {
  props: {
    from: '',
    fromEnd: oneOf(['arrow', 'none']),
    fromSide: oneOf(['bottom', 'left', 'right', 'top']),
    label: string(),
    name: '',
    path: oneOf(['step', 'straight']),
    readonly: false,
    stroke: oneOf(['dashed', 'dotted']),
    to: '',
    toEnd: oneOf(['arrow', 'none']),
    tone: oneOf(['accent', 'danger', 'info', 'neutral', 'primary', 'success', 'warning']),
    toSide: oneOf(['bottom', 'left', 'right', 'top']),
  },
  events: {},
  states: ['settled'],
  render: () => <></>,
})
