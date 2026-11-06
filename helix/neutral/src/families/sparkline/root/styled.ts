import printExact from '../../../fragments/print-exact.js'
import terminus from '../../../fragments/terminus.js'
import { oneOf } from '../../../render.js'
import {
  difference,
  fn,
  measured,
  mix,
  native,
  product,
  quotient,
  scheme,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import sparkline from './headless.js'

/**
 * Sparkline's styled tier.
 *
 * **Sized in `em`**, so it scales with the text around it: figure-sized beside
 * a figure, and row-sized in a table row. One ink, `--sparkline-color`, draws
 * the line, the wash, the columns, and the marks, and `emphasis` quietens or
 * firms them together.
 *
 * **The stroke keeps its weight however the strip is stretched**, as
 * `vector-effect: non-scaling-stroke` keeps it on both platforms, and the
 * weight is in `em`, so it grows with the drawing's text.
 *
 * **The marks stand over the strip**, each a dot centered on its reading at
 * percentages of the box, the cursor ringed in the page's ground and the
 * readout above it, set as a tooltip is set.
 *
 * **Web only:** the hole a `ring` terminus cuts out of the line, which a
 * phone draws over the line, and the colors forced colors keep.
 */
export default styles(
  sparkline,
  {
    prefix: 'sparkline',
    hooks: {
      areaOpacity: '0.45',
      barRadius: '0.5',
      barStroke: '1',
      blockSize: '2.5em',
      color: null,
      inlineSize: '7em',
      markColor: 'currentColor',
      markRingColor: token('color-background'),
      markSize: '5px',
      rangeColor: 'currentColor',
      rangeOpacity: '0.12',
      readoutBackgroundColor: token('color-surface-inverse'),
      readoutColor: token('color-foreground-inverse'),
      readoutFontSize: token('text-xs'),
      width: null,
    },
    own: { chartTerminusInner: null, sparklineInk: null, sparklineWeight: null },
    props: {
      emphasis: oneOf(['outlined', 'solid', 'subtle']),
      terminus: oneOf(['none', 'ring', 'square', 'triangle']),
      weight: oneOf(['thick', 'thin']),
    },
    stylesheet: 'sparkline/root/sparkline-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => [
    include(terminus),
    on('host', [
      rule({
        blockSize: hook.blockSize,
        color: own.sparklineInk,
        display: 'inline-block',
        inlineSize: hook.inlineSize,
        own: {
          sparklineInk: hook.color(scheme(token('color-series-1'), token('color-series-9'))),
        },
        position: 'relative',
        verticalAlign: 'middle',
      }),
    ]),
    on('svg', [
      rule({ blockSize: '100%', inlineSize: '100%', overflow: 'visible' }),
      /* Past the largest standard text size a phone's height in `em` is a
         least, and a share of a least is no height at all, so the strip fills
         the box it is laid out in. */
      native([rule({ inset: 0, position: 'absolute' })]),
    ]),
    on('line', [
      rule({
        fill: 'none',
        stroke: 'currentColor',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: hook.width(own.sparklineWeight('0.11em')),
        vectorEffect: 'non-scaling-stroke',
      }),
    ]),
    on('area', [rule({ fill: 'none' })]),
    on(['wash-start', 'wash-end'], [rule({ stopColor: 'currentColor', stopOpacity: 0 })]),
    on('area', [rule({ plot: { not: ['bar', 'line'] } }, { fill: 'url("#sparkline-wash")' })]),
    on('wash-start', [
      rule(
        { plot: { not: ['bar', 'line'] } },
        { stopOpacity: product(hook.areaOpacity, token('material-opacity')) },
      ),
    ]),
    on('wash-end', [
      rule(
        { plot: { not: ['bar', 'line'] } },
        { stopOpacity: product(quotient(hook.areaOpacity, 9), token('material-opacity')) },
      ),
    ]),
    on('host', [
      rule({ weight: 'thin' }, { own: { sparklineWeight: '0.07em' } }),
      rule({ weight: 'thick' }, { own: { sparklineWeight: '0.18em' } }),
    ]),
    on('range', [rule({ fill: hook.rangeColor, fillOpacity: hook.rangeOpacity })]),
    on('bar', [rule({ fill: 'currentColor', rx: hook.barRadius })]),
    on('svg', [
      web([
        rule(
          { terminus: 'ring' },
          {
            maskImage: fn(
              'radial-gradient',
              ['circle', 'at', measured('chart-terminus-x'), measured('chart-terminus-y')],
              ['#0000', difference(own.chartTerminusInner, '0.5px')],
              ['#000', own.chartTerminusInner],
            ),
          },
        ),
      ]),
    ]),
    include(printExact),
    on(
      ['cursor', 'high', 'lone', 'low'],
      [rule({ forcedColors: true }, { forcedColorAdjust: 'none' })],
    ),
    on('host', [
      /* **In dark, 70% of the ink, so the line still clears 3:1 on the page.** At 40%
         the eight dark series measured 1.41 to 1.64 on black; at 70% they measure 3.19
         to 4.43. Light keeps 40%. */
      rule(
        { emphasis: 'subtle' },
        {
          color: scheme(
            mix(own.sparklineInk, 40, token('color-background')),
            mix(own.sparklineInk, 70, token('color-background')),
          ),
        },
      ),
    ]),
    on('bar', [
      rule(
        { emphasis: 'outlined' },
        {
          fill: mix(own.sparklineInk, 55, token('color-background')),
          stroke: own.sparklineInk,
          strokeWidth: hook.barStroke,
          vectorEffect: 'non-scaling-stroke',
        },
      ),
    ]),
    on('area', [
      rule({ emphasis: 'outlined' }, { opacity: hook.areaOpacity('0.35') }),
      rule({ emphasis: 'solid' }, { opacity: 1 }),
    ]),
    /* Written out: the vocabulary names no `:focus`. A pointer's focus draws no ring. */
    on({ part: 'svg', selector: '[part="svg"]:focus' }, [web([rule({ outline: 'none' })])]),
    on('svg', [
      rule(
        { focusVisible: true },
        {
          borderRadius: token('radii-sm'),
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
    ]),
    on(
      ['cursor', 'high', 'lone', 'low'],
      [
        rule({
          backgroundColor: hook.markColor,
          blockSize: hook.markSize,
          borderRadius: token('radii-full'),
          inlineSize: hook.markSize,
          pointerEvents: 'none',
          position: 'absolute',
          translate: ['-50%', '-50%'],
        }),
        native([
          rule({
            insetBlockStart: measured('sparkline-y'),
            insetInlineStart: measured('sparkline-x'),
          }),
        ]),
      ],
    ),
    on('cursor', [
      rule({
        boxShadow: [0, 0, 0, token('border-thick'), hook.markRingColor],
      }),
    ]),
    on('readout', [
      rule({
        backgroundColor: hook.readoutBackgroundColor,
        borderRadius: token('radii-sm'),
        color: hook.readoutColor,
        fontFamily: token('font-sans'),
        fontSize: hook.readoutFontSize,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: token('leading-snug'),
        padding: [0, token('space-2xs')],
        pointerEvents: 'none',
        position: 'absolute',
        translate: ['-50%', difference('-100%', hook.markSize)],
        whiteSpace: 'nowrap',
        zIndex: token('layer-raised'),
      }),
      /* A phone moves a box by a share of its own size or by points, never
         both at once, so the readout stands its own height up and the mark's
         size further. */
      native([
        rule({
          insetBlockStart: measured('sparkline-y'),
          insetInlineStart: measured('sparkline-x'),
          marginBlockStart: product(hook.markSize, '-1'),
          translate: ['-50%', '-100%'],
        }),
      ]),
    ]),
    on(['cursor', 'high', 'lone', 'low'], [rule({ dir: 'rtl' }, { translate: ['50%', '-50%'] })]),
    on('readout', [
      rule({ dir: 'rtl' }, { translate: ['50%', difference('-100%', hook.markSize)] }),
    ]),
    /* The words in place of the line, in the middle of the box, cut short on one line,
       since a sparkline is the height of a line of text. */
    on(
      ['empty', 'error', 'loading'],
      [
        rule({
          color: token('color-foreground-muted'),
          fontFamily: token('font-sans'),
          fontSize: token('text-xs'),
          inset: 0,
          margin: token('space-none'),
          overflow: 'hidden',
          position: 'absolute',
          textAlign: 'center',
        }),
        web([
          rule({
            alignContent: 'center',
            display: 'block',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }),
        ]),
        native([rule({ alignItems: 'center', justifyContent: 'center' })]),
      ],
    ),
    on('error', [native([rule({ color: token('color-danger'), flexDirection: 'row' })])]),
    /* Said and not shown: the dot and the readout are the picture of it. */
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
  ],
)
