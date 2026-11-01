import printExact from '../../../fragments/print-exact.js'
import { oneOf } from '../../../render.js'
import {
  difference,
  list,
  measured,
  mix,
  native,
  product,
  quotient,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Meter's styled tier.
 *
 * **A row when there is a reading to put beside the bar**, and a bare block
 * when there is not, as Progress has it, so the two read as one family. A
 * label sits above the bar across the row, and under a ring or an arc.
 *
 * **The fill is a `scale` along the track**, from the inline start, of the
 * share `--meter-fraction` carries. The track wears the house radius, not the
 * pill Progress wears, and clips the fill's corners and the ticks.
 *
 * **The band colors the fill**: good is the success color, fair the warning
 * color, and poor the danger color, through `--_meter-hue`, which
 * `--meter-color` overrides. A value past an end squares the corner it ran
 * out at, and each threshold is a mark in the ground's color.
 *
 * **A ring and an arc are the same reading drawn round**: circles a hundred
 * units long in a box a hundred square, turned so a ring starts at twelve and
 * an arc at seven, its fill and its ticks lengths along the circle.
 *
 * **Subtle is a wash of whichever color the band chose** over the track's.
 */
export default styles(
  root,
  {
    prefix: 'meter',
    hooks: {
      color: null,
      labelColor: token('color-foreground'),
      labelGap: token('space-2xs'),
      labelSize: token('text-sm'),
      ringSize: '6rem',
      ringWidth: token('size-progress'),
      size: token('size-meter'),
      tickColor: token('color-background'),
      trackColor: token('color-surface-sunken'),
      transitionDuration: token('duration-normal'),
      valueColor: token('color-foreground-muted'),
      valueGap: token('space-sm'),
      valueSize: token('text-xs'),
    },
    own: { meterHue: null, meterSpan: null, meterStroke: null },
    props: { emphasis: oneOf(['subtle']) },
    stylesheet: 'meter/root/meter-root.generated.css',
  },
  ({ hook, include, on, own, rule, variants }) => [
    on('host', [
      rule({ display: 'block' }),
      rule(
        { showValue: true },
        {
          alignItems: 'center',
          columnGap: hook.valueGap,
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          rowGap: hook.labelGap,
        },
      ),
      /* The same reading, drawn round. */
      rule([{ shape: 'arc' }, { shape: 'ring' }], {
        display: 'inline-grid',
        placeItems: 'center',
        rowGap: hook.labelGap,
      }),
    ]),
    /* A label above a meter, across the whole row when the reading sits
       beside it. */
    on({ region: 'label', slotted: '*' }, [
      rule({
        color: hook.labelColor,
        display: 'block',
        fontSize: hook.labelSize,
        gridColumn: '1 / -1',
        marginBlockEnd: hook.labelGap,
      }),
      /* In the grid the row gap is the space, so the margin would count it
         twice. */
      rule({ showValue: true }, { marginBlockEnd: 0 }),
      /* Under a ring or an arc, in the drawing's own column, as a gauge's
         caption. */
      rule([{ shape: 'arc' }, { shape: 'ring' }], { gridColumn: 1, marginBlock: 0 }),
    ]),
    /* Said and not shown under `live`. A phone announces it and draws
       nothing. */
    on('live', [
      web([
        rule({
          blockSize: '1px',
          clipPath: 'inset(50%)',
          inlineSize: '1px',
          margin: token('space-none'),
          overflow: 'hidden',
          position: 'absolute',
          whiteSpace: 'nowrap',
        }),
      ]),
    ]),
    /* Tabular figures, right-aligned over a floor, as Progress's reading. */
    on('value', [
      rule({
        color: hook.valueColor,
        fontFamily: token('font-sans'),
        fontSize: hook.valueSize,
        fontVariantNumeric: 'tabular-nums',
        minInlineSize: '3ch',
        textAlign: 'end',
      }),
      /* In the middle, which is why the round shapes exist at all. */
      rule([{ shape: 'arc' }, { shape: 'ring' }], { gridArea: '1 / 1' }),
      /* A phone has no grid cell for it to share, so it lies over the drawing's
         own box, and the host stands the caption under the drawing. */
      native([
        rule([{ shape: 'arc' }, { shape: 'ring' }], {
          alignItems: 'center',
          blockSize: hook.ringSize,
          display: 'flex',
          insetBlockStart: 0,
          insetInlineEnd: 0,
          insetInlineStart: 0,
          justifyContent: 'center',
          position: 'absolute',
        }),
      ]),
    ]),
    on('host', [
      native([rule([{ shape: 'arc' }, { shape: 'ring' }], { flexDirection: 'column-reverse' })]),
    ]),
    /* The whole range, always drawn. */
    on('track', [
      rule({
        backgroundColor: hook.trackColor,
        blockSize: hook.size,
        borderRadius: token('radii-sm'),
        inlineSize: '100%',
        overflow: 'hidden',
        position: 'relative',
      }),
      /* A row for the segments, and the fill over the whole track, so a row of
         segments beside it moves nothing. What the range holds is handed to
         each segment on a phone, which divides its value by it. On the web
         the segments are slotted and read `--meter-span` from the track. */
      rule({ shape: false }, { display: 'flex' }),
      native([rule({ shape: false }, { own: { meterSpan: measured('meter-span', 1) } })]),
      rule([{ shape: 'arc' }, { shape: 'ring' }], {
        backgroundColor: 'transparent',
        blockSize: hook.ringSize,
        borderRadius: token('radii-none'),
        gridArea: '1 / 1',
        inlineSize: hook.ringSize,
        own: { meterStroke: hook.ringWidth },
      }),
      /* Twelve o'clock for a ring, and seven for an arc, one end of its own
         opening. */
      variants('shape', {
        ring: { rotate: '-90deg' },
        arc: { rotate: '135deg' },
      }),
    ]),
    on('indicator', [
      web([rule({ shape: false }, { inset: 0 }), rule({ shape: false }, { position: 'absolute' })]),
      rule({
        backgroundColor: own.meterHue,
        blockSize: '100%',
        borderRadius: 'inherit',
        inlineSize: '100%',
        scale: [measured('meter-fraction', 0), 1],
        transformOrigin: 'left center',
        transition: list(
          ['background-color', hook.transitionDuration, token('easing-standard')],
          ['scale', hook.transitionDuration, token('easing-decelerate')],
        ),
        own: { meterHue: hook.color(token('color-primary')) },
      }),
      /* **A phone lays the fill over the whole track**, as Progress's fill is.
         Past the largest standard text size the track's height is the least it
         is, and a fill whose height is all of that measured against more: the
         bar ran past the bottom of a simulator's screen and took the meters
         below it along, at iOS's largest text size in run 38957410938. */
      native([rule({ shape: false }, { inset: 0, position: 'absolute' })]),
      rule({ dir: 'rtl' }, { transformOrigin: 'right center' }),
      /* The three bands. Color is the obvious half, and the ticks the other. */
      rule(
        { 'data-band': 'good' },
        { backgroundColor: own.meterHue, own: { meterHue: hook.color(token('color-success')) } },
      ),
      rule(
        { 'data-band': 'fair' },
        {
          backgroundColor: own.meterHue,
          own: { meterHue: hook.color(token('color-warning-mark')) },
        },
      ),
      rule(
        { 'data-band': 'poor' },
        { backgroundColor: own.meterHue, own: { meterHue: hook.color(token('color-danger')) } },
      ),
      /* Past an end, the corner it ran out at squares off. */
      rule(
        { 'data-beyond': 'over' },
        { borderEndEndRadius: token('radii-none'), borderStartEndRadius: token('radii-none') },
      ),
      rule(
        { 'data-beyond': 'under' },
        { borderEndStartRadius: token('radii-none'), borderStartStartRadius: token('radii-none') },
      ),
      /* `scale: none` first: the bar's scale would leave the circle a pixel
         wide. The round shapes' unbanded ink is muted. */
      rule([{ shape: 'arc' }, { shape: 'ring' }], {
        scale: 'none',
        stroke: own.meterHue,
        strokeDasharray: [measured('meter-along'), 100],
        strokeLinecap: 'round',
        transition: ['stroke-dasharray', hook.transitionDuration, token('easing-standard')],
        own: { meterHue: hook.color(token('color-foreground-muted')) },
      }),
      rule(
        [
          { 'data-band': 'good', shape: 'arc' },
          { 'data-band': 'good', shape: 'ring' },
        ],
        { stroke: own.meterHue, own: { meterHue: hook.color(token('color-success')) } },
      ),
      rule(
        [
          { 'data-band': 'fair', shape: 'arc' },
          { 'data-band': 'fair', shape: 'ring' },
        ],
        { stroke: own.meterHue, own: { meterHue: hook.color(token('color-warning-mark')) } },
      ),
      rule(
        [
          { 'data-band': 'poor', shape: 'arc' },
          { 'data-band': 'poor', shape: 'ring' },
        ],
        { stroke: own.meterHue, own: { meterHue: hook.color(token('color-danger')) } },
      ),
    ]),
    /* A mark where a band begins, on the track, centered on the threshold. */
    on('tick', [
      rule({
        backgroundColor: hook.tickColor,
        blockSize: '100%',
        inlineSize: token('border-thick'),
        insetBlockStart: 0,
        insetInlineStart: measured('meter-at', '0%'),
        position: 'absolute',
        translate: '-50%',
        zIndex: token('layer-raised'),
      }),
      /* A tick is one unit of the same circle, pushed round to where the
         threshold falls, in the ground's color. */
      rule([{ shape: 'arc' }, { shape: 'ring' }], {
        insetInlineStart: 'auto',
        position: 'static',
        stroke: hook.tickColor,
        strokeDasharray: '1 99',
        strokeDashoffset: product(measured('meter-along'), '-1'),
      }),
    ]),
    /* Geometry as CSS, so every circle reads the same properties. */
    on(
      ['groove', 'indicator', 'tick'],
      [
        variants('shape', {
          arc: {
            cx: '50%',
            cy: '50%',
            fill: 'none',
            r: difference('50%', quotient(own.meterStroke, 2)),
            strokeWidth: own.meterStroke,
          },
          ring: {
            cx: '50%',
            cy: '50%',
            fill: 'none',
            r: difference('50%', quotient(own.meterStroke, 2)),
            strokeWidth: own.meterStroke,
          },
        }),
      ],
    ),
    on('groove', [
      rule([{ shape: 'arc' }, { shape: 'ring' }], {
        stroke: hook.trackColor,
        strokeDasharray: [measured('meter-sweep'), 100],
      }),
    ]),
    include(printExact),
    /* Subtle, against `--_meter-hue`, so one pair of rules quietens every
       color in every shape. */
    on('indicator', [
      rule({ emphasis: 'subtle' }, { backgroundColor: mix(own.meterHue, 30, hook.trackColor) }),
      rule(
        [
          { emphasis: 'subtle', shape: 'arc' },
          { emphasis: 'subtle', shape: 'ring' },
        ],
        { stroke: mix(own.meterHue, 30, hook.trackColor) },
      ),
      rule({ forcedColors: true }, { backgroundColor: 'Highlight', forcedColorAdjust: 'none' }),
      rule({ forcedColors: true, 'data-band': true }, { backgroundColor: own.meterHue }),
    ]),
    /* Forced colors paint every background Canvas: the track is outlined,
       the fill is Highlight, a fill in a band keeps the band's color, and the
       ticks keep the ground's. */
    on('track', [
      rule({ forcedColors: true }, { outline: [token('border-thin'), 'solid', 'CanvasText'] }),
    ]),
    on('tick', [
      rule({ forcedColors: true }, { backgroundColor: 'Canvas', forcedColorAdjust: 'none' }),
    ]),
  ],
)
