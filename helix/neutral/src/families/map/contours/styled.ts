import { token } from '../../../style.js'
import { styles } from '../../../table.js'
import contours from './headless.js'

/**
 * Map Contours's styled tier: the lines' color, which the web reads, and no box: the brown contours are printed in.
 */
export default styles(
  contours,
  {
    prefix: 'map-contours',
    hooks: {
      color: token('color-contour'),
    },
    stylesheet: 'map/contours/map-contours.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({
        color: hook.color,
        display: 'none',
      }),
    ]),
  ],
)
