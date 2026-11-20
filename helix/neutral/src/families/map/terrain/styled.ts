import { mix, token } from '../../../style.js'
import { styles } from '../../../table.js'
import terrain from './headless.js'

/**
 * Map Terrain's styled tier: the shadow's and the highlight's colors, which the frame reads, and no box: the media colors, black and white in both modes.
 */
export default styles(
  terrain,
  {
    prefix: 'map-terrain',
    hooks: {
      highlightColor: mix(token('color-foreground-media'), 25, 'transparent'),
      shadowColor: mix(token('color-surface-media'), 40, 'transparent'),
    },
    stylesheet: 'map/terrain/map-terrain.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({
        borderBlockStartColor: hook.highlightColor,
        color: hook.shadowColor,
        display: 'none',
      }),
    ]),
  ],
)
