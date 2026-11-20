import { oneOf } from '../../../render.js'
import { token } from '../../../style.js'
import { styles } from '../../../table.js'
import area from './headless.js'

/**
 * Map Area's styled tier: a color the frame reads, and no box: the brand where no tone says otherwise, as a marker's point is.
 */
export default styles(
  area,
  {
    prefix: 'map-area',
    hooks: {
      color: token('color-primary'),
    },
    props: {
      tone: oneOf(['accent', 'danger', 'info', 'neutral', 'primary', 'success', 'warning']),
    },
    stylesheet: 'map/area/map-area.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({
        color: hook.color,
        display: 'none',
      }),
      rule({ tone: 'accent' }, { color: token('color-accent') }),
      rule({ tone: 'danger' }, { color: token('color-danger') }),
      rule({ tone: 'info' }, { color: token('color-info') }),
      rule({ tone: 'neutral' }, { color: token('color-foreground-muted') }),
      rule({ tone: 'success' }, { color: token('color-success') }),
      rule({ tone: 'warning' }, { color: token('color-warning') }),
    ]),
  ],
)
