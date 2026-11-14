import { token } from '../../../style.js'
import { styles } from '../../../table.js'
import landcover from './headless.js'

/**
 * Map Landcover's styled tier: the land the covers are mixed into, which the frame reads, and no box: the theme's surface.
 */
export default styles(
  landcover,
  {
    prefix: 'map-landcover',
    hooks: {
      ground: token('color-surface'),
    },
    stylesheet: 'map/landcover/map-landcover.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({
        color: hook.ground,
        display: 'none',
      }),
    ]),
  ],
)
