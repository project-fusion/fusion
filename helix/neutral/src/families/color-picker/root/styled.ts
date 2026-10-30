import {
  difference,
  fn,
  inherited,
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
import picker from './headless.js'

/**
 * Color Picker's styled tier, which writes
 * `helix/styled/src/color-picker/root/color-picker-root.generated.css`.
 *
 * **The web paints the square in three layers of gradient**, the hue under
 * white along the line under black from the foot, and draws its mark and its
 * ring as generated boxes. A phone draws the same square from the tint and two
 * gradients, its mark as a part the machine places, and its ring as wedges.
 *
 * **Every chip sits on a checkerboard**, so a color with alpha looks
 * transparent: a conic gradient tile on the web, and a dashed path on a phone,
 * in the same two colors at the same size.
 */
export default styles(
  picker,
  {
    prefix: 'color-picker',
    hooks: {
      feedbackColor: token('color-danger'),
      fieldLabelColor: token('color-foreground-muted'),
      fieldsGap: token('space-xs'),
      gridRadius: token('radii-sm'),
      gridRatio: '1 / 0.7',
      padding: token('space-none'),
      sampleSize: '36px',
      swatchSize: token('size-icon-loose'),
      wheelSize: '100%',
      wheelThickness: token('space-lg'),
    },
    own: {
      colorPickerAlong: null,
      colorPickerMarkHalf: null,
      colorPickerRing: null,
    },
    stylesheet: 'color-picker/root/color-picker-root.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const hue0 = fn('hsl', [0, '100%', '50%'])
    const hue60 = fn('hsl', [60, '100%', '50%'])
    const hue120 = fn('hsl', [120, '100%', '50%'])
    const hue180 = fn('hsl', [180, '100%', '50%'])
    const hue240 = fn('hsl', [240, '100%', '50%'])
    const hue300 = fn('hsl', [300, '100%', '50%'])
    const hue360 = fn('hsl', [360, '100%', '50%'])
    const mark = token('size-icon-tight')
    const tile = fn(
      'conic-gradient',
      [token('color-surface-sunken'), 0, '25%'],
      [token('color-surface'), 0, '50%'],
      [token('color-surface-sunken'), 0, '75%'],
      [token('color-surface'), 0],
    )
    const hueOf = fn('hsl', [measured('color-picker-hue'), '100%', '50%'])
    const swatch = measured('color-picker-swatch', 'transparent')
    const ring = [token('size-focus-ring'), 'solid', token('color-focus-ring')]
    const fieldLook = {
      backgroundColor: token('color-surface-sunken'),
      blockSize: token('size-control'),
      border: [token('border-thin'), 'solid', token('color-border')],
      borderRadius: token('radii-sm'),
      boxSizing: 'border-box',
      color: token('color-foreground'),
      fontFamily: token('font-sans'),
      fontSize: fn('max', token('text-field-min'), token('text-control')),
      fontWeight: token('weight-medium'),
      minInlineSize: 0,
      paddingInline: token('space-xs'),
      transition: ['border-color', token('duration-fast'), token('easing-standard')],
    }
    /* The tile of squares a phone lays under a chip: 128 by 8 tiles of the web's size. */
    const tileBox = {
      backgroundColor: token('color-surface'),
      blockSize: product(token('space-sm'), 8),
      inlineSize: product(token('space-sm'), 128),
      insetBlockStart: 0,
      insetInlineStart: 0,
      position: 'absolute',
    }
    const squares = {
      fill: 'none',
      stroke: token('color-surface-sunken'),
      strokeDasharray: '0.5 0.5',
      strokeWidth: 0.5,
    }
    const fillBox = { backgroundColor: swatch, inset: 0, position: 'absolute' }
    return [
      on('host', [
        rule({
          display: 'block',
          paddingBlockEnd: hook.padding,
        }),
        web([rule({ own: { colorPickerAlong: 'to right' } })]),
        web([rule({ dir: 'rtl' }, { own: { colorPickerAlong: 'to left' } })]),
      ]),
      /* A chip of the current color, and every preset: one square, two sizes. */
      on(
        ['sample', 'swatch'],
        [
          rule({
            border: [token('border-thin'), 'solid', token('color-border')],
            borderRadius: token('radii-sm'),
            boxSizing: 'border-box',
          }),
          web([
            rule({
              backgroundImage: list(fn('linear-gradient', swatch, swatch), tile),
              backgroundSize: list(['100%', '100%'], [token('space-sm'), token('space-sm')]),
            }),
          ]),
          native([rule({ overflow: 'hidden' })]),
        ],
      ),
      on(['sample-tile', 'swatch-tile', 'ramp-tile'], [native([rule(tileBox)])]),
      on(
        ['sample-checker', 'swatch-checker', 'ramp-checker'],
        [native([rule({ inset: 0, position: 'absolute' })])],
      ),
      on(['sample-squares', 'swatch-squares', 'ramp-squares'], [native([rule(squares)])]),
      on(['sample-fill', 'swatch-fill'], [native([rule(fillBox)])]),
      on('grid', [
        rule({
          aspectRatio: hook.gridRatio,
          borderRadius: hook.gridRadius,
          position: 'relative',
          web: { cursor: 'crosshair', touchAction: 'none' },
        }),
        web([
          rule({
            backgroundImage: list(
              fn('linear-gradient', 'to top', fn('hsl', [0, '0%', '0%']), 'transparent'),
              fn(
                'linear-gradient',
                own.colorPickerAlong,
                fn('hsl', [0, '0%', '100%']),
                'transparent',
              ),
              fn('linear-gradient', hueOf, hueOf),
            ),
          }),
          rule({ readonly: true }, { cursor: 'default' }),
        ]),
        native([
          rule({
            backgroundColor: measured('color-picker-tint', 'transparent'),
          }),
          rule(
            { focusVisible: true },
            { outline: ring, outlineOffset: token('size-focus-offset') },
          ),
        ]),
      ]),
      /* A phone's gradients are one to a box, so white and black each stand over the tint. */
      on(
        ['grid-white', 'grid-black'],
        [
          native([
            rule({
              borderRadius: hook.gridRadius,
              inset: 0,
              pointerEvents: 'none',
              position: 'absolute',
            }),
          ]),
        ],
      ),
      on('grid-white', [
        native([
          rule({ backgroundImage: fn('linear-gradient', 'to right', '#ffffff', 'transparent') }),
          rule(
            { dir: 'rtl' },
            { backgroundImage: fn('linear-gradient', 'to left', '#ffffff', 'transparent') },
          ),
        ]),
      ]),
      on('grid-black', [
        native([
          rule({ backgroundImage: fn('linear-gradient', 'to top', '#000000', 'transparent') }),
        ]),
      ]),
      /* Where the color is, held half a mark in from every edge, a white ring
         with a dark edge in the media tokens, since the mark sits on the color
         being picked and no theme decides that color. */
      on({ after: 'grid' }, [
        web([
          rule({
            own: { colorPickerMarkHalf: quotient(mark, 2) },
            blockSize: mark,
            border: [token('border-thick'), 'solid', token('color-foreground-media')],
            borderRadius: token('radii-full'),
            boxShadow: list(
              [0, 0, 0, token('border-thin'), mix(token('color-surface-media'), 60, 'transparent')],
              token('shadow-sm'),
            ),
            content: '""',
            inlineSize: mark,
            insetBlockStart: fn(
              'clamp',
              own.colorPickerMarkHalf,
              difference('100%', measured('color-picker-brightness', '100%')),
              difference('100%', own.colorPickerMarkHalf),
            ),
            insetInlineStart: fn(
              'clamp',
              own.colorPickerMarkHalf,
              measured('color-picker-saturation', '100%'),
              difference('100%', own.colorPickerMarkHalf),
            ),
            pointerEvents: 'none',
            position: 'absolute',
            translate: ['-50%', '-50%'],
          }),
          rule({ dir: 'rtl' }, { translate: ['50%', '-50%'] }),
        ]),
      ]),
      on(
        ['grid-mark', 'wheel-mark'],
        [
          native([
            rule({
              backgroundColor: 'transparent',
              blockSize: mark,
              border: [token('border-thick'), 'solid', token('color-foreground-media')],
              borderRadius: token('radii-full'),
              boxShadow: [
                0,
                0,
                0,
                token('border-thin'),
                mix(token('color-surface-media'), 60, 'transparent'),
              ],
              inlineSize: mark,
              pointerEvents: 'none',
              position: 'absolute',
            }),
          ]),
        ],
      ),
      on('grid-mark', [
        native([
          rule({
            insetBlockStart: measured('color-picker-mark-y', '0%'),
            insetInlineStart: measured('color-picker-mark-x', '100%'),
            translate: ['-50%', '-50%'],
          }),
          rule({ dir: 'rtl' }, { translate: ['50%', '-50%'] }),
        ]),
      ]),
      on(
        ['grid-saturation', 'grid-brightness'],
        [
          rule({
            inset: 0,
            margin: token('space-none'),
            opacity: 0,
            pointerEvents: 'none',
            position: 'absolute',
            web: { appearance: 'none', background: 'none', inlineSize: '100%' },
          }),
        ],
      ),
      on('wheel', [
        rule({
          own: { colorPickerRing: hook.wheelThickness },
          aspectRatio: 1,
          borderRadius: token('radii-full'),
          marginInline: 'auto',
          maxInlineSize: hook.wheelSize,
          position: 'relative',
          web: { cursor: 'crosshair', display: 'grid', placeItems: 'center', touchAction: 'none' },
        }),
        native([
          rule({ alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center' }),
          rule(
            { focusVisible: true },
            { outline: ring, outlineOffset: token('size-focus-offset') },
          ),
        ]),
      ]),
      /* Written out: the ring goes on the square or the wheel while the range inside it has focus. */
      on({ part: 'grid', selector: '[part="grid"]:has(:focus-visible)' }, [
        web([rule({ outline: ring, outlineOffset: token('size-focus-offset') })]),
      ]),
      on({ part: 'wheel', selector: '[part="wheel"]:has([part="wheel-hue"]:focus-visible)' }, [
        web([rule({ outline: ring, outlineOffset: token('size-focus-offset') })]),
      ]),
      on({ before: 'wheel' }, [
        web([
          rule({
            backgroundImage: fn(
              'conic-gradient',
              hue0,
              hue60,
              hue120,
              hue180,
              hue240,
              hue300,
              hue360,
            ),
            borderRadius: 'inherit',
            content: '""',
            inset: 0,
            maskImage: fn(
              'radial-gradient',
              'farthest-side',
              ['transparent', difference('100%', own.colorPickerRing)],
              ['#000', sum(difference('100%', own.colorPickerRing), '0.5px')],
            ),
            position: 'absolute',
          }),
        ]),
      ]),
      /* The mark on the ring, a layer the size of the wheel turned by the hue. */
      on({ after: 'wheel' }, [
        web([
          rule({
            own: { colorPickerMarkHalf: quotient(mark, 2) },
            backgroundImage: fn(
              'radial-gradient',
              ['circle', 'at', '50%', quotient(own.colorPickerRing, 2)],
              ['transparent', difference(own.colorPickerMarkHalf, token('border-thick'))],
              [
                token('color-foreground-media'),
                difference(own.colorPickerMarkHalf, token('border-thick')),
                own.colorPickerMarkHalf,
              ],
              [
                mix(token('color-surface-media'), 60, 'transparent'),
                own.colorPickerMarkHalf,
                sum(own.colorPickerMarkHalf, token('border-thin')),
              ],
              ['transparent', sum(own.colorPickerMarkHalf, token('border-thin'))],
            ),
            content: '""',
            inset: 0,
            pointerEvents: 'none',
            position: 'absolute',
            rotate: product(measured('color-picker-hue', 0), '1deg'),
          }),
        ]),
      ]),
      /* A phone's ring fills the wheel, and the band measures how wide it is. */
      on('wheel-ring', [native([rule({ inset: 0, position: 'absolute' })])]),
      on('wheel-band', [
        native([
          rule({
            blockSize: token('space-sm'),
            inlineSize: hook.wheelThickness,
            opacity: 0,
            pointerEvents: 'none',
            position: 'absolute',
          }),
        ]),
      ]),
      on('wheel-mark', [
        native([
          rule({
            insetBlockStart: measured('color-picker-wheel-y', '0%'),
            insetInlineStart: measured('color-picker-wheel-x', '50%'),
            translate: ['-50%', '-50%'],
          }),
        ]),
      ]),
      /* The square inside the ring, with the gap a ramp keeps between its corners and the band. */
      on({ part: 'grid', selector: '[part="wheel"] [part="grid"]' }, [
        web([
          rule({
            aspectRatio: 1,
            inlineSize: product(
              difference(
                difference('100%', product(own.colorPickerRing, 2)),
                product(token('space-sm'), 2),
              ),
              0.7071,
            ),
          }),
        ]),
      ]),
      on('grid', [
        native([
          rule(
            { wheel: true },
            {
              aspectRatio: 1,
              inlineSize: measured('color-picker-wheel-grid', '60%'),
            },
          ),
        ]),
      ]),
      on('wheel-hue', [
        rule({
          inset: 0,
          margin: token('space-none'),
          opacity: 0,
          pointerEvents: 'none',
          position: 'absolute',
          web: { appearance: 'none', background: 'none' },
        }),
      ]),
      on('controls', [
        rule({
          alignItems: 'center',
          display: 'flex',
          gap: token('space-xs'),
          paddingBlockStart: token('space-sm'),
          paddingInline: hook.padding,
        }),
        native([rule({ flexDirection: 'row' })]),
      ]),
      /* The chip, and it copies. Measured against the two ramps beside it. */
      on('sample', [
        rule({
          blockSize: hook.sampleSize,
          flex: 'none',
          inlineSize: hook.sampleSize,
          padding: token('space-none'),
          position: 'relative',
          web: {
            appearance: 'none',
            backgroundColor: 'transparent',
            cursor: 'copy',
            font: 'inherit',
            transition: ['scale', token('duration-fast'), token('easing-emphasized')],
          },
        }),
        web([rule({ disabled: true }, { cursor: 'not-allowed' })]),
        rule({ focusVisible: true }, { outline: ring, outlineOffset: token('size-focus-offset') }),
        native([rule({ copied: true }, { scale: 0.94 })]),
        rule({ reducedMotion: true, platform: 'web' }, { transition: 'none' }),
      ]),
      /* Written out: a press, and a mark over the color for as long as it lasts. */
      on({ part: 'sample', selector: '[part="sample"][data-copied]' }, [
        web([rule({ scale: 0.94 })]),
      ]),
      on({ part: 'sample', selector: '[part="sample"][data-copied]::after' }, [
        web([
          rule({
            backgroundColor: token('color-surface-overlay'),
            blockSize: '100%',
            content: '""',
            inset: 0,
            maskImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 13l4 4L19 7'/%3E%3C/svg%3E\")",
            maskPosition: 'center',
            maskRepeat: 'no-repeat',
            maskSize: '60%',
            position: 'absolute',
          }),
        ]),
      ]),
      on({ part: 'sample', selector: '[part="sample"][data-copied]' }, [
        web([rule({ reducedMotion: true }, { scale: 1 })]),
      ]),
      on('sample-tick', [
        native([
          rule({
            color: token('color-surface-overlay'),
            inset: '20%',
            position: 'absolute',
          }),
        ]),
      ]),
      on('channels', [
        rule({
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          gap: token('space-sm'),
          minInlineSize: 0,
        }),
      ]),
      /* The ramps are labeled for a screen reader and not for the eye. */
      on('channel-label', [
        rule({
          blockSize: '1px',
          clipPath: 'inset(50%)',
          inlineSize: '1px',
          overflow: 'hidden',
          padding: token('space-none'),
          position: 'absolute',
          whiteSpace: 'nowrap',
        }),
      ]),
      /* Written out: each track is painted with the colors it chooses, through the one hook Slider publishes for it. */
      on({ part: 'channel', selector: '[part="channel"][data-channel="hue"]' }, [
        web([
          rule({
            '--slider-track-image': fn(
              'linear-gradient',
              own.colorPickerAlong,
              hue0,
              hue60,
              hue120,
              hue180,
              hue240,
              hue300,
              hue360,
            ),
          }),
        ]),
      ]),
      /* Written out: the checkerboard again, under a ramp from clear to the color itself. */
      on({ part: 'channel', selector: '[part="channel"][data-channel="alpha"]' }, [
        web([
          rule({
            '--slider-track-image': list(
              fn('linear-gradient', own.colorPickerAlong, 'transparent', hueOf),
              tile,
            ),
            backgroundSize: list(['100%', '100%'], [token('space-sm'), token('space-sm')]),
          }),
        ]),
      ]),
      /* No fill and no unfilled remainder: on these two the track is the value. */
      on('channel', [
        rule({
          '--slider-fill-color': 'transparent',
          '--slider-track-color': 'transparent',
        }),
      ]),
      /* A phone lays each ramp under the slider, across the middle of its thumb. */
      /* A phone reads no `hidden` of its own. */
      on(
        ['ramp-tile', 'ramp-alpha', 'ramp-hue', 'swatches'],
        [native([rule({ part: { hidden: true } }, { display: 'none' })])],
      ),
      on('channel-row', [native([rule({ position: 'relative' })])]),
      on('ramp', [
        native([
          rule({ inset: 0, justifyContent: 'center', pointerEvents: 'none', position: 'absolute' }),
        ]),
      ]),
      on('ramp-bar', [
        native([
          rule({
            blockSize: token('size-progress'),
            borderRadius: token('radii-full'),
            overflow: 'hidden',
          }),
        ]),
      ]),
      on(['ramp-alpha', 'ramp-hue'], [native([rule({ inset: 0, position: 'absolute' })])]),
      on('ramp-hue', [
        native([
          rule({
            backgroundImage: fn(
              'linear-gradient',
              'to right',
              hue0,
              hue60,
              hue120,
              hue180,
              hue240,
              hue300,
              hue360,
            ),
          }),
          rule(
            { dir: 'rtl' },
            {
              backgroundImage: fn(
                'linear-gradient',
                'to left',
                hue0,
                hue60,
                hue120,
                hue180,
                hue240,
                hue300,
                hue360,
              ),
            },
          ),
        ]),
      ]),
      on('ramp-alpha', [
        native([
          rule({
            backgroundImage: fn(
              'linear-gradient',
              'to right',
              'transparent',
              measured('color-picker-tint', 'transparent'),
            ),
          }),
          rule(
            { dir: 'rtl' },
            {
              backgroundImage: fn(
                'linear-gradient',
                'to left',
                'transparent',
                measured('color-picker-tint', 'transparent'),
              ),
            },
          ),
        ]),
      ]),
      /* Written out: drawn only when it holds something. */
      on({ part: 'footer', selector: '[part="footer"]:empty' }, [web([rule({ display: 'none' })])]),
      on('footer', [
        rule({
          display: 'flex',
          gap: token('space-xs'),
          marginBlockStart: token('space-sm'),
          paddingInline: hook.padding,
        }),
        native([rule({ flexDirection: 'row' })]),
      ]),
      on('value', [
        rule({
          web: { all: 'unset' },
          ...fieldLook,
          flex: '1 1 auto',
        }),
        rule({ hover: true }, { borderColor: token('color-foreground-muted') }),
        rule(
          { focusVisible: true },
          { borderColor: token('color-primary'), outline: ring, outlineOffset: 0 },
        ),
        /* Wrong, and the field says so, under the pointer and the caret too. */
        rule(
          { invalid: true },
          { borderColor: token('color-danger'), outlineColor: token('color-danger') },
        ),
      ]),
      on('fields', [
        rule({
          gap: hook.fieldsGap,
          marginBlockStart: token('space-sm'),
          paddingInline: hook.padding,
          web: {
            display: 'grid',
            gridAutoColumns: fn('minmax', 0, '1fr'),
            gridAutoFlow: 'column',
          },
        }),
        web([
          rule(
            { alpha: true },
            { gridAutoFlow: 'row', gridTemplateColumns: fn('repeat', 2, fn('minmax', 0, '1fr')) },
          ),
        ]),
        native([rule({ flexDirection: 'row' }), rule({ alpha: true }, { flexWrap: 'wrap' })]),
      ]),
      on('field', [
        rule({
          display: 'flex',
          flexDirection: 'column',
          gap: token('space-2xs'),
          minInlineSize: 0,
        }),
        native([rule({ flexBasis: 0, flexGrow: 1 }), rule({ alpha: true }, { flexBasis: '45%' })]),
      ]),
      on('field-label', [
        rule({
          color: hook.fieldLabelColor,
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          fontWeight: token('weight-medium'),
        }),
      ]),
      on('field-input', [
        rule({
          web: { all: 'unset', appearance: 'textfield' },
          ...fieldLook,
          fontVariantNumeric: 'tabular-nums',
          inlineSize: '100%',
        }),
        rule({ hover: true }, { borderColor: token('color-foreground-muted') }),
        rule(
          { focusVisible: true },
          { borderColor: token('color-primary'), outline: ring, outlineOffset: 0 },
        ),
      ]),
      /* Written out: the browser's spinners, which no vocabulary names. */
      on(
        {
          part: 'field-input',
          selector:
            '[part="field-input"]::-webkit-inner-spin-button, [part="field-input"]::-webkit-outer-spin-button',
        },
        [web([rule({ appearance: 'none', margin: 0 })])],
      ),
      /* The tools keep their own width beside the text, and take the row when there is no text. */
      on('actions', [rule({ display: 'flex', flex: '1 1 auto' })]),
      /* Written out: each button splits what the row has left. */
      on({ part: 'actions', selector: '[part="actions"] helix-button' }, [
        web([rule({ flex: '1 1 0' })]),
      ]),
      on('format', [
        native([rule({ flexGrow: 1 })]),
        web([rule({ fontFamily: token('font-mono'), fontVariantCaps: 'all-small-caps' })]),
      ]),
      /* The web sets the word in small capitals, which a phone's fonts do not all
         have: capitals of the same face at their height. */
      on('format-face', [
        native([
          rule({
            alignSelf: 'center',
            fontFamily: token('font-mono'),
            fontSize: '0.625rem',
            fontWeight: token('weight-medium'),
            textAlign: 'center',
          }),
        ]),
      ]),
      /* A slotted dropper is sized here, because nothing else sizes it. */
      on({ region: 'eyedropper-icon', slotted: '*' }, [
        web([
          rule({
            blockSize: inherited('icon-size', token('size-icon')),
            flex: '0 0 auto',
            inlineSize: inherited('icon-size', token('size-icon')),
          }),
        ]),
      ]),
      /* Under a rule, since these hand a color over finished. */
      on('swatches', [
        rule({
          borderBlockStart: [token('border-thin'), 'solid', token('color-border')],
          display: 'flex',
          flexWrap: 'wrap',
          gap: token('space-2xs'),
          marginBlockStart: token('space-sm'),
          paddingBlockStart: token('space-sm'),
          paddingInline: hook.padding,
        }),
        native([rule({ flexDirection: 'row' })]),
      ]),
      on('swatch', [
        rule({
          blockSize: hook.swatchSize,
          inlineSize: hook.swatchSize,
          padding: token('space-none'),
          web: { cursor: 'pointer' },
        }),
        web([rule({ readonly: true }, { cursor: 'default' })]),
      ]),
      on('label', [
        rule({
          color: token('color-foreground'),
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          fontWeight: token('weight-medium'),
          lineHeight: token('leading-tight'),
          marginBlockEnd: token('space-xs'),
          paddingInline: hook.padding,
        }),
      ]),
      on({ after: 'label' }, [
        rule(
          { required: true },
          { color: token('color-danger'), content: '"*"', marginInlineStart: token('space-2xs') },
        ),
        rule(
          { required: true, platform: 'web', supports: '(content: "*" / "")' },
          { content: '"*" / ""' },
        ),
      ]),
      on('hint', [
        rule({
          color: token('color-foreground-muted'),
          fontFamily: token('font-sans'),
          fontSize: token('text-xs'),
          lineHeight: token('leading-normal'),
          marginBlockStart: token('space-sm'),
          paddingInline: hook.padding,
        }),
      ]),
      on('feedback', [
        rule({
          color: hook.feedbackColor,
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          margin: [token('space-sm'), token('space-none'), token('space-none')],
          paddingInline: hook.padding,
        }),
      ]),
      on('host', [
        rule({ formDisabled: true }, { opacity: 0.5, web: { cursor: 'not-allowed' } }),
        rule({ print: true }, { boxShadow: 'none', printColorAdjust: web('exact') }),
      ]),
    ]
  },
)
