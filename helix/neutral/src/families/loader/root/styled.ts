import { product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * Loader's styled tier, which writes
 * `helix/styled/src/loader/root/loader-root.generated.css`.
 *
 * **Sized from the loader size tokens**, so a loader is the same size
 * wherever it is placed. `--loader-size: 1em` matches the text beside it, as
 * inside a button. The ink is the words' color around it.
 *
 * **One cell.** The drawing, the mark and the content each take the grid's
 * one cell, so the mark centers over the ring and the loader takes the larger
 * of the ring and the content.
 *
 * **The arc turns while the ring breathes**, out of step: a turn of 0.8
 * seconds, the rate a spinner is read as busy rather than frantic, over a
 * swell of 2.4. The mark breathes with the ring. No rate is on the duration
 * scale, whose longest rung is for a control answering a hand. With motion
 * reduced the swell stops, and the turn slows to one in four seconds, since
 * a loader that stands still reads as broken.
 *
 * **`pulse` takes the arc and the ring away**, and the mark carries the
 * motion alone, larger, as a wordmark waiting on a splash. With motion
 * reduced it stops.
 *
 * **While it waits out its `delay`, the drawing keeps its box** and is not
 * drawn, so the line it sits in does not move when it appears.
 */
export default styles(
  root,
  {
    prefix: 'loader',
    hooks: ['color', 'duration', 'size', 'track-color', 'track-width'],
    own: [
      'loader-breathe',
      'loader-crawl',
      'loader-size',
      'loader-stroke',
      'loader-turn',
      'mark-size',
    ],
    props: [prop('size', ['sm', 'md', 'lg']), prop('variant', ['pulse'])],
    stylesheet: 'loader/root/loader-root.generated.css',
  },
  ({ hook, keyframes, on, own, rule }) => [
    on('host', [
      rule({
        /* A phone's words already take the color around them. */
        color: web('inherit'),
        display: 'inline-grid',
        flexShrink: 0,
        own: {
          breathe: '2.4s',
          crawl: '4s',
          size: token('size-loader-md'),
          stroke: 2,
          turn: '0.8s',
        },
        placeItems: 'center',
        verticalAlign: 'middle',
      }),
      rule({ size: 'sm' }, { own: { size: token('size-loader-sm') } }),
      rule({ size: 'lg' }, { own: { size: token('size-loader-lg') } }),
      /* Bigger under `pulse`, because the mark is the whole of it. */
      rule({ variant: 'pulse' }, { own: { size: product(token('size-loader-lg'), 2) } }),
      rule({ size: 'sm', variant: 'pulse' }, { own: { size: token('size-loader-lg') } }),
      rule(
        { size: 'lg', variant: 'pulse' },
        { own: { size: product(token('size-loader-lg'), 3) } },
      ),
      /* A phone has no grid to stack the cell: the host is at least the
         ring, the content lies in it, and the ring and the mark lie over it
         in the middle. */
      rule(
        { platform: 'native' },
        {
          justifyContent: 'center',
          minBlockSize: hook.size(own.size),
          minInlineSize: hook.size(own.size),
        },
      ),
      /* On paper, a loader promises what will not come. */
      rule({ print: true }, { display: 'none' }),
    ]),
    on('content', [
      rule({ gridArea: '1 / 1' }),
      /* The web hides it in its markup, on every tier; a phone here. */
      rule({ idle: false, platform: 'native' }, { visibility: 'hidden' }),
    ]),
    on('svg', [
      rule({
        animation: ['helix-loader-turn', hook.duration(own.turn), 'linear', 'infinite'],
        blockSize: hook.size(own.size),
        gridArea: '1 / 1',
        inlineSize: hook.size(own.size),
      }),
      rule({ reducedMotion: true }, { animationDuration: own.crawl }),
      rule({ variant: 'pulse' }, { animation: 'none' }),
      rule({ platform: 'native' }, { position: 'absolute' }),
      rule({ platform: 'native', state: 'waiting' }, { visibility: 'hidden' }),
    ]),
    on('track', [
      rule({
        animation: ['helix-loader-breathe', own.breathe, 'ease-in-out', 'infinite'],
        /* The web's circles say `fill="none"` in their markup. */
        fill: 'none',
        opacity: 0.18,
        stroke: hook.trackColor('currentColor'),
        strokeWidth: hook.trackWidth(own.stroke),
      }),
      rule({ reducedMotion: true }, { animation: 'none' }),
      rule({ variant: 'pulse' }, { display: 'none' }),
    ]),
    /* A gap in the dash is what makes the turn visible. */
    on('indicator', [
      rule({
        fill: 'none',
        stroke: hook.color('currentColor'),
        strokeDasharray: '50, 100',
        strokeLinecap: 'round',
        strokeWidth: hook.trackWidth(own.stroke),
      }),
      rule({ variant: 'pulse' }, { display: 'none' }),
    ]),
    /* The center, sized against the loader, so a mark stays in proportion at
       every size, and breathing with the ring. */
    on('mark', [
      rule({
        '--icon-size': own.markSize,
        alignItems: 'center',
        animation: ['helix-loader-breathe-mark', own.breathe, 'ease-in-out', 'infinite'],
        blockSize: own.markSize,
        display: 'flex',
        gridArea: '1 / 1',
        inlineSize: own.markSize,
        justifyContent: 'center',
        own: { markSize: product(hook.size(own.size), 0.4) },
      }),
      rule({ reducedMotion: true }, { animation: 'none' }),
      /* Opacity alone, where the default appearance also scales. */
      rule({ variant: 'pulse' }, { animationName: 'helix-loader-pulse-mark' }),
      rule({ reducedMotion: true, variant: 'pulse' }, { animation: 'none', opacity: 1 }),
      rule({ platform: 'native' }, { position: 'absolute' }),
      rule({ platform: 'native', state: 'waiting' }, { visibility: 'hidden' }),
    ]),
    on({ region: 'default', slotted: '*' }, [rule({ blockSize: '100%', inlineSize: '100%' })]),
    /* Waiting out `delay`: the web marks the drawing `hidden`, and keeps its
       box. */
    on({ part: 'svg', selector: '[part="svg"][hidden]' }, [
      rule({ platform: 'web' }, { display: 'inline', visibility: 'hidden' }),
    ]),
    on({ part: 'mark', selector: '[part="mark"][hidden]' }, [
      rule({ platform: 'web' }, { display: 'flex', visibility: 'hidden' }),
    ]),
    keyframes('helix-loader-breathe', {
      '0%, 100%': { opacity: 0.12 },
      '50%': { opacity: 0.24 },
    }),
    keyframes('helix-loader-breathe-mark', {
      '0%, 100%': { opacity: 0.45, scale: 0.82 },
      '50%': { opacity: 1, scale: 1 },
    }),
    keyframes('helix-loader-pulse-mark', {
      '0%, 100%': { opacity: 0.35 },
      '50%': { opacity: 1 },
    }),
    keyframes('helix-loader-turn', { to: { transform: 'rotate(1turn)' } }),
  ],
)
