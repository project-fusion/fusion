import { difference, measured, product, quotient, token } from '../style.js'
import { fragment } from '../table.js'

/**
 * Progress's ring, the bar's reading drawn round: two circles in the
 * drawing's own box, the fill's dash a share of a hundred units, and while
 * indeterminate an arc that turns and sweeps, slowed and held at a quarter
 * where motion is reduced. Progress's table takes them in where they stand
 * in its cascade.
 */
export default fragment(
  'progress-ring',
  {
    parts: ['content', 'groove', 'indicator', 'track', 'value'],
    hooks: [
      'color',
      'content-color',
      'label-gap',
      'ring-size',
      'ring-width',
      'track-color',
      'transition-duration',
    ],
    own: ['progress-crawl', 'progress-cycle', 'ring-stroke'],
    props: ['indeterminate', 'shape', 'showValue'],
  },
  ({ hook, keyframes, on, own, rule }) => [
    /* The ring: the loader's shape carrying the bar's value. */
    on('host', [
      rule(
        { shape: 'ring' },
        { display: 'inline-grid', placeItems: 'center', rowGap: hook.labelGap(token('space-2xs')) },
      ),
      /* In the middle, where a dial puts its reading. */
      rule(
        { shape: 'ring', showValue: true },
        { gap: token('space-none'), gridTemplateColumns: 'auto' },
      ),
    ]),
    on('track', [
      rule(
        { shape: 'ring' },
        {
          backgroundColor: 'transparent',
          blockSize: hook.ringSize('4rem'),
          gridArea: '1 / 1',
          inlineSize: hook.ringSize('4rem'),
          /* Twelve o'clock, where a dial starts. */
          rotate: '-90deg',
          own: { ringStroke: hook.ringWidth(token('size-progress')) },
        },
      ),
      /* Running, the arc draws the circle in and takes it away again: the dash
         grows while its offset moves the tail, one lap a cycle, at periods of
         10 to 7. */
      rule(
        { indeterminate: true, shape: 'ring' },
        { animation: ['helix-progress-ring', own.progressCycle, 'linear', 'infinite'] },
      ),
      rule(
        { indeterminate: true, reducedMotion: true, shape: 'ring' },
        { animationDuration: own.progressCrawl },
      ),
    ]),
    /* Geometry as CSS, so both circles read the ring's own properties. */
    on(
      ['groove', 'indicator'],
      [
        rule(
          { shape: 'ring' },
          {
            cx: '50%',
            cy: '50%',
            fill: 'none',
            r: difference('50%', quotient(own.ringStroke, 2)),
            strokeWidth: own.ringStroke,
          },
        ),
      ],
    ),
    on('groove', [
      rule({ shape: 'ring' }, { stroke: hook.trackColor(token('color-surface-sunken')) }),
    ]),
    /* `pathLength="100"` makes the dash the percentage itself. `scale: none`
       undoes the bar's, which would leave the circle a pixel wide. */
    on('indicator', [
      rule(
        { shape: 'ring' },
        {
          scale: 'none',
          stroke: hook.color(token('color-primary-surface')),
          strokeDasharray: [product(measured('progress-fraction'), 100), 100],
          strokeLinecap: 'round',
          transition: [
            'stroke-dasharray',
            hook.transitionDuration(token('duration-normal')),
            token('easing-decelerate'),
          ],
        },
      ),
      rule(
        { indeterminate: true, shape: 'ring' },
        {
          animation: [
            'helix-progress-ring-sweep',
            product(own.progressCycle, 0.7),
            'ease-in-out',
            'infinite',
          ],
          transition: 'none',
        },
      ),
      /* Still, the arc says "unknown" without moving, and turns once in twelve
         cycles. */
      rule({ reducedMotion: true, shape: 'ring' }, { transition: 'none' }),
      rule(
        { indeterminate: true, reducedMotion: true, shape: 'ring' },
        { animation: 'none', strokeDasharray: '25 100' },
      ),
    ]),
    on('value', [
      rule({ shape: 'ring' }, { gridArea: '1 / 1', minInlineSize: 0, textAlign: 'center' }),
    ]),
    /* In the middle of the ring, in the page's ink: nothing is drawn under
       it. */
    on('content', [
      rule(
        { shape: 'ring' },
        {
          backgroundImage: 'none',
          color: hook.contentColor(token('color-foreground')),
          gridArea: '1 / 1',
          paddingInline: token('space-none'),
          textAlign: 'center',
        },
      ),
    ]),
    keyframes('helix-progress-ring', { from: { rotate: '-90deg' }, to: { rotate: '270deg' } }),
    keyframes('helix-progress-ring-sweep', {
      '0%': { strokeDasharray: '10 100', strokeDashoffset: 0 },
      '50%': { strokeDasharray: '70 100', strokeDashoffset: '-25' },
      '100%': { strokeDasharray: '10 100', strokeDashoffset: '-100' },
    }),
  ],
)
