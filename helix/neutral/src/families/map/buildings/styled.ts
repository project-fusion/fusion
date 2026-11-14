import { oneOf } from '../../../render.js'
import { token } from '../../../style.js'
import { styles } from '../../../table.js'
import buildings from './headless.js'

/**
 * Map Buildings's styled tier: the buildings' color, which the frame reads, and no box: the raised surface, one step off the land, where no tone says otherwise.
 */
export default styles(
  buildings,
  {
    prefix: 'map-buildings',
    hooks: {
      color: token('color-surface-raised'),
    },
    props: {
      tone: oneOf(['accent', 'danger', 'info', 'neutral', 'primary', 'success', 'warning']),
    },
    stylesheet: 'map/buildings/map-buildings.generated.css',
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
      rule({ tone: 'primary' }, { color: token('color-primary') }),
      rule({ tone: 'success' }, { color: token('color-success') }),
      rule({ tone: 'warning' }, { color: token('color-warning') }),
    ]),
  ],
)
