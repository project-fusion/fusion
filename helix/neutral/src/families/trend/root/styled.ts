import printEconomy from '../../../fragments/print-economy.js'
import visuallyHidden from '../../../fragments/visually-hidden.js'
import { oneOf } from '../../../render.js'
import { native, token } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Trend's styled tier, which writes `helix/styled/src/trend/root/trend-root.generated.css`.
 *
 * **The arrow and the metric take the trend's color, and the label stays
 * gray.** The color is gray until `good` judges the move: success for
 * better, danger for worse. `color-by="movement"` colors a rise and a fall
 * by the market's tokens instead, `--helix-color-rise` and
 * `--helix-color-fall`.
 *
 * **Served, the attribute pairs stand in for the states** until the element
 * upgrades, so a served trend is colored before its script runs. A phone's
 * view is never undefined, and reads the states alone.
 *
 * **The arrow is an em of the trend's words**, or `--trend-icon-size`. The
 * web sizes its `<svg>` through `--icon-size` and the shared glyph sheet,
 * and a phone sizes the glyph with a rule of its own, which stops growing at
 * the largest standard text size while the words grow on.
 */
export default styles(
  root,
  {
    prefix: 'trend',
    hooks: ({ own }) => ({
      betterColor: token('color-success'),
      color: own.trendColor,
      downColor: token('color-fall'),
      gap: token('space-2xs'),
      iconSize: '1em',
      labelColor: token('color-foreground-muted'),
      neutralColor: token('color-foreground-muted'),
      upColor: token('color-rise'),
      worseColor: token('color-danger'),
    }),
    own: { trendColor: null },
    props: { colorBy: oneOf(['judgment', 'movement']) },
    stylesheet: 'trend/root/trend-root.generated.css',
  },
  ({ hook, include, on, rule }) => [
    on('host', [
      rule({
        alignItems: 'center',
        display: 'inline-flex',
        fontSize: token('text-sm'),
        fontWeight: token('weight-medium'),
        gap: hook.gap,
        lineHeight: token('leading-tight'),
      }),
      /* Gray until told what good means. */
      rule({
        color: hook.color,
        own: { trendColor: hook.neutralColor },
      }),
      /* The judgment, and the attribute pairs that stand in for it served. */
      rule(
        [
          { better: true },
          { defined: false, good: 'up', movement: 'up' },
          { defined: false, good: 'down', movement: 'down' },
        ],
        { own: { trendColor: hook.betterColor } },
      ),
      rule(
        [
          { worse: true },
          { defined: false, good: 'up', movement: 'down' },
          { defined: false, good: 'down', movement: 'up' },
        ],
        { own: { trendColor: hook.worseColor } },
      ),
      /* The movement, for a page whose colors follow its market, after the
         judgment and one attribute heavier, so it wins on a trend that sets
         `good`. */
      rule(
        [
          { colorBy: 'movement', up: true },
          { colorBy: 'movement', defined: false, movement: 'up' },
        ],
        { own: { trendColor: hook.upColor } },
      ),
      rule(
        [
          { colorBy: 'movement', down: true },
          { colorBy: 'movement', defined: false, movement: 'down' },
        ],
        { own: { trendColor: hook.downColor } },
      ),
    ]),
    on('icon', [
      rule({ '--icon-size': hook.iconSize }),
      native([rule({ blockSize: hook.iconSize, flex: '0 0 auto', inlineSize: hook.iconSize })]),
    ]),
    /* A glyph of the page's own takes the arrow's size and its color. */
    on({ region: ['icon', 'up-icon', 'down-icon', 'neutral-icon'], slotted: '*' }, [
      rule({
        '--icon-size': hook.iconSize,
        blockSize: hook.iconSize,
        inlineSize: hook.iconSize,
      }),
    ]),
    /* Out of sight and still read. */
    on('direction', [rule([visuallyHidden])]),
    on({ region: 'label' }, [
      rule({
        color: hook.labelColor,
        fontWeight: token('weight-regular'),
      }),
    ]),
    include(printEconomy),
  ],
)
