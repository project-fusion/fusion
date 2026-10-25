import { fn, measured, product, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * Progress's words on the bar, which make room for themselves: the track is
 * a grid one cell deep, the fill and the words stacked in it, and the words
 * are drawn in two inks split where the fill ends. The web clips a gradient
 * to the glyphs, and a phone draws the words again over the fill, cut where
 * it ends. Progress's table takes them in where they stand in its cascade.
 */
export default fragment(
  'progress-words',
  {
    parts: ['content', 'content-fill', 'indicator', 'track'],
    hooks: ['content-color', 'content-fill-color', 'content-size'],
    own: ['progress-over', 'progress-split', 'progress-under'],
    props: ['emphasis', 'indeterminate', 'shape'],
  },
  ({ hook, on, own, rule }) => [
    /* Words on the bar: the track is a grid one cell deep, the fill and the
       words stacked in it. No custom state is asked, which a server cannot
       set. */
    on('track', [rule({ display: 'grid' })]),
    on({ part: 'track', inner: '> *' }, [rule({ platform: 'web' }, { gridArea: '1 / 1' })]),
    /* A phone stacks the fill under the words: the fill fills the track,
       and the words are laid out in it. */
    on('indicator', [
      rule({ shape: false, platform: 'native' }, { inset: 0, position: 'absolute' }),
    ]),
    /* Two inks, split exactly where the fill ends: the words run the whole
       track and the color is a gradient clipped to their glyphs, so a letter
       half over the fill is half in each. A phone draws them in the page's
       ink. */
    on('content', [
      rule({
        WebkitBackgroundClip: web('text'),
        backgroundClip: web('text'),
        backgroundImage: web(
          fn(
            'linear-gradient',
            'to right',
            [own.progressOver, own.progressSplit],
            [own.progressUnder, own.progressSplit],
          ),
        ),
        color: web('transparent'),
        fontFamily: token('font-sans'),
        fontSize: hook.contentSize(token('text-xs')),
        fontVariantNumeric: 'tabular-nums',
        lineHeight: token('leading-tight'),
        paddingInline: token('space-xs'),
        position: 'relative',
        whiteSpace: 'nowrap',
        own: {
          progressOver: hook.contentFillColor(token('color-foreground-on-primary')),
          progressUnder: hook.contentColor(token('color-foreground')),
          progressSplit: product(measured('progress-fraction', 0), '100%'),
        },
      }),
      rule({ platform: 'native' }, { color: own.progressUnder }),
      rule(
        { dir: 'rtl' },
        {
          backgroundImage: web(
            fn(
              'linear-gradient',
              'to left',
              [own.progressOver, own.progressSplit],
              [own.progressUnder, own.progressSplit],
            ),
          ),
        },
      ),
      /* No proportion to split at while running, and a wash too light for the
         color made for a solid fill: the words keep the page's ink. */
      rule([{ indeterminate: true }, { emphasis: 'subtle' }], {
        own: { progressOver: own.progressUnder },
      }),
    ]),
    /* The second ink on a phone: the words drawn again over the fill, from
       where they start, and cut where the fill ends. */
    on('content-fill', [
      rule(
        { platform: 'native' },
        {
          color: own.progressOver,
          fontFamily: token('font-sans'),
          fontSize: hook.contentSize(token('text-xs')),
          fontVariantNumeric: 'tabular-nums',
          inlineSize: product(measured('progress-fraction', 0), '100%'),
          insetBlock: 0,
          insetInlineStart: 0,
          lineHeight: token('leading-tight'),
          overflow: 'hidden',
          paddingInline: token('space-xs'),
          position: 'absolute',
          whiteSpace: 'nowrap',
          own: { progressOver: hook.contentFillColor(token('color-foreground-on-primary')) },
        },
      ),
      rule(
        [
          { indeterminate: true, platform: 'native' },
          { emphasis: 'subtle', platform: 'native' },
        ],
        { own: { progressOver: hook.contentColor(token('color-foreground')) } },
      ),
    ]),
  ],
)
