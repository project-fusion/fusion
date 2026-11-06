import { difference, fn, list, measured, mix, native, product, sum, token, web } from '../style.js'
import { fragment } from '../table.js'

/** The level fades in and out, as the bar does. */
const fade = list(['opacity', token('duration-fast'), token('easing-standard')])

/**
 * Video's two ranges on the web, real inputs stripped of their paint: the
 * scrubber along the bar, its played share in the accent, and the volume level
 * that stands up out of the bar on its end over a ground of its own, the loud
 * end at the top, while the speaker is hovered or holds focus. A phone draws
 * the scrubber as a Slider and has no volume level. Video's table takes them
 * in where they stand in its cascade.
 */
export default fragment(
  'video-sound',
  {
    parts: ['scrubber', 'sound', 'volume'],
    hooks: { accentColor: null },
    own: { videoLevelSize: null, videoRailSize: null, videoThumbSize: null },
    props: ['separation'],
  },
  ({ hook, on, own, rule }) => [
    on(
      ['scrubber', 'volume'],
      [
        web([
          rule({
            appearance: 'none',
            borderRadius: token('radii-full'),
            cursor: 'pointer',
            margin: token('space-none'),
          }),
        ]),
      ],
    ),
    on('scrubber', [
      web([
        rule({
          backgroundColor: mix('currentColor', 28, 'transparent'),
          backgroundImage: fn(
            'linear-gradient',
            'to right',
            [
              hook.accentColor(token('color-primary')),
              product(measured('video-progress', 0), '100%'),
            ],
            ['transparent', product(measured('video-progress', 0), '100%')],
          ),
          blockSize: own.videoRailSize,
        }),
      ]),
      rule({ flex: [1, 1, 'auto'], minInlineSize: 0 }),
      /* A phone's scrubber keeps a share of the bar however large the reader's text. */
      native([rule({ flexBasis: 0, minInlineSize: '30%' })]),
    ]),
    on('sound', [
      rule({ alignItems: 'center', display: 'flex', flex: [0, 0, 'auto'], position: 'relative' }),
      native([rule({ flexDirection: 'row' })]),
    ]),
    /* The level stands up out of the bar, turned on its end, the loud end at the top. */
    on('volume', [
      web([
        rule({
          writingMode: 'vertical-rl',
          backgroundColor: mix('currentColor', 28, 'transparent'),
          backgroundImage: fn(
            'linear-gradient',
            'to top',
            ['currentColor', product(measured('video-level', 1), '100%')],
            ['transparent', product(measured('video-level', 1), '100%')],
          ),
          blockSize: own.videoRailSize,
          bottom: sum('100%', token('space-2xs')),
          direction: 'rtl',
          inlineSize: own.videoLevelSize,
          left: '50%',
          opacity: 0,
          padding: token('space-none'),
          pointerEvents: 'none',
          position: 'absolute',
          transition: fade,
          translate: ['-50%', 0],
        }),
        rule({ separation: 'filled' }, { bottom: sum('100%', product(token('space-xs'), 2)) }),
      ]),
    ]),
    /* Written out: the level shows while the speaker around it is hovered or holds focus. */
    on(
      {
        part: 'volume',
        selector:
          ':host [part="sound"]:hover [part="volume"], :host [part="sound"]:focus-within [part="volume"]',
      },
      [web([rule({ opacity: 1, pointerEvents: 'auto' })])],
    ),
    /* The gap between the speaker and the level, made hoverable. */
    on({ after: 'sound' }, [
      web([
        rule([{ hover: true }, { focusWithin: true }], {
          blockSize: token('space-2xs'),
          bottom: '100%',
          content: '""',
          inlineSize: token('size-icon-loose'),
          left: '50%',
          position: 'absolute',
          translate: ['-50%', 0],
        }),
        rule(
          { focusWithin: true, separation: 'filled' },
          { blockSize: product(token('space-xs'), 2) },
        ),
        rule({ hover: true, separation: 'filled' }, { blockSize: product(token('space-xs'), 2) }),
      ]),
    ]),
    /* The little ground the level stands on. */
    on({ before: 'sound' }, [
      web([
        rule([{ hover: true }, { focusWithin: true }], {
          backgroundColor: token('color-overlay'),
          borderRadius: token('radii-full'),
          content: '""',
          blockSize: sum(own.videoLevelSize, product(token('space-xs'), 2)),
          bottom: difference(sum('100%', token('space-2xs')), token('space-xs')),
          inlineSize: token('size-icon-loose'),
          left: '50%',
          position: 'absolute',
          translate: ['-50%', 0],
        }),
        rule(
          { focusWithin: true, separation: 'filled' },
          {
            bottom: difference(sum('100%', product(token('space-xs'), 2)), token('space-xs')),
          },
        ),
        rule(
          { hover: true, separation: 'filled' },
          {
            bottom: difference(sum('100%', product(token('space-xs'), 2)), token('space-xs')),
          },
        ),
      ]),
    ]),
    /* Written out: the thumbs are the engines' own pseudo-elements, which the vocabulary does not name. */
    on(
      {
        part: 'scrubber',
        selector:
          ':host [part="scrubber"]::-webkit-slider-thumb, :host [part="volume"]::-webkit-slider-thumb',
      },
      [
        web([
          rule({
            appearance: 'none',
            backgroundColor: 'currentColor',
            blockSize: own.videoThumbSize,
            border: 'none',
            borderRadius: token('radii-full'),
            inlineSize: own.videoThumbSize,
          }),
        ]),
      ],
    ),
    on(
      {
        part: 'scrubber',
        selector:
          ':host [part="scrubber"]::-moz-range-thumb, :host [part="volume"]::-moz-range-thumb',
      },
      [
        web([
          rule({
            backgroundColor: 'currentColor',
            blockSize: own.videoThumbSize,
            border: 'none',
            borderRadius: token('radii-full'),
            inlineSize: own.videoThumbSize,
          }),
        ]),
      ],
    ),
  ],
)
