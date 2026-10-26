import { fn, hookOf, inherited, measured, product, quotient, token } from '../../../style.js'
import { styles } from '../../../table.js'
import segment from './headless.js'

/**
 * A meter segment's styled tier, which writes
 * `helix/styled/src/meter/segment/meter-segment.generated.css`.
 *
 * **The host takes no box**, so the slice it draws is a flex item of the
 * meter's track, which lets a segment be written inside a meter as one
 * element and still sit in its row.
 *
 * **As wide as its value is of the range.** `--meter-span` is the meter's
 * own, set on its track and inherited by what it holds. The slice never
 * shrinks, so segments that add up to more than the range keep their widths
 * and the track clips the last at its end.
 *
 * **The next color in the series for each segment**, in the order written,
 * so two segments are told apart without being given a color. A tone is what
 * a segment means and takes the place of its turn. A hairline in the track's
 * ground sits between neighbors, so the boundary is there for a reader who
 * cannot tell two of the colors apart.
 */
export default styles(
  segment,
  {
    prefix: 'meter-segment',
    hooks: ({ own }) => ({
      color: own.meterSegmentHue(token('color-series-1')),
      gapColor: token('color-background'),
    }),
    own: { meterSegmentHue: null },
    stylesheet: 'meter/segment/meter-segment.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({ display: 'contents' }),
      rule({ ofType: 1 }, { own: { meterSegmentHue: token('color-series-1') } }),
      rule({ ofType: 2 }, { own: { meterSegmentHue: token('color-series-2') } }),
      rule({ ofType: 3 }, { own: { meterSegmentHue: token('color-series-3') } }),
      rule({ ofType: 4 }, { own: { meterSegmentHue: token('color-series-4') } }),
      rule({ ofType: 5 }, { own: { meterSegmentHue: token('color-series-5') } }),
      rule({ ofType: 6 }, { own: { meterSegmentHue: token('color-series-6') } }),
      rule({ ofType: 7 }, { own: { meterSegmentHue: token('color-series-7') } }),
      rule({ ofType: 8 }, { own: { meterSegmentHue: token('color-series-8') } }),
      rule({ ofType: 9 }, { own: { meterSegmentHue: token('color-series-9') } }),
      rule({ ofType: 10 }, { own: { meterSegmentHue: token('color-series-10') } }),
      rule({ ofType: 11 }, { own: { meterSegmentHue: token('color-series-11') } }),
      rule({ tone: 'accent' }, { own: { meterSegmentHue: token('color-accent') } }),
      rule({ tone: 'danger' }, { own: { meterSegmentHue: token('color-danger') } }),
      rule({ tone: 'info' }, { own: { meterSegmentHue: token('color-info') } }),
      rule({ tone: 'neutral' }, { own: { meterSegmentHue: token('color-foreground-subtle') } }),
      rule({ tone: 'primary' }, { own: { meterSegmentHue: token('color-primary') } }),
      rule({ tone: 'success' }, { own: { meterSegmentHue: token('color-success') } }),
      rule({ tone: 'warning' }, { own: { meterSegmentHue: token('color-warning') } }),
    ]),
    on('fill', [
      rule({
        backgroundColor: hook.color,
        blockSize: '100%',
        boxShadow: ['inset', token('border-thin'), 0, 0, hook.gapColor],
        boxSizing: 'border-box',
        flexBasis: product(
          quotient(measured('meter-segment-value', 0), inherited('meter-span', 1)),
          '100%',
        ),
        flexGrow: 0,
        flexShrink: 0,
        /* A slice of any size above nothing keeps three pixels, so a small
           one is a color and never only its hairline. */
        minInlineSize: fn('min', '3px', product(measured('meter-segment-value', 0), '1000px')),
        transition: [
          'flex-basis',
          hookOf('meter', 'transition-duration', token('duration-normal')),
          token('easing-decelerate'),
        ],
      }),
      /* The first slice has no neighbor before it. */
      rule({ ofType: 1 }, { boxShadow: 'none' }),
      rule({ reducedMotion: true }, { transition: 'none' }),
      rule(
        { forcedColors: true },
        {
          backgroundColor: 'CanvasText',
          boxShadow: ['inset', token('border-thin'), 0, 0, 'Canvas'],
        },
      ),
    ]),
  ],
)
