import { oneOf } from '../../../render.js'
import { token } from '../../../style.js'
import { styles } from '../../../table.js'
import route from './headless.js'

/**
 * Map Route's styled tier: the line's color and its edge's, which the frame reads, and no box: the brand where no tone says otherwise, and the surface as the edge drawn wider under it.
 */
export default styles(
  route,
  {
    prefix: 'map-route',
    hooks: {
      casingColor: token('color-surface'),
      color: token('color-primary'),
    },
    props: {
      tone: oneOf(['accent', 'danger', 'info', 'neutral', 'primary', 'success', 'warning']),
      stroke: oneOf(['dotted']),
    },
    stylesheet: 'map/route/map-route.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({
        borderColor: hook.casingColor,
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
