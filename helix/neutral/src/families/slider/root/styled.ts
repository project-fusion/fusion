import field from '../../../fragments/field.js'
import fieldStacked from '../../../fragments/field-stacked.js'
import {
  difference,
  fn,
  list,
  measured,
  mix,
  native,
  product,
  quotient,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import slider from './headless.js'

/**
 * Slider's styled tier, which writes
 * `helix/styled/src/slider/root/slider-root.generated.css`.
 *
 * **A track and a thumb on it, and the value beside them.** The track is the
 * progress bar's thickness, its unfilled half the border color and its
 * filled half the accent, and the thumb is the one surface that inverts with
 * the mode, ringed in the ground's color so it reads against either half.
 * A halo of the fill's color shows while it is held or has focus the
 * keyboard brought, and a wrong slider rings the thumb in the danger color.
 *
 * **The web paints the browser's own range**, its track a gradient stopped
 * at `--slider-fraction` and its thumb through the range's pseudo-elements,
 * which no vocabulary names, so those rules are written out. A phone draws
 * the same picture from parts: the `track` and its `fill` inside the
 * control, and the `thumb` over the track, in the `rail` that lays them
 * out.
 *
 * **The marks stand over the track**, each a notch in the ground's color,
 * with the value under it where `marker-labels` asks, and the web punches
 * the thumb out of them. **A vertical track** stands `--slider-length`
 * tall, its maximum at the top.
 */
export default styles(
  slider,
  {
    prefix: 'slider',
    hooks: {
      fillColor: token('color-primary'),
      length: '9rem',
      markerColor: token('color-background'),
      thumbColor: token('color-surface-inverse'),
      thumbContentColor: token('color-foreground-inverse'),
      thumbLength: null,
      thumbRadius: token('radii-full'),
      thumbRingColor: token('color-background'),
      thumbSize: token('size-checkbox'),
      tooltipBackgroundColor: token('color-surface-inverse'),
      tooltipColor: token('color-foreground-inverse'),
      trackColor: token('color-border'),
      trackImage: null,
      trackSize: token('size-progress'),
    },
    own: {
      sliderAlong: null,
      sliderHalo: null,
      sliderHole: null,
      sliderHoleAt: null,
      sliderHoleFrom: null,
      sliderHoleTo: null,
      sliderThumb: null,
      sliderThumbLength: null,
      sliderThumbRadii: null,
      sliderTrack: null,
      sliderTrackColor: null,
      sliderTrackImage: null,
      sliderUnder: null,
    },
    stylesheet: 'slider/root/slider-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    /* Half the thumb along the track, where its center stops short of each end. */
    const half = quotient(own.sliderThumbLength, 2)
    /* Each share of the track the element writes, 0 to 1, as a percentage of it. */
    const atFraction = product(measured('slider-fraction', 0), '100%')
    const atFrom = product(measured('slider-from', 0), '100%')
    const atTo = product(measured('slider-to', 0), '100%')
    const atToWhole = product(measured('slider-to', 1), '100%')
    const atThumb = product(measured('slider-at', 0), '100%')
    const fillFrom = product(measured('slider-fill-from', 0), '100%')
    const fillSpan = product(measured('slider-fill-span', 0), '100%')
    /* The fill from the start of the track to the value, left to right and up. */
    const filled = hook.trackImage(
      fn(
        'linear-gradient',
        own.sliderAlong,
        [hook.fillColor, atFraction],
        [own.sliderTrackColor, atFraction],
      ),
    )
    const filledUp = hook.trackImage(
      fn(
        'linear-gradient',
        'to top',
        [hook.fillColor, atFraction],
        [own.sliderTrackColor, atFraction],
      ),
    )
    /* The fill between two shares of the track, left to right and up. */
    const spanned = hook.trackImage(
      fn(
        'linear-gradient',
        own.sliderAlong,
        [own.sliderTrackColor, atFrom],
        [hook.fillColor, atFrom],
        [hook.fillColor, atTo],
        [own.sliderTrackColor, atTo],
      ),
    )
    const spannedUp = hook.trackImage(
      fn(
        'linear-gradient',
        'to top',
        [own.sliderTrackColor, atFrom],
        [hook.fillColor, atFrom],
        [hook.fillColor, atTo],
        [own.sliderTrackColor, atTo],
      ),
    )
    /* A range's fill, which runs to its end where no upper thumb is written. */
    const between = hook.trackImage(
      fn(
        'linear-gradient',
        own.sliderAlong,
        [own.sliderTrackColor, atFrom],
        [hook.fillColor, atFrom],
        [hook.fillColor, atToWhole],
        [own.sliderTrackColor, atToWhole],
      ),
    )
    /* A ring of the ground's color, then the shadow under it. */
    const ringed = list([0, 0, 0, token('border-thick'), hook.thumbRingColor], token('shadow-md'))
    /* The ring, the shadow, and a halo of the fill's color. */
    const haloed = list([0, 0, 0, token('border-thick'), hook.thumbRingColor], token('shadow-md'), [
      0,
      0,
      0,
      token('space-2xs'),
      own.sliderHalo,
    ])
    /* Across the track, where a hole in the marks is centered. */
    const middle = quotient(own.sliderTrack, 2)
    /* Everything but a hole the thumb's size where each thumb stands. */
    const holeAt = fn(
      'radial-gradient',
      ['circle', 'at', own.sliderHoleAt, middle],
      ['transparent', own.sliderHole],
      ['currentColor', own.sliderHole],
    )
    const holeFrom = fn(
      'radial-gradient',
      ['circle', 'at', own.sliderHoleFrom, middle],
      ['transparent', own.sliderHole],
      ['currentColor', own.sliderHole],
    )
    const holeTo = fn(
      'radial-gradient',
      ['circle', 'at', own.sliderHoleTo, middle],
      ['transparent', own.sliderHole],
      ['currentColor', own.sliderHole],
    )
    const holeUp = fn(
      'radial-gradient',
      ['circle', 'at', '50%', difference('100%', atFraction)],
      ['transparent', own.sliderHole],
      ['currentColor', own.sliderHole],
    )
    /* Where the track stands inside the thumb's height, on a phone. */
    const inset = quotient(difference(own.sliderThumb, own.sliderTrack), 2)
    const thumbLook = {
      backgroundColor: hook.thumbColor,
      blockSize: own.sliderThumb,
      border: 'none',
      borderRadius: own.sliderThumbRadii,
      boxShadow: ringed,
      inlineSize: own.sliderThumbLength,
    }
    return [
      include(field),
      include(fieldStacked),
      on('host', [
        rule({
          display: 'flex',
          flexDirection: 'column',
          gap: token('space-2xs'),
          own: {
            sliderTrack: hook.trackSize,
            sliderThumb: hook.thumbSize,
            sliderThumbLength: hook.thumbLength(own.sliderThumb),
            sliderThumbRadii: hook.thumbRadius,
            sliderHalo: mix(hook.fillColor, 24, 'transparent'),
            sliderTrackColor: hook.trackColor,
          },
        }),
        /* Which way the fill runs from the minimum: a gradient takes no
           logical keyword, and the range turns round on a right-to-left
           page. */
        web([rule({ own: { sliderAlong: 'to right' } })]),
        web([rule({ dir: 'rtl' }, { own: { sliderAlong: 'to left' } })]),
        rule({ formDisabled: true }, { opacity: 0.5 }),
        rule({ print: true }, { boxShadow: 'none', printColorAdjust: web('exact') }),
      ]),
      /* A grid where something lies over the track, in the track's own cell,
         and a row otherwise. */
      on('field', [
        rule({ alignItems: 'center', display: 'flex', gap: token('space-sm') }),
        web([
          rule([{ 'data-markers': true }, { 'data-tooltip': true }, { range: true }], {
            display: 'grid',
            gridTemplateColumns: '1fr auto',
          }),
          rule({ 'data-thumbs': true }, { display: 'grid', gridTemplateColumns: '1fr auto' }),
          /* With no readout there is no second column, and no gap before one. */
          rule({ 'data-markers': true, showValue: false }, { gridTemplateColumns: '1fr' }),
        ]),
        /* Room under the track for the labels. */
        rule({ markerLabels: true }, { paddingBlockEnd: token('space-lg') }),
        rule({ orientation: 'vertical' }, { flexDirection: 'column' }),
        web([
          rule(
            [
              { 'data-markers': true, orientation: 'vertical' },
              { 'data-tooltip': true, orientation: 'vertical' },
              { 'data-thumbs': true, orientation: 'vertical' },
            ],
            { gridTemplateColumns: 'none', gridTemplateRows: '1fr auto' },
          ),
        ]),
      ]),
      /* Written out: a rule on a part reads no `data-` attribute of the part
         around it, and these place the parts that lie over the track in its
         cell, and the readout beside it or, standing up, under it. */
      on(
        {
          part: 'control',
          selector:
            '[part="field"][data-markers] [part="control"], [part="field"][data-markers] [part="markers"]',
        },
        [web([rule({ gridColumn: 1, gridRow: 1 })])],
      ),
      on({ part: 'output', selector: '[part="field"][data-markers] [part="output"]' }, [
        web([rule({ gridColumn: 2, gridRow: 1 })]),
      ]),
      /* The phone's row for the control and what lies over it. */
      on('rail', [
        native([
          rule({
            flexBasis: 'auto',
            flexDirection: 'row',
            flexGrow: 1,
            flexShrink: 1,
            minBlockSize: own.sliderThumb,
            position: 'relative',
          }),
          rule(
            { orientation: 'vertical' },
            { alignItems: 'center', flexDirection: 'column', flexGrow: 0 },
          ),
        ]),
      ]),
      on('control', [
        rule({
          zIndex: token('layer-raised'),
          web: { appearance: 'none', cursor: 'pointer' },
          background: 'transparent',
          flex: '1 1 auto',
          minInlineSize: 0,
        }),
        /* The track a phone draws inside, centered across the thumb's height. */
        native([
          rule({ blockSize: own.sliderThumb, justifyContent: 'center', marginInline: half }),
          rule(
            { orientation: 'vertical' },
            {
              alignItems: 'center',
              blockSize: hook.length,
              flex: '0 0 auto',
              inlineSize: own.sliderThumb,
              marginBlock: half,
              marginInline: 0,
            },
          ),
        ]),
        web([
          /* What the track is painted with, on the control, where the
             fraction it reads is written. */
          rule({ own: { sliderTrackImage: filled } }),
          rule({ 'data-origin': true }, { own: { sliderTrackImage: spanned } }),
          rule({ formDisabled: true }, { cursor: 'not-allowed' }),
          rule({ readonly: true }, { cursor: 'default' }),
          rule({ focusVisible: true }, { outline: 'none' }),
          rule(
            { orientation: 'vertical' },
            {
              own: { sliderTrackImage: filledUp },
              direction: 'rtl',
              inlineSize: hook.length,
              marginBlock: half,
              marginInline: 0,
              writingMode: 'vertical-lr',
            },
          ),
          rule(
            { 'data-origin': true, orientation: 'vertical' },
            { own: { sliderTrackImage: spannedUp } },
          ),
        ]),
      ]),
      /* The phone's groove, past each end of the control by half a thumb, as
         the range's own track reaches. */
      on('track', [
        native([
          rule({
            backgroundColor: own.sliderTrackColor,
            blockSize: own.sliderTrack,
            borderRadius: token('radii-full'),
            marginInline: product(half, '-1'),
            overflow: 'hidden',
          }),
          rule(
            { orientation: 'vertical' },
            {
              blockSize: 'auto',
              flexGrow: 1,
              inlineSize: own.sliderTrack,
              marginBlock: product(half, '-1'),
              marginInline: 0,
            },
          ),
        ]),
      ]),
      on('fill', [
        native([
          rule({
            backgroundColor: hook.fillColor,
            inlineSize: fillSpan,
            insetBlock: 0,
            insetInlineStart: fillFrom,
            position: 'absolute',
          }),
          rule(
            { orientation: 'vertical' },
            {
              blockSize: fillSpan,
              inlineSize: 'auto',
              insetBlockEnd: fillFrom,
              insetBlockStart: 'auto',
              insetInline: 0,
            },
          ),
        ]),
      ]),
      /* Tabular, so the row does not shift as the digits change. */
      on('output', [
        rule({
          color: token('color-foreground'),
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          fontVariantNumeric: 'tabular-nums',
          minInlineSize: measured('_slider-output-reserve', '3ch'),
          textAlign: 'end',
        }),
      ]),
      /* Over the track and above the control, so the thumb crosses none of
         them, and the drag stays the control's. */
      on('markers', [
        rule({
          alignSelf: 'center',
          blockSize: own.sliderTrack,
          marginInline: half,
          pointerEvents: 'none',
          position: 'relative',
          zIndex: token('layer-raised'),
        }),
        /* The same room inside the marks' own box, so the mask that punches
           the thumb out does not clip the labels hung under it. */
        rule(
          { markerLabels: true, orientation: { not: 'vertical' } },
          {
            blockSize: sum(own.sliderTrack, token('space-lg')),
            borderInline: [token('space-lg'), 'solid', 'transparent'],
            marginBlockEnd: product(token('space-lg'), '-1'),
            marginInline: difference(half, token('space-lg')),
            web: { maskOrigin: 'padding-box' },
          },
        ),
        /* A phone lays the marks over the track, where the web shares its cell. */
        native([
          rule({
            insetBlockStart: inset,
            insetInline: 0,
            position: 'absolute',
          }),
        ]),
        web([
          rule({
            own: {
              sliderHole: sum(half, token('border-thin')),
              sliderHoleAt: atFraction,
              sliderHoleFrom: atFrom,
              sliderHoleTo: atTo,
              sliderUnder: fn(
                'linear-gradient',
                ['transparent', own.sliderTrack],
                ['currentColor', 0],
              ),
            },
            maskImage: list(own.sliderUnder, holeAt),
          }),
          rule(
            { dir: 'rtl' },
            {
              own: {
                sliderHoleAt: difference('100%', atFraction),
                sliderHoleFrom: difference('100%', atFrom),
                sliderHoleTo: difference('100%', atTo),
              },
            },
          ),
          rule(
            { range: true },
            {
              maskComposite: list('add', 'intersect'),
              maskImage: list(own.sliderUnder, holeFrom, holeTo),
            },
          ),
          rule({ orientation: 'vertical' }, { maskImage: holeUp }),
        ]),
        rule(
          { orientation: 'vertical' },
          {
            alignSelf: 'stretch',
            blockSize: 'auto',
            inlineSize: own.sliderTrack,
            justifySelf: 'center',
            marginBlock: quotient(own.sliderThumb, 2),
            marginInline: 0,
          },
        ),
      ]),
      on('marker', [
        rule({
          backgroundColor: hook.markerColor,
          blockSize: own.sliderTrack,
          borderRadius: token('radii-full'),
          inlineSize: token('border-thick'),
          insetBlockStart: 0,
          insetInlineStart: measured('slider-marker-at', '0%'),
          position: 'absolute',
          translate: ['-50%', 0],
        }),
        rule({ dir: 'rtl' }, { translate: ['50%', 0] }),
        rule(
          { orientation: 'vertical' },
          {
            blockSize: token('border-thick'),
            inlineSize: own.sliderTrack,
            insetBlockEnd: measured('slider-marker-at', '0%'),
            insetBlockStart: 'auto',
            insetInlineStart: 0,
            translate: [0, '50%'],
          },
        ),
      ]),
      /* Hung off its mark, centered on it, so the first and last labels
         hang off the ends of the track as their marks sit on them. */
      on('marker-label', [
        rule({
          color: token('color-foreground-muted'),
          fontFamily: token('font-sans'),
          fontSize: token('text-xs'),
          fontVariantNumeric: 'tabular-nums',
          insetBlockStart: token('space-sm'),
          insetInlineStart: '50%',
          position: 'absolute',
          translate: ['-50%', 0],
        }),
        rule({ dir: 'rtl' }, { translate: ['50%', 0] }),
        /* A phone wraps words to the box they are in, which the mark's
           hairline would make one character wide, so the label takes a
           width of its own, centered on the mark. */
        native([rule({ inlineSize: '6rem', textAlign: 'center' })]),
      ]),
      /* Written out: the browser's range track, which the vocabulary has no
         name for, painted with the fill. */
      on({ part: 'control', selector: '[part="control"]::-webkit-slider-runnable-track' }, [
        web([
          rule({
            background: own.sliderTrackImage,
            blockSize: own.sliderTrack,
            borderRadius: token('radii-full'),
          }),
        ]),
      ]),
      /* Written out: Firefox's name for the same track. */
      on({ part: 'control', selector: '[part="control"]::-moz-range-track' }, [
        web([
          rule({
            background: own.sliderTrackImage,
            blockSize: own.sliderTrack,
            borderRadius: token('radii-full'),
          }),
        ]),
      ]),
      /* Written out: the browser's range thumb, centered on the track by
         hand, since WebKit lays it from the top of the track. */
      on({ part: 'control', selector: '[part="control"]::-webkit-slider-thumb' }, [
        web([
          rule({
            appearance: 'none',
            ...thumbLook,
            marginBlockStart: quotient(difference(own.sliderTrack, own.sliderThumb), 2),
          }),
        ]),
      ]),
      /* Written out: the halo while the thumb is held or has focus the
         keyboard brought. */
      on(
        {
          part: 'control',
          selector:
            '[part="control"]:focus-visible::-webkit-slider-thumb, [part="control"]:active::-webkit-slider-thumb',
        },
        [web([rule({ boxShadow: haloed })])],
      ),
      on(
        {
          part: 'control',
          selector:
            '[part="control"]:focus-visible::-moz-range-thumb, [part="control"]:active::-moz-range-thumb',
        },
        [web([rule({ boxShadow: haloed })])],
      ),
      /* Written out: Firefox's thumb, whose own border is stated away. */
      on({ part: 'control', selector: '[part="control"]::-moz-range-thumb' }, [
        web([rule(thumbLook)]),
      ]),
      /* Written out: the ring on the thumb where the keyboard brought focus. */
      on({ part: 'control', selector: '[part="control"]:focus-visible::-webkit-slider-thumb' }, [
        web([
          rule({
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          }),
        ]),
      ]),
      on({ part: 'control', selector: '[part="control"]:focus-visible::-moz-range-thumb' }, [
        web([
          rule({
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          }),
        ]),
      ]),
      /* Written out: a wrong slider rings its thumb in the danger color. */
      on(
        {
          part: 'control',
          selector: ':host(:state(invalid)) [part="control"]::-webkit-slider-thumb',
        },
        [web([rule({ boxShadow: [0, 0, 0, token('size-focus-ring'), token('color-danger')] })])],
      ),
      on(
        { part: 'control', selector: ':host(:state(invalid)) [part="control"]::-moz-range-thumb' },
        [web([rule({ boxShadow: [0, 0, 0, token('size-focus-ring'), token('color-danger')] })])],
      ),
      /* Written out: a range's thumbs, each a range of its own stacked in one
         cell, the lower painting the fill between them for both and the
         pointer reaching whichever thumb it is over. */
      on({ part: 'control', selector: ':host([range]) [part="control"]' }, [
        web([rule({ gridArea: '1 / 1' })]),
      ]),
      on({ part: 'output', selector: ':host([range]) [part="output"]' }, [
        web([rule({ gridColumn: 2, gridRow: 1 })]),
      ]),
      on({ part: 'control', selector: ':host([range]) [part="control"][data-thumb="start"]' }, [
        web([rule({ own: { sliderTrackImage: between } })]),
      ]),
      on(
        {
          part: 'control',
          selector:
            ':host([range]) [part="control"]:not([data-thumb="start"])::-webkit-slider-runnable-track',
        },
        [web([rule({ background: 'transparent' })])],
      ),
      on(
        {
          part: 'control',
          selector: ':host([range]) [part="control"]:not([data-thumb="start"])::-moz-range-track',
        },
        [web([rule({ background: 'transparent' })])],
      ),
      on({ part: 'control', selector: ':host([range]) [part="control"]' }, [
        web([rule({ pointerEvents: 'none' })]),
      ]),
      on({ part: 'control', selector: ':host([range]) [part="control"]::-webkit-slider-thumb' }, [
        web([rule({ pointerEvents: 'auto' })]),
      ]),
      on({ part: 'control', selector: ':host([range]) [part="control"]::-moz-range-thumb' }, [
        web([rule({ pointerEvents: 'auto' })]),
      ]),
      /* Written out: standing up, the readout goes under the track. */
      on(
        {
          part: 'output',
          selector: ':host([orientation="vertical"]) [part="field"][data-markers] [part="output"]',
        },
        [web([rule({ gridColumn: 1, gridRow: 2 })])],
      ),
      /* Written out: the bubbles' layer in the track's cell. */
      on(
        {
          part: 'control',
          selector: '[part="field"][data-tooltip] [part="control"], [part="tooltips"]',
        },
        [web([rule({ gridColumn: 1, gridRow: 1 })])],
      ),
      on({ part: 'output', selector: '[part="field"][data-tooltip] [part="output"]' }, [
        web([rule({ gridColumn: 2, gridRow: 1 })]),
      ]),
      /* Bubbles over the track, inset by half a thumb at each end, where a
         thumb's center stops. */
      on('tooltips', [
        rule({
          alignSelf: 'center',
          blockSize: own.sliderTrack,
          marginInline: half,
          pointerEvents: 'none',
          position: 'relative',
          zIndex: token('layer-overlay'),
        }),
        native([
          rule({
            insetBlockStart: inset,
            insetInline: 0,
            position: 'absolute',
          }),
        ]),
      ]),
      on('tooltip', [
        rule({
          backgroundColor: hook.tooltipBackgroundColor,
          borderRadius: token('radii-sm'),
          color: hook.tooltipColor,
          fontFamily: token('font-sans'),
          fontSize: token('text-xs'),
          fontVariantNumeric: 'tabular-nums',
          insetBlockEnd: sum('50%', quotient(own.sliderThumb, 2), token('space-2xs')),
          insetInlineStart: atThumb,
          opacity: 0,
          padding: [token('space-2xs'), token('space-xs')],
          position: 'absolute',
          transition: ['opacity', token('duration-fast'), token('easing-standard')],
          translate: ['-50%', 0],
          whiteSpace: 'nowrap',
        }),
        rule({ dir: 'rtl' }, { translate: ['50%', 0] }),
        rule([{ within: { host: { hover: true } } }, { within: { host: { focusWithin: true } } }], {
          opacity: 1,
        }),
        /* A finger hides what it drags, so a phone shows the bubble while it
           drags or the keyboard has brought focus, above the thumb, which
           its layer the track's height stands across the middle of. */
        native([
          rule({
            insetBlockEnd: sum(
              quotient(own.sliderTrack, 2),
              quotient(own.sliderThumb, 2),
              token('space-2xs'),
            ),
          }),
          rule([{ dragging: true }, { focusVisible: true }], { opacity: 1 }),
        ]),
      ]),
      /* Written out: standing up, the bubbles sit beside the track. */
      on(
        {
          part: 'output',
          selector: ':host([orientation="vertical"]) [part="field"][data-tooltip] [part="output"]',
        },
        [web([rule({ gridColumn: 1, gridRow: 2, justifySelf: 'center' })])],
      ),
      on('tooltips', [
        rule(
          { orientation: 'vertical' },
          {
            alignSelf: 'stretch',
            blockSize: 'auto',
            inlineSize: own.sliderTrack,
            justifySelf: 'center',
            marginBlock: quotient(own.sliderThumb, 2),
            marginInline: 0,
          },
        ),
      ]),
      on('tooltip', [
        rule(
          { orientation: 'vertical' },
          {
            insetBlockEnd: atThumb,
            insetInlineStart: sum('50%', quotient(own.sliderThumb, 2), token('space-2xs')),
            translate: [0, '50%'],
          },
        ),
      ]),
      /* Written out: the thumbs' layer, in the track's cell while a thumb
         slot holds something, which the element marks on the field. */
      on(
        {
          part: 'control',
          selector:
            '[part="field"][data-thumbs] [part="control"], [part="field"][data-thumbs] [part="thumbs"]',
        },
        [web([rule({ gridColumn: 1, gridRow: 1 })])],
      ),
      on({ part: 'output', selector: '[part="field"][data-thumbs] [part="output"]' }, [
        web([rule({ gridColumn: 2, gridRow: 1 })]),
      ]),
      on({ part: 'thumbs', selector: '[part="field"][data-thumbs] [part="thumbs"]' }, [
        web([
          rule({
            alignSelf: 'center',
            blockSize: own.sliderTrack,
            display: 'block',
            marginInline: half,
            pointerEvents: 'none',
            position: 'relative',
            zIndex: token('layer-overlay'),
          }),
        ]),
      ]),
      /* A phone always draws the thumb, over the track, inset by half a
         thumb at each end. */
      on('thumbs', [
        native([
          rule({
            blockSize: own.sliderTrack,
            insetBlockStart: inset,
            insetInline: half,
            pointerEvents: 'none',
            position: 'absolute',
            zIndex: token('layer-overlay'),
          }),
        ]),
      ]),
      on(
        ['thumb-start', 'thumb-last', 'thumb-halo'],
        [native([rule({ part: { hidden: true } }, { display: 'none' })])],
      ),
      on('thumb-halo', [
        native([
          rule({
            borderRadius: own.sliderThumbRadii,
            boxShadow: haloed,
            inset: 0,
            position: 'absolute',
          }),
        ]),
      ]),
      /* The thumb's own look at its size, which the web paints over the
         range's thumb to hold content and a phone draws as the thumb. */
      on('thumb', [
        rule({
          alignItems: 'center',
          backgroundColor: hook.thumbColor,
          blockSize: own.sliderThumb,
          borderRadius: own.sliderThumbRadii,
          color: hook.thumbContentColor,
          display: 'flex',
          fontSize: token('text-xs'),
          inlineSize: own.sliderThumbLength,
          insetBlockStart: '50%',
          insetInlineStart: atThumb,
          justifyContent: 'center',
          position: 'absolute',
          translate: ['-50%', '-50%'],
        }),
        native([
          rule({ boxShadow: ringed }),
          rule([{ dragging: true }, { focusVisible: true }], { boxShadow: haloed }),
          /* A range's thumbs stand apart: its halo draws on the one in hand. */
          rule({ range: true }, { boxShadow: ringed }),
          rule(
            { invalid: true },
            { boxShadow: [0, 0, 0, token('size-focus-ring'), token('color-danger')] },
          ),
        ]),
        rule({ dir: 'rtl' }, { translate: ['50%', '-50%'] }),
      ]),
      on(
        {
          part: 'output',
          selector: ':host([orientation="vertical"]) [part="field"][data-thumbs] [part="output"]',
        },
        [web([rule({ gridColumn: 1, gridRow: 2, justifySelf: 'center' })])],
      ),
      on(
        {
          part: 'thumbs',
          selector: ':host([orientation="vertical"]) [part="field"][data-thumbs] [part="thumbs"]',
        },
        [
          web([
            rule({
              alignSelf: 'stretch',
              blockSize: 'auto',
              inlineSize: own.sliderTrack,
              justifySelf: 'center',
              marginBlock: half,
              marginInline: 0,
            }),
          ]),
        ],
      ),
      on('thumbs', [
        native([
          rule(
            { orientation: 'vertical' },
            {
              blockSize: 'auto',
              inlineSize: own.sliderTrack,
              insetBlock: half,
              insetBlockStart: half,
              insetInlineStart: inset,
            },
          ),
        ]),
      ]),
      on('thumb', [
        rule(
          { orientation: 'vertical' },
          {
            blockSize: own.sliderThumbLength,
            inlineSize: own.sliderThumb,
            insetBlockEnd: atThumb,
            insetBlockStart: 'auto',
            insetInlineStart: '50%',
            translate: ['-50%', '50%'],
          },
        ),
        rule({ dir: 'rtl', orientation: 'vertical' }, { translate: ['50%', '50%'] }),
      ]),
    ]
  },
)
