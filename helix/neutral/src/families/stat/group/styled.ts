import { number } from '../../../render.js'
import { difference, native, product, token } from '../../../style.js'
import { styles } from '../../../table.js'
import group from './headless.js'

/**
 * Stat Group's styled tier, which writes
 * `helix/styled/src/stat/group/stat-group.generated.css`.
 *
 * **The stats wrap onto a new line as they run out of room**, each as wide as
 * its own figure. `columns` shares the row equally among a fixed number,
 * which a phone lays out with its own grid.
 *
 * **`divided` draws a rule before every figure and clips the one that starts
 * a row**: each rule is pulled back past the start by the gap and its own
 * width, so the rule leading a row lands outside the box. The web clips
 * across, and a phone clips the box.
 */
export default styles(
  group,
  {
    prefix: 'stat-group',
    hooks: {
      columns: null,
      gap: token('space-2xl'),
    },
    own: { statGroupGap: null },
    props: { columns: number(), divided: false },
    stylesheet: 'stat/group/stat-group.generated.css',
  },
  ({ hook, on, own, rule, variants }) => [
    on('host', [
      rule({
        display: 'flex',
        flexWrap: 'wrap',
        gap: own.statGroupGap,
        own: { statGroupGap: hook.gap },
      }),
      rule({ has: 'columns' }, { display: 'grid' }),
      variants('columns', {
        '2': { gridTemplateColumns: hook.columns('repeat(2, minmax(0, 1fr))') },
        '3': { gridTemplateColumns: hook.columns('repeat(3, minmax(0, 1fr))') },
        '4': { gridTemplateColumns: hook.columns('repeat(4, minmax(0, 1fr))') },
        '5': { gridTemplateColumns: hook.columns('repeat(5, minmax(0, 1fr))') },
        '6': { gridTemplateColumns: hook.columns('repeat(6, minmax(0, 1fr))') },
      }),
      /* A rule before every figure, the one that starts a row clipped. */
      rule({ divided: true }, { columnGap: product(own.statGroupGap, 2), overflowX: 'clip' }),
      native([rule({ divided: true }, { overflow: 'hidden' })]),
    ]),
    on({ region: '*', slotted: '*' }, [
      rule(
        { divided: true },
        {
          borderInlineStart: [token('border-thin'), 'solid', token('color-border')],
          marginInlineStart: difference(product(own.statGroupGap, '-1'), token('border-thin')),
          paddingInlineStart: own.statGroupGap,
        },
      ),
    ]),
  ],
)
