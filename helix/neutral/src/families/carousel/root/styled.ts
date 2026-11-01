import { oneOf } from '../../../render.js'
import { difference, fn, list, native, product, quotient, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import carousel from './headless.js'

const ring = {
  outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
  outlineOffset: token('size-focus-offset'),
} as const

const glyph = { blockSize: '1em', inlineSize: '1em' } as const

const fills = { flex: '1 1 0', minBlockSize: 0, minInlineSize: 0 } as const

/**
 * Carousel's styled tier: a frame around the track, with each group of chrome
 * placed on a side of it or over it.
 *
 * **The web's frame is a grid of three by three, and both groups may share a
 * cell**, dots to the start and arrows to the end of the row under the slides.
 * A phone's grid has no cells that overlap, so there each group is placed
 * absolutely in the host, along its edge, in the tree's order, and the machine
 * pads the host by what each edge holds. Both keep the source's reading order.
 *
 * **A scroller clips at its padding box, so the track keeps room inside itself**,
 * `--carousel-bleed`, on the axis that scrolls, sized to clear `shadow-raised`.
 * `scroll-padding` keeps it from a snap, which would otherwise rest a slide's
 * edge on the clip edge.
 *
 * **The pane is its share at the nearest odd sixty-fourth of a pixel.** Both web
 * engines hold a length in sixty-fourths, and a resting place at an exact half
 * pixel rounds two ways, so a right-to-left track rested a pixel off a
 * left-to-right one. The element measures the run with `--carousel-pane` and
 * `--carousel-gap` and ends it on a whole pixel with `--carousel-run-end`. A
 * phone's panes are the machine's numbers.
 *
 * **`per-view="auto"` is the count the sheet works out**, as `cqi` over a pane
 * and a gap, so the first rule that runs lays the panes out at their final width,
 * on a server's markup too. A phone counts the same from the frame it measures.
 *
 * **Where the pointer cannot hover, the arrows are hidden**, as the track is the
 * control, and the dots center on the row they no longer split. The rotation
 * control stays: what moves on its own must offer a way to stop it.
 *
 * **The current dot lengthens along the run**, so the set reads without color,
 * over one duration and one curve, so the color and the size arrive together.
 */
export default styles(
  carousel,
  {
    prefix: 'carousel',
    hooks: {
      bleed: token('space-md'),
      blockSize: '20rem',
      gap: token('space-md'),
      pane: null,
      perView: null,
      runEnd: null,
      slideMin: null,
    },
    own: {
      carouselBleed: null,
      carouselControlsAlong: null,
      carouselGap: null,
      carouselIndicatorMotion: null,
      carouselIndicatorsAlong: null,
      carouselShare: null,
    },
    props: {
      controlsAlign: oneOf(['center', 'end', 'start']),
      controlsPlacement: oneOf(['bottom', 'end', 'overlay', 'start', 'top']),
      indicatorAlign: oneOf(['center', 'end', 'start']),
      indicatorPlacement: oneOf(['bottom', 'end', 'overlay', 'start', 'top']),
    },
    stylesheet: 'carousel/root/carousel-root.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({ own: { carouselBleed: hook.bleed, carouselGap: hook.gap } }),
      web([
        rule({
          display: 'grid',
          gridTemplateColumns: 'auto minmax(0, 1fr) auto',
          gridTemplateRows: 'auto minmax(0, 1fr) auto',
        }),
        rule({ print: true }, { boxShadow: 'none', overflow: 'visible' }),
      ]),
      native([rule({ display: 'flex', flexDirection: 'column' })]),
    ]),
    on('track', [
      rule({
        display: 'flex',
        gap: own.carouselGap,
        overflowX: 'auto',
        paddingBlock: token('space-md'),
        paddingInline: own.carouselBleed,
        scrollPaddingInline: own.carouselBleed,
        scrollSnapType: 'x mandatory',
      }),
      /* The region takes keyboard focus for its arrow keys, and the ring sits
         inside it so the edge of the page or a clipping parent cannot cut it. */
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: product(token('size-focus-offset'), '-1'),
        },
      ),
      web([
        rule({
          '--carousel-gap': own.carouselGap,
          '--carousel-pane': sum(
            fn('round', difference(own.carouselShare, '0.015625px'), '0.03125px'),
            '0.015625px',
          ),
          gridArea: '2 / 2',
          own: {
            carouselShare: quotient(
              difference('100%', product(difference(hook.perView(1), 1), own.carouselGap)),
              hook.perView(1),
            ),
          },
          scrollbarWidth: 'none',
        }),
        rule({ mouseDrag: true }, { cursor: 'grab' }),
        rule({ dragging: true }, { cursor: 'grabbing', userSelect: 'none' }),
        rule(
          { orientation: { not: 'vertical' }, perView: 'auto' },
          {
            '--carousel-per-view': fn(
              'max',
              1,
              fn(
                'round',
                'down',
                quotient(
                  sum('100cqi', own.carouselGap),
                  sum(hook.slideMin('100cqi'), own.carouselGap),
                ),
                1,
              ),
            ),
            containerType: 'inline-size',
          },
        ),
      ]),
      rule(
        { orientation: 'vertical' },
        {
          blockSize: hook.blockSize,
          flexDirection: 'column',
          overflowX: 'hidden',
          overflowY: 'auto',
          paddingBlock: own.carouselBleed,
          scrollPaddingBlock: own.carouselBleed,
          scrollSnapType: 'y mandatory',
        },
      ),
    ]),
    on({ part: 'track', selector: '[part="track"]::-webkit-scrollbar' }, [
      web([rule({ display: 'none' })]),
    ]),
    on(
      ['controls', 'indicators'],
      [
        rule({ alignItems: 'center', display: 'flex', gap: token('space-2xs') }),
        native([rule({ position: 'absolute' })]),
      ],
    ),
    on('indicators', [
      web([
        rule({ gridArea: '3 / 2', justifySelf: own.carouselIndicatorsAlong }),
        rule({ indicatorPlacement: 'top' }, { gridArea: '1 / 2' }),
      ]),
      rule({
        own: { carouselIndicatorsAlong: 'start' },
        paddingBlockStart: token('space-sm'),
        paddingInline: own.carouselBleed,
      }),
      rule(
        { canHover: false, coarsePointer: true, controls: { not: 'always' } },
        { own: { carouselIndicatorsAlong: 'center' } },
      ),
      rule(
        { indicatorPlacement: 'top' },
        { paddingBlock: [token('space-none'), token('space-sm')] },
      ),
      rule([{ indicatorPlacement: 'start' }, { indicatorPlacement: 'end' }], {
        flexDirection: 'column',
        own: { carouselIndicatorsAlong: 'center' },
        paddingBlockStart: token('space-none'),
        paddingInline: token('space-none'),
      }),
      web([
        rule([{ indicatorPlacement: 'start' }, { indicatorPlacement: 'end' }], {
          alignSelf: own.carouselIndicatorsAlong,
          justifySelf: 'center',
        }),
      ]),
      rule({ indicatorPlacement: 'overlay' }, { own: { carouselIndicatorsAlong: 'center' } }),
      rule({ indicatorAlign: 'start' }, { own: { carouselIndicatorsAlong: 'start' } }),
      rule({ indicatorAlign: 'center' }, { own: { carouselIndicatorsAlong: 'center' } }),
      rule({ indicatorAlign: 'end' }, { own: { carouselIndicatorsAlong: 'end' } }),
      web([rule({ indicatorPlacement: 'start' }, { gridArea: '2 / 1' })]),
      rule({ indicatorPlacement: 'start' }, { paddingInlineEnd: token('space-sm') }),
      web([rule({ indicatorPlacement: 'end' }, { gridArea: '2 / 3' })]),
      rule({ indicatorPlacement: 'end' }, { paddingInlineStart: token('space-sm') }),
      web([
        rule(
          { indicatorPlacement: 'overlay' },
          { alignSelf: 'end', gridArea: '2 / 2', zIndex: token('layer-raised') },
        ),
      ]),
      rule(
        { indicatorPlacement: 'overlay' },
        {
          backgroundColor: token('color-surface-overlay'),
          borderRadius: token('radii-full'),
          boxShadow: token('shadow-raised'),
          marginBlockEnd: sum(own.carouselBleed, token('space-md')),
          paddingBlock: token('space-2xs'),
          paddingInline: token('space-xs'),
        },
      ),
      web([
        rule(
          { lacks: 'indicator-placement', orientation: 'vertical' },
          { alignSelf: own.carouselIndicatorsAlong, gridArea: '2 / 3', justifySelf: 'center' },
        ),
      ]),
      rule(
        { lacks: 'indicator-placement', orientation: 'vertical' },
        {
          flexDirection: 'column',
          paddingBlockStart: token('space-none'),
          paddingInline: token('space-none'),
          paddingInlineStart: token('space-sm'),
        },
      ),
      native([
        rule({ alignSelf: own.carouselIndicatorsAlong }),
        rule(
          [
            { indicatorPlacement: 'start' },
            { indicatorPlacement: 'end' },
            { lacks: 'indicator-placement', orientation: 'vertical' },
          ],
          { justifyContent: own.carouselIndicatorsAlong },
        ),
      ]),
    ]),
    on('controls', [
      web([
        rule({ gridArea: '3 / 2', justifySelf: own.carouselControlsAlong }),
        rule({ controlsPlacement: 'top' }, { gridArea: '1 / 2' }),
      ]),
      rule({
        own: { carouselControlsAlong: 'end' },
        paddingBlockStart: token('space-sm'),
        paddingInline: own.carouselBleed,
      }),
      rule(
        { controlsPlacement: 'top' },
        { paddingBlock: [token('space-none'), token('space-sm')] },
      ),
      rule([{ controlsPlacement: 'start' }, { controlsPlacement: 'end' }], {
        flexDirection: 'column',
        paddingBlockStart: token('space-none'),
        paddingInline: token('space-none'),
      }),
      web([
        rule([{ controlsPlacement: 'start' }, { controlsPlacement: 'end' }], {
          alignSelf: own.carouselControlsAlong,
          justifySelf: 'center',
        }),
      ]),
      rule(
        [
          { controlsPlacement: 'start' },
          { controlsPlacement: 'end' },
          { controlsPlacement: 'overlay' },
        ],
        { own: { carouselControlsAlong: 'center' } },
      ),
      rule({ controlsAlign: 'start' }, { own: { carouselControlsAlong: 'start' } }),
      rule({ controlsAlign: 'center' }, { own: { carouselControlsAlong: 'center' } }),
      rule({ controlsAlign: 'end' }, { own: { carouselControlsAlong: 'end' } }),
      web([rule({ controlsPlacement: 'start' }, { gridArea: '2 / 1' })]),
      rule({ controlsPlacement: 'start' }, { paddingInlineEnd: token('space-sm') }),
      web([rule({ controlsPlacement: 'end' }, { gridArea: '2 / 3' })]),
      rule({ controlsPlacement: 'end' }, { paddingInlineStart: token('space-sm') }),
      web([
        rule(
          { controlsPlacement: 'overlay' },
          {
            gridArea: '2 / 2',
            justifySelf: 'stretch',
            pointerEvents: 'none',
            zIndex: token('layer-raised'),
          },
        ),
      ]),
      rule(
        { controlsPlacement: 'overlay' },
        {
          alignItems: own.carouselControlsAlong,
          justifyContent: 'flex-start',
          paddingBlockStart: token('space-none'),
          paddingInline: sum(own.carouselBleed, token('space-md')),
        },
      ),
      web([
        rule(
          { lacks: 'controls-placement', orientation: 'vertical' },
          { alignSelf: own.carouselControlsAlong, gridArea: '2 / 3', justifySelf: 'center' },
        ),
      ]),
      rule(
        { lacks: 'controls-placement', orientation: 'vertical' },
        {
          flexDirection: 'column',
          paddingBlockStart: token('space-none'),
          paddingInline: token('space-none'),
          paddingInlineStart: token('space-sm'),
        },
      ),
      native([
        rule({ alignSelf: own.carouselControlsAlong }),
        rule(
          [
            { controlsPlacement: 'start' },
            { controlsPlacement: 'end' },
            { lacks: 'controls-placement', orientation: 'vertical' },
          ],
          { justifyContent: own.carouselControlsAlong },
        ),
      ]),
      rule(
        {
          canHover: false,
          coarsePointer: true,
          controls: { not: 'always' },
          lacks: 'autoplay',
        },
        { display: 'none' },
      ),
    ]),
    on(
      ['next', 'previous', 'rotation'],
      [
        web([
          rule({
            all: 'unset',
            boxSizing: 'border-box',
            cursor: 'pointer',
            display: 'inline-flex',
          }),
        ]),
        rule({
          alignItems: 'center',
          blockSize: token('size-control-tight'),
          border: [token('border-thin'), 'solid', token('color-border')],
          borderRadius: token('radii-sm'),
          color: token('color-foreground-muted'),
          inlineSize: token('size-control-tight'),
          justifyContent: 'center',
        }),
        native([rule({ display: 'flex' })]),
        web([
          rule(
            { hover: true },
            { backgroundColor: token('color-surface-sunken'), color: token('color-foreground') },
          ),
        ]),
        rule({ focusVisible: true }, ring),
        rule(
          { controlsPlacement: 'overlay' },
          {
            backgroundColor: token('color-surface-overlay'),
            borderColor: 'transparent',
            boxShadow: token('shadow-raised'),
          },
        ),
        web([rule({ controlsPlacement: 'overlay' }, { pointerEvents: 'auto' })]),
      ],
    ),
    on({ inner: 'svg', part: 'rotation' }, [web([rule(glyph)])]),
    on({ inner: 'svg', part: 'previous' }, [web([rule(glyph)])]),
    on({ inner: 'svg', part: 'next' }, [web([rule(glyph)])]),
    on(
      ['next-mark', 'previous-mark', 'rotation-mark'],
      [
        native([
          rule({ blockSize: '1em', color: token('color-foreground-muted'), inlineSize: '1em' }),
        ]),
      ],
    ),
    on({ region: 'next-icon', slotted: '*' }, [
      rule(glyph),
      web([rule({ dir: 'rtl' }, { scale: '-1 1' })]),
    ]),
    on({ region: 'previous-icon', slotted: '*' }, [
      rule(glyph),
      web([rule({ dir: 'rtl' }, { scale: '-1 1' })]),
    ]),
    on('next', [rule({ controlsPlacement: 'overlay' }, { marginInlineStart: 'auto' })]),
    on('rotation', [web([rule({ controlsPlacement: 'overlay' }, { order: 1 })])]),
    on('slide', [
      rule({ display: 'flex', scrollSnapAlign: 'start' }),
      web([
        rule({ flex: ['0', '0', hook.pane], marginInlineEnd: hook.runEnd('0px') }),
        rule({ orientation: { not: 'vertical' }, perView: 'auto' }, { flexGrow: 1 }),
      ]),
      rule({ orientation: 'vertical' }, { flexDirection: 'column' }),
      web([rule({ orientation: 'vertical' }, { flex: ['0', '0', own.carouselShare] })]),
      native([rule({ flexShrink: 0 })]),
    ]),
    on({ part: 'slide', selector: '[part="slide"] ::slotted(*)' }, [web([rule(fills)])]),
    on({ region: 'default', slotted: '*' }, [native([rule(fills)])]),
    on('indicator', [
      web([rule({ all: 'unset', boxSizing: 'border-box', cursor: 'pointer' })]),
      rule({
        backgroundColor: token('color-foreground-subtle'),
        blockSize: token('space-xs'),
        position: 'relative',
        borderRadius: token('radii-full'),
        inlineSize: token('space-xs'),
        own: {
          carouselIndicatorMotion: [token('duration-slow'), token('easing-emphasized')],
        },
        transition: list(
          ['background-color', own.carouselIndicatorMotion],
          ['inline-size', own.carouselIndicatorMotion],
        ),
      }),
      rule(
        { part: { 'data-current': true } },
        { backgroundColor: token('color-primary'), inlineSize: token('space-lg') },
      ),
      rule(
        [
          { indicatorPlacement: 'start' },
          { indicatorPlacement: 'end' },
          { lacks: 'indicator-placement', orientation: 'vertical' },
        ],
        {
          transition: list(
            ['background-color', own.carouselIndicatorMotion],
            ['block-size', own.carouselIndicatorMotion],
          ),
        },
      ),
      rule(
        [
          { indicatorPlacement: 'start', part: { 'data-current': true } },
          { indicatorPlacement: 'end', part: { 'data-current': true } },
          {
            lacks: 'indicator-placement',
            orientation: 'vertical',
            part: { 'data-current': true },
          },
        ],
        { blockSize: token('space-lg'), inlineSize: token('space-xs') },
      ),
      web([rule({ hover: true }, { backgroundColor: token('color-foreground-muted') })]),
      rule({ focusVisible: true }, ring),
      rule({ indicatorPlacement: 'overlay' }, { backgroundColor: token('color-foreground-muted') }),
      rule(
        { indicatorPlacement: 'overlay', part: { 'data-current': true } },
        { backgroundColor: token('color-primary') },
      ),
      rule({ active: true }, { backgroundColor: token('color-press') }),
    ]),
    /* The press reaches `--helix-size-target`, in a transparent box, so nothing
       drawn moves. Where the control is already that size the box sits inside it.
       A phone gives a press the view's own frame. */
    on({ after: 'indicator' }, [
      web([
        rule({
          content: '""',
          insetBlock: quotient(difference(token('size-target'), '100%'), '-2'),
          insetInline: 0,
          position: 'absolute',
        }),
      ]),
    ]),
    on(
      ['next', 'previous'],
      [
        rule(
          { canHover: false, coarsePointer: true, controls: { not: 'always' } },
          { display: 'none' },
        ),
      ],
    ),
  ],
)
