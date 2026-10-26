import printExact from '../../../fragments/print-exact.js'
import progressRing from '../../../fragments/progress-ring.js'
import progressWords from '../../../fragments/progress-words.js'
import { oneOf } from '../../../render.js'
import { fn, measured, mix, native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Progress's styled tier, which writes
 * `helix/styled/src/progress/root/progress-root.generated.css`.
 *
 * **A row when there is a reading to put beside the bar**, and a bare block
 * when there is not, so a plain bar is the box it always was. A label sits
 * above the bar across the row, and under the ring, where a gauge's caption
 * goes.
 *
 * **The fill is a `scale` along the track**, from the inline start, of the
 * share `--progress-fraction` carries, because a transform is composited and
 * a bar updates many times a second. Running with no knowable end, it is a
 * segment that travels and never touches either end, and with motion reduced,
 * or an app's motion paused on a phone, a hatch that is no quantity.
 *
 * **Words on the bar make room for themselves** and are drawn in two inks,
 * split where the fill ends: the web clips a gradient to the glyphs, and a
 * phone draws them in the page's ink.
 *
 * **The ring is the same reading drawn round**, two circles a hundred units
 * long, so the fill's dash is the share itself.
 */
export default styles(
  root,
  {
    prefix: 'progress',
    hooks: {
      color: token('color-primary-surface'),
      labelColor: token('color-foreground'),
      labelGap: token('space-2xs'),
      labelSize: token('text-sm'),
      radius: token('radii-full'),
      size: token('size-progress'),
      trackColor: token('color-surface-sunken'),
      transitionDuration: token('duration-normal'),
      valueColor: token('color-foreground-muted'),
      valueGap: token('space-sm'),
      valueSize: token('text-xs'),
    },
    own: ['progress-crawl', 'progress-cycle', 'progress-over', 'progress-under', 'progress-way'],
    props: { emphasis: oneOf(['subtle']) },
    stylesheet: 'progress/root/progress-root.generated.css',
  },
  ({ hook, include, keyframes, on, own, rule }) => [
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
      /* Slow enough to read as work. The crawl is the ring's turn under reduced
         motion, a fixed rate, since every duration token is near zero then. */
      rule(
        { indeterminate: true },
        { own: { crawl: '19.2s', cycle: product(token('duration-slow'), 5) } },
      ),
    ]),
    /* A label above a bar, across the whole row when the reading sits
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
      /* Under a ring, in the drawing's own column, as a gauge's caption. */
      rule({ shape: 'ring' }, { gridColumn: 1, marginBlock: 0 }),
    ]),
    /* Tabular figures, right-aligned over a floor, so the number does not
       jog as it counts and `100%` keeps the room `9%` had. */
    on('value', [
      rule({
        color: hook.valueColor,
        fontFamily: token('font-sans'),
        fontSize: hook.valueSize,
        fontVariantNumeric: 'tabular-nums',
        minInlineSize: '3ch',
        textAlign: 'end',
      }),
    ]),
    /* Said and not shown: the filled bar is the picture of it. A phone
       announces it and draws nothing. */
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
    /* The whole length, always drawn, at least the bar's thickness and as
       tall as words on it. */
    on('track', [
      rule({
        backgroundColor: hook.trackColor,
        minBlockSize: hook.size,
        borderRadius: hook.radius,
        inlineSize: '100%',
        overflow: 'hidden',
      }),
    ]),
    on('indicator', [
      rule({
        backgroundColor: hook.color,
        blockSize: '100%',
        borderRadius: 'inherit',
        inlineSize: '100%',
        scale: [measured('progress-fraction', 0), 1],
        transformOrigin: 'left center',
        transition: ['scale', hook.transitionDuration, token('easing-decelerate')],
      }),
      rule({ dir: 'rtl' }, { transformOrigin: 'right center' }),
      rule(
        { indeterminate: true },
        {
          animation: ['helix-progress-indeterminate', own.cycle, 'linear', 'infinite'],
          transition: 'none',
        },
      ),
      /* The travel is signed, because `translate` is physical and the track
         is not. */
      rule({ indeterminate: true }, { own: { way: 1 } }),
      rule({ dir: 'rtl', indeterminate: true }, { own: { way: '-1' } }),
      /* Still, and no longer a segment: a hatch, which is no quantity. */
      rule(
        { indeterminate: true, reducedMotion: true },
        {
          animation: 'none',
          backgroundImage: fn(
            'repeating-linear-gradient',
            '-45deg',
            [token('color-background'), 0, token('space-xs')],
            ['transparent', token('space-xs'), product(token('space-xs'), 2)],
          ),
          scale: '1 1',
          translate: 0,
        },
      ),
      /* A phone draws no repeating gradient, so its hatch is one tile of
         stripes repeated, the same stripes as far apart. */
      native([
        rule(
          { indeterminate: true, reducedMotion: true },
          {
            backgroundImage: fn(
              'linear-gradient',
              '-45deg',
              [token('color-background'), '25%'],
              'transparent 25%',
              'transparent 50%',
              [token('color-background'), '50%'],
              [token('color-background'), '75%'],
              'transparent 75%',
              'transparent',
            ),
            backgroundSize: [
              product(token('space-xs'), 2.8284),
              product(token('space-xs'), 2.8284),
            ],
          },
        ),
      ]),
    ]),
    /* The segment is never anchored to either end: it covers 30% of the
       track in the first third, 40% in the second and 48% in the last, so it
       accelerates across. */
    keyframes('helix-progress-indeterminate', {
      '0%': { scale: '0.18 1', translate: product('-18%', own.way(1)) },
      '35%': { scale: '0.5 1', translate: product('12%', own.way(1)) },
      '65%': { scale: '0.5 1', translate: product('52%', own.way(1)) },
      '100%': { scale: '0.18 1', translate: product('100%', own.way(1)) },
    }),
    include(progressWords),
    include(progressRing),
    /* Forced colors paint every background Canvas: the fill keeps the
       system's Highlight, the track is outlined, and the words over the fill
       are HighlightText. A ring is drawn in strokes. */
    on('track', [
      rule({ forcedColors: true }, { outline: [token('border-thin'), 'solid', 'CanvasText'] }),
      rule({ forcedColors: true, shape: 'ring' }, { outline: 'none' }),
    ]),
    on('indicator', [
      rule({ forcedColors: true }, { backgroundColor: 'Highlight', forcedColorAdjust: 'none' }),
      rule({ forcedColors: true, shape: 'ring' }, { stroke: 'Highlight' }),
    ]),
    on('groove', [rule({ forcedColors: true, shape: 'ring' }, { stroke: 'CanvasText' })]),
    on('content', [
      rule(
        { forcedColors: true },
        { forcedColorAdjust: 'none', own: { over: 'HighlightText', under: 'CanvasText' } },
      ),
      rule({ forcedColors: true, shape: 'ring' }, { color: 'CanvasText' }),
    ]),
    include(printExact),
    /* Subtle: the bar keeps its area and stops claiming to be the point, a
       wash of its own color over the track's. */
    on('indicator', [
      rule(
        { emphasis: 'subtle' },
        {
          backgroundColor: mix(hook.color, 30, hook.trackColor),
        },
      ),
      rule(
        { emphasis: 'subtle', shape: 'ring' },
        {
          stroke: mix(hook.color, 30, hook.trackColor),
        },
      ),
    ]),
  ],
)
