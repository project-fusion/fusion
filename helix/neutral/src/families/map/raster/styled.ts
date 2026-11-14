import { styles } from '../../../table.js'
import raster from './headless.js'

/**
 * Map Raster's styled tier: no box: the tiles carry their own colors.
 */
export default styles(
  raster,
  {
    prefix: 'map-raster',
    stylesheet: 'map/raster/map-raster.generated.css',
  },
  ({ on, rule }) => [
    on('host', [
      rule({
        display: 'none',
      }),
    ]),
  ],
)
