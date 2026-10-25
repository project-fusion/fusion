import { difference, fn, list, measured, product, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import scrollArea from './headless.js'

/**
 * Scroll Area's styled tier, which writes
 * `helix/styled/src/scroll-area/root/scroll-area-root.generated.css`.
 *
 * **The fades are a mask on the viewport on the web**, so the surface behind
 * the scroll area shows through them. Each edge's depth is a private value,
 * set while the edge has more past it, which the class registers so the
 * change animates. A phone has no mask, and draws the painted fades alone.
 *
 * **`--scroll-area-fade-color` paints the fades instead.** Set, it makes the
 * mask's first layer a color, which is invalid in an image list, so the mask
 * falls back to none, and the painted fades read it with no fallback, so
 * they draw on the web only while it is set. A phone paints them in the
 * surface color, `color-background`, until it is set, since it has no mask
 * to fade with.
 *
 * **The scrollbars under `scrollbars` are the web's**, placed from the
 * fractions the headless tier writes on each one. A phone shows the
 * platform's scroll indicators.
 */
export default styles(
  scrollArea,
  {
    prefix: 'scroll-area',
    hooks: [
      'fade',
      'fade-block-end',
      'fade-block-start',
      'fade-color',
      'fade-inline-end',
      'fade-inline-start',
      'scrollbar',
      'scrollbar-size',
      'thumb-color',
      'thumb-hover-color',
      'thumb-min-size',
      'track-color',
    ],
    own: [
      'scroll-area-content-size',
      'scroll-area-depth-block-end',
      'scroll-area-depth-block-start',
      'scroll-area-depth-inline-end',
      'scroll-area-depth-inline-start',
      'scroll-area-from-end',
      'scroll-area-from-start',
      'scroll-area-thumb',
    ],
    stylesheet: 'scroll-area/root/scroll-area-root.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const motion = [token('duration-fast'), token('easing-standard')]
    const thumbColor = hook.thumbColor(token('scrollbar-thumb-color'))
    const trackColor = hook.trackColor(token('scrollbar-track-color'))
    const barSize = hook.scrollbarSize(token('space-sm'))
    const depth = hook.fade(token('space-xl'))
    const gutterInline = measured('scroll-area-gutter-inline-end', '0px')
    const gutterBlock = measured('scroll-area-gutter-block-end', '0px')
    const solid = fn('linear-gradient', '#000 0 0')
    const mask = list(
      hook.fadeColor(solid),
      solid,
      fn(
        'linear-gradient',
        own.fromStart,
        ['transparent', 0],
        ['#000', own.depthInlineStart('0px')],
        ['#000', difference('100%', own.depthInlineEnd('0px'))],
        ['transparent', '100%'],
      ),
      fn(
        'linear-gradient',
        'to bottom',
        ['transparent', 0],
        ['#000', own.depthBlockStart('0px')],
        ['#000', difference('100%', own.depthBlockEnd('0px'))],
        ['transparent', '100%'],
      ),
    )
    /* A phone's painted fades, in the surface color until one is set. */
    const fadeColor = hook.fadeColor(token('color-background'))
    const along = product(measured('scroll-area-scroll-fraction', 0), difference('100%', own.thumb))
    return [
      /* The painted fades and the focus ring sit over the viewport, so they
         stay put while the content moves under them. */
      on('host', [
        rule({ display: 'block', position: 'relative' }),
        /* Print: a box that scrolls is a box that hides, so it prints whole. */
        rule({ print: true }, { overflow: 'visible' }),
      ]),
      on('viewport', [
        rule({ blockSize: '100%', overflow: 'auto', overscrollBehavior: web('contain') }),
        /* The axis `orientation` takes away clips what is past it. The web
           element writes it in the viewport's own style. */
        rule({ orientation: 'vertical', platform: 'native' }, { overflowX: 'hidden' }),
        rule({ orientation: 'horizontal', platform: 'native' }, { overflowY: 'hidden' }),
        /* The scale `max-block-size` names, for code shared with a phone. */
        rule({ 'max-block-size': 'sm' }, { maxBlockSize: '8rem' }),
        rule({ 'max-block-size': 'md' }, { maxBlockSize: '12rem' }),
        rule({ 'max-block-size': 'lg' }, { maxBlockSize: '16rem' }),
        rule({ 'max-block-size': 'xl' }, { maxBlockSize: '24rem' }),
        /* The scrollbar, made to belong to the system: `thin` rather than a
           width in pixels, and the shared scrollbar tokens, which clear 3:1
           on every ground, after this family's own hooks. */
        rule(
          { platform: 'web' },
          {
            scrollbarColor: [thumbColor, trackColor],
            scrollbarWidth: hook.scrollbar('thin'),
          },
        ),
        /* A browser's thin bar has no hover of its own on the thumb. */
        rule(
          { hover: true, platform: 'web' },
          {
            scrollbarColor: [
              hook.thumbHoverColor(token('scrollbar-thumb-hover-color')),
              trackColor,
            ],
          },
        ),
        rule({ platform: 'web', scrollbars: true }, { scrollbarWidth: 'none' }),
        /* Four mask layers, top first: a strip for each of the browser's
           scrollbars, which a mask would wash out, and the two fades, which
           meet in the content's box. */
        rule(
          { platform: 'web' },
          {
            own: { fromEnd: 'to left', fromStart: 'to right' },
          },
        ),
        rule(
          { dir: 'rtl', platform: 'web' },
          {
            own: { fromEnd: 'to right', fromStart: 'to left' },
          },
        ),
        rule(
          { platform: 'web' },
          {
            own: {
              contentSize: [difference('100%', gutterInline), difference('100%', gutterBlock)],
            },
            maskComposite: list('add', 'add', 'intersect', 'add'),
            maskPosition: list('right top', 'left bottom', 'left top', 'left top'),
            maskRepeat: 'no-repeat',
            maskSize: list(
              [gutterInline, '100%'],
              ['100%', gutterBlock],
              own.contentSize,
              own.contentSize,
            ),
            transition: list(
              ['--_scroll-area-depth-block-start', ...motion],
              ['--_scroll-area-depth-block-end', ...motion],
              ['--_scroll-area-depth-inline-start', ...motion],
              ['--_scroll-area-depth-inline-end', ...motion],
            ),
          },
        ),
        rule(
          { dir: 'rtl', platform: 'web' },
          { maskPosition: list('left top', 'left bottom', 'right top', 'right top') },
        ),
        /* Each edge's depth, while there is more past it. */
        rule(
          { platform: 'web', state: 'more-block-start' },
          { own: { depthBlockStart: hook.fadeBlockStart(depth) } },
        ),
        rule(
          { platform: 'web', state: 'more-block-end' },
          { own: { depthBlockEnd: hook.fadeBlockEnd(depth) } },
        ),
        rule(
          { platform: 'web', state: 'more-inline-start' },
          { own: { depthInlineStart: hook.fadeInlineStart(depth) } },
        ),
        rule(
          { platform: 'web', state: 'more-inline-end' },
          { own: { depthInlineEnd: hook.fadeInlineEnd(depth) } },
        ),
        /* Only while the content scrolls, because a mask makes the viewport a
           stacking context. The prefixed name as well, for WebKit releases
           that read only that one. */
        rule({ platform: 'web', state: 'scrolls' }, { WebkitMaskImage: mask, maskImage: mask }),
        rule({ platform: 'web', reducedMotion: true }, { transition: 'none' }),
      ]),
      /* The scrollbars drawn under `scrollbars`, over the content at the
         edge, as the browser's overlay scrollbars are. */
      on('scrollbar', [
        rule(
          { platform: 'web' },
          {
            own: {
              thumb: fn(
                'max',
                hook.thumbMinSize(token('space-lg')),
                product(measured('scroll-area-thumb-fraction', 1), '100%'),
              ),
            },
            backgroundColor: trackColor,
            opacity: 0,
            position: 'absolute',
            touchAction: 'none',
            transition: ['opacity', ...motion],
            userSelect: 'none',
            zIndex: sum(token('layer-raised'), 1),
          },
        ),
        rule({ platform: 'web', also: { 'scrollbar-visible': true } }, { opacity: 1 }),
        rule({ platform: 'web', reducedMotion: true }, { transition: 'none' }),
      ]),
      on('scrollbar-vertical', [
        rule({ platform: 'web' }, { inlineSize: barSize, insetBlock: 0, insetInlineEnd: 0 }),
        /* Each stops short of the corner while the other is drawn. */
        rule({ platform: 'web', state: 'scrollbar-horizontal' }, { insetBlockEnd: barSize }),
      ]),
      on('scrollbar-horizontal', [
        rule({ platform: 'web' }, { blockSize: barSize, insetBlockEnd: 0, insetInline: 0 }),
        rule({ platform: 'web', state: 'scrollbar-vertical' }, { insetInlineEnd: barSize }),
      ]),
      on('thumb', [
        rule(
          { platform: 'web' },
          { backgroundColor: thumbColor, borderRadius: token('radii-full'), position: 'absolute' },
        ),
        rule(
          { hover: true, platform: 'web' },
          { backgroundColor: hook.thumbHoverColor(token('scrollbar-thumb-hover-color')) },
        ),
      ]),
      on('thumb-vertical', [
        rule(
          { platform: 'web' },
          { blockSize: own.thumb, insetBlockStart: along, insetInline: token('border-thick') },
        ),
      ]),
      on('thumb-horizontal', [
        rule(
          { platform: 'web' },
          { inlineSize: own.thumb, insetBlock: token('border-thick'), insetInlineStart: along },
        ),
      ]),
      on('corner', [
        rule(
          { platform: 'web' },
          {
            backgroundColor: trackColor,
            blockSize: barSize,
            inlineSize: barSize,
            insetBlockEnd: 0,
            insetInlineEnd: 0,
            position: 'absolute',
          },
        ),
      ]),
      /* The painted fades, under `--scroll-area-fade-color`: a gradient from
         that color over the content at each edge. */
      on({ before: 'host' }, [
        rule({
          backgroundImage: fn('linear-gradient', 'to bottom', hook.fadeColor(), 'transparent'),
          blockSize: hook.fadeBlockStart(depth),
          content: '""',
          insetBlockStart: 0,
          insetInline: 0,
          opacity: 0,
          pointerEvents: 'none',
          position: 'absolute',
          transition: ['opacity', ...motion],
          zIndex: token('layer-raised'),
        }),
        rule(
          { platform: 'native' },
          { backgroundImage: fn('linear-gradient', 'to bottom', fadeColor, 'transparent') },
        ),
        rule({ state: 'more-block-start' }, { opacity: 1 }),
        rule({ reducedMotion: true }, { transition: 'none' }),
      ]),
      on({ after: 'host' }, [
        rule({
          backgroundImage: fn('linear-gradient', 'to top', hook.fadeColor(), 'transparent'),
          blockSize: hook.fadeBlockEnd(depth),
          content: '""',
          insetBlockEnd: 0,
          insetInline: 0,
          opacity: 0,
          pointerEvents: 'none',
          position: 'absolute',
          transition: ['opacity', ...motion],
          zIndex: token('layer-raised'),
        }),
        rule(
          { platform: 'native' },
          { backgroundImage: fn('linear-gradient', 'to top', fadeColor, 'transparent') },
        ),
        rule({ state: 'more-block-end' }, { opacity: 1 }),
        rule({ reducedMotion: true }, { transition: 'none' }),
      ]),
      /* The sideways pair, on an element of its own, because the host has
         two pseudo-elements and four edges want four. */
      on('edges', [
        rule({
          own: { fromEnd: 'to left', fromStart: 'to right' },
          inset: 0,
          pointerEvents: 'none',
          position: 'absolute',
        }),
        rule({ dir: 'rtl' }, { own: { fromEnd: 'to right', fromStart: 'to left' } }),
        /* A phone's ring, while the frame around its scroll view shows
           keyboard focus, on this layer raised over the painted fades. */
        rule(
          { platform: 'native', within: { host: { focusVisible: true } } },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
            zIndex: sum(token('layer-raised'), 1),
          },
        ),
      ]),
      on({ before: 'edges' }, [
        rule({
          backgroundImage: fn('linear-gradient', own.fromStart, hook.fadeColor(), 'transparent'),
          content: '""',
          inlineSize: hook.fadeInlineStart(depth),
          insetBlock: 0,
          insetInlineStart: 0,
          opacity: 0,
          position: 'absolute',
          transition: ['opacity', ...motion],
          zIndex: token('layer-raised'),
        }),
        rule(
          { platform: 'native' },
          { backgroundImage: fn('linear-gradient', own.fromStart, fadeColor, 'transparent') },
        ),
        rule({ state: 'more-inline-start' }, { opacity: 1 }),
        rule({ reducedMotion: true }, { transition: 'none' }),
      ]),
      on({ after: 'edges' }, [
        rule({
          backgroundImage: fn('linear-gradient', own.fromEnd, hook.fadeColor(), 'transparent'),
          content: '""',
          inlineSize: hook.fadeInlineEnd(depth),
          insetBlock: 0,
          insetInlineEnd: 0,
          opacity: 0,
          position: 'absolute',
          transition: ['opacity', ...motion],
          zIndex: token('layer-raised'),
        }),
        rule(
          { platform: 'native' },
          { backgroundImage: fn('linear-gradient', own.fromEnd, fadeColor, 'transparent') },
        ),
        rule({ state: 'more-inline-end' }, { opacity: 1 }),
        rule({ reducedMotion: true }, { transition: 'none' }),
      ]),
      /* A scrolling region takes focus when it scrolls, and says so when it
         has it. The ring is drawn on the layer over the viewport, since the
         fade mask would take it out at every edge that fades. */
      on({ part: 'edges', selector: '[part="viewport"]:focus-visible ~ [part="edges"]' }, [
        rule(
          { platform: 'web' },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
      ]),
      /* **What a phone scrolls across is as wide as the frame**, as a block
         fills the viewport on the web, and the frame's width is what it lays
         its own content out at, so entries that share it share it there.
         What runs past it, as items at their least do, scrolls. */
      on({ region: 'default', slotted: '*' }, [
        rule({ orientation: 'horizontal', platform: 'native' }, { flexGrow: 1, flexShrink: 1 }),
      ]),
    ]
  },
)
